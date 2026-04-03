import { Worker } from "bullmq";
import { connection } from "../config/queue";
import { supabaseAdmin } from "../config/supabaseAdmin";
import { runMeshroom } from "./meshroom_runner";
import path from "path";
import fs from "fs/promises";

async function testSupabaseConnection() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(
      "https://pdrxdnkaowokqmmcdeke.supabase.co/rest/v1/",
      {
        method: "HEAD",
        signal: controller.signal,
      },
    );
    console.log("Supabase reachable:", res.status);
  } catch (err) {
    console.error("Supabase unreachable:", err);
  } finally {
    clearTimeout(timeoutId);
  }
}
testSupabaseConnection();

const worker = new Worker(
  "reconstruction",
  async (job) => {
    const { jobId } = job.data as { jobId: string };

    // ===== CHANGE 1: Add retry logic for finding the job row =====
    let retries = 0;
    const maxRetries = 5;
    let jobRow = null;

    while (retries < maxRetries && !jobRow) {
      // 0. Load recon job row first
      const { data, error } = await supabaseAdmin
        .from("recon_jobs")
        .select("id, project_id, user_id")
        .eq("id", jobId)
        .single();

      if (error || !data) {
        retries++;
        if (retries < maxRetries) {
          console.log(
            `Job row not found for ${jobId}, retry ${retries}/${maxRetries} in ${retries * 1000}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retries * 1000));
          continue;
        } else {
          throw new Error(
            `recon_jobs row not found for jobId=${jobId} after ${maxRetries} retries`,
          );
        }
      }

      jobRow = data;
    }
    // ===== END OF CHANGE 1 =====

    const projectId = jobRow?.project_id;
    const userId = jobRow?.user_id;

    if (!projectId) {
      throw new Error(`project_id missing for recon job ${jobId}`);
    }

    if (!userId) {
      throw new Error(`user_id missing for recon job ${jobId}`);
    }

    console.log(
      `[Worker] Starting real GLB generation for project ${projectId}`,
    );

    // 1. Update recon_jobs + project to processing
    await supabaseAdmin
      .from("recon_jobs")
      .update({
        status: "processing",
        progress: 5,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await supabaseAdmin
      .from("projects")
      .update({
        status: "processing",
        job_status: "processing",
        job_started_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    // 2. Create temp dir for this project
    const tempBaseDir = process.env.TEMP_PROJECTS_DIR || "./temp-projects";
    const projectDir = path.join(tempBaseDir, projectId);
    await fs.mkdir(projectDir, { recursive: true });

    try {
      // 3. Download photos from Supabase
      const { data: photos, error: listError } = await supabaseAdmin.storage
        .from("scans")
        .list(`users/${userId}/projects/${projectId}/photos`);

      if (listError) throw listError;
      if (!photos || photos.length === 0) {
        throw new Error(`No photos found for project ${projectId}`);
      }

      for (const photo of photos) {
        const localPath = path.join(projectDir, photo.name);

        const { data, error } = await supabaseAdmin.storage
          .from("scans")
          .download(
            `users/${userId}/projects/${projectId}/photos/${photo.name}`,
          );

        if (error) throw error;

        await fs.writeFile(localPath, Buffer.from(await data.arrayBuffer()));
      }

      await supabaseAdmin
        .from("recon_jobs")
        .update({
          progress: 30,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // 4. Run Meshroom
      const glbLocalPath = await runMeshroom({
        inputDir: projectDir,
        outputDir: path.join(projectDir, "meshroom_output"),
      });

      await supabaseAdmin
        .from("recon_jobs")
        .update({
          progress: 80,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // 5. Upload GLB to Supabase
      const glbBuffer = await fs.readFile(glbLocalPath);
      const glbStoragePath = `users/${userId}/projects/${projectId}/model.glb`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("scans")
        .upload(glbStoragePath, glbBuffer, {
          contentType: "model/gltf-binary",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // ✅ Create a signed URL valid for 1 year (31536000 seconds)
      const { data: signedUrlData, error: signedUrlError } =
        await supabaseAdmin.storage
          .from("scans")
          .createSignedUrl(glbStoragePath, 60 * 60 * 24 * 365); // 1 year

      if (signedUrlError) throw signedUrlError;
      const modelUrl = signedUrlData.signedUrl; // ✅ signed URL with token

      // 6. Final DB update
      await supabaseAdmin
        .from("recon_jobs")
        .update({
          status: "completed",
          progress: 100,
          model_url: modelUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      await supabaseAdmin
        .from("projects")
        .update({
          status: "completed",
          job_status: "completed",
          job_finished_at: new Date().toISOString(),
          glb_url: modelUrl,
        })
        .eq("id", projectId);

      console.log(`[Worker] Completed project ${projectId} - GLB: ${modelUrl}`);

      if (!modelUrl) {
        throw new Error("Failed to generate public URL for uploaded GLB");
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);

      await supabaseAdmin
        .from("recon_jobs")
        .update({
          status: "failed",
          progress: 0,
          error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      await supabaseAdmin
        .from("projects")
        .update({
          status: "failed",
          job_status: "failed",
          job_finished_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      throw e;
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  },
  { connection },
);

console.log("[Worker] Listening on queue: reconstruction");

worker.on("completed", (job) => console.log(`Job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err));
