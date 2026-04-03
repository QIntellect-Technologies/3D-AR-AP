import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { z } from "zod";
import { reconstructionQueue } from "../queues/reconstructionQueue";
import { supabaseAdmin } from "../config/supabaseAdmin";
import type { AuthedRequest } from "../middleware/auth";
import { requireUserId } from "../utils/requireUserId";

const router = Router();

// ────────────────────────────────────────────────
// POST /api/projects
// Create a new scan project
// ────────────────────────────────────────────────
const createProjectSchema = z.object({
  title: z.string().min(1).max(100).optional().default("Untitled Scan"),
  description: z.string().max(500).optional(),
});

router.post("/", authenticate, async (req: AuthedRequest, res) => {
  try {
    const { title, description } = createProjectSchema.parse(req.body);

    // In dev mode we use fake user, in prod req.user comes from JWT
    const userId = requireUserId(req);

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: userId,
        title,
        description,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) throw error;

    console.log(`New project created: ${data.id} for user ${userId}`);

    res.status(201).json({
      success: true,
      projectId: data.id,
      title,
      status: "pending",
    });
  } catch (err: any) {
    console.error("Create project error:", err);
    res.status(500).json({
      error: "Failed to create project",
      details: err.message,
    });
  }
});

// ────────────────────────────────────────────────
// GET /api/projects
// List user's projects (optional for later)
// ────────────────────────────────────────────────
router.get("/", authenticate, async (req: AuthedRequest, res) => {
  try {
    const userId = requireUserId(req);

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, description, status, created_at, glb_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ projects: data });
  } catch (err: any) {
    console.error("List projects error:", err);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// ───────────────────────────────────────────────
// POST /api/projects/:id/trigger
// Enqueue reconstruction job for a project
// ───────────────────────────────────────────────
// projects.ts
// POST /api/projects/:id/trigger
router.post("/:id/trigger", authenticate, async (req: AuthedRequest, res) => {
  try {
    console.log("🎯 TRIGGER CALLED - This should be the only trigger");
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id: projectId } = paramsSchema.parse(req.params);

    const userId = requireUserId(req);

    // Retry logic for the entire operation
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Trigger attempt ${attempt}/${maxRetries} for project ${projectId}`,
        );

        // 1) Verify project belongs to user
        const { data: project, error: fetchError } = await supabaseAdmin
          .from("projects")
          .select("id, user_id, status")
          .eq("id", projectId)
          .eq("user_id", userId)
          .single();

        if (fetchError || !project) {
          return res
            .status(404)
            .json({ error: "Project not found or not owned by user" });
        }

        // 2) Prevent duplicate running jobs for same project
        const { data: existingJob } = await supabaseAdmin
          .from("recon_jobs")
          .select("id, status")
          .eq("project_id", projectId)
          .in("status", ["pending", "queued", "processing"])
          .maybeSingle();

        if (existingJob?.id) {
          console.log(
            `Job already exists for project ${projectId} with status ${existingJob.status}`,
          );
          return res.status(200).json({
            success: true,
            projectId,
            jobId: existingJob.id,
            message: `Job already ${existingJob.status}`,
          });
        }

        // 3) Create recon_jobs row (real DB jobId)
        const { data: jobRow, error: jobErr } = await supabaseAdmin
          .from("recon_jobs")
          .insert({
            user_id: userId,
            project_id: projectId,
            status: "queued",
            progress: 0,
          })
          .select("id")
          .single();

        if (jobErr || !jobRow) throw jobErr;

        const jobId = jobRow.id;
        console.log(`Created recon_job row with ID: ${jobId}`);

        // 4) Enqueue worker with retry for queue operations
        let queueAttempt = 0;
        const maxQueueRetries = 3;
        let job = null;

        while (queueAttempt < maxQueueRetries) {
          try {
            job = await reconstructionQueue.add(
              "reconstruct",
              { jobId },
              { jobId },
            );
            console.log(
              `Successfully enqueued job to BullMQ (attempt ${queueAttempt + 1})`,
            );
            break;
          } catch (queueError: any) {
            queueAttempt++;
            console.error(
              `Queue add attempt ${queueAttempt}/${maxQueueRetries} failed:`,
              queueError.message,
            );
            if (queueAttempt === maxQueueRetries) throw queueError;
            const delay = 2000 * queueAttempt;
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        console.log(
          `Enqueued reconstruction job ${job!.id} for project ${projectId}`,
        );

        // 5) Update project status
        const { error: updateError } = await supabaseAdmin
          .from("projects")
          .update({
            status: "queued",
            job_id: jobId,
            job_status: "queued",
            job_started_at: new Date().toISOString(),
          })
          .eq("id", projectId)
          .eq("user_id", userId);

        if (updateError) throw updateError;

        // Success - return early
        return res.json({
          success: true,
          projectId,
          jobId,
          message: "Reconstruction job enqueued",
        });
      } catch (err: any) {
        lastError = err;
        console.error(
          `Trigger attempt ${attempt}/${maxRetries} failed:`,
          err.message,
        );

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff: 2s, 4s, 6s)
          const delay = attempt * 2000;
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // If we get here, all retries failed
    throw lastError;
  } catch (err: any) {
    console.error("Trigger reconstruction error:", err);
    return res.status(500).json({
      error: "Failed to enqueue reconstruction job",
      details: err.message,
    });
  }
});

// PATCH /api/projects/:id/glb_url
router.patch("/:id/glb_url", authenticate, async (req: AuthedRequest, res) => {
  try {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ glbUrl: z.string().url() });

    const { id: projectId } = paramsSchema.parse(req.params);
    const { glbUrl } = bodySchema.parse(req.body);

    const userId = requireUserId(req);

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { error: updateError } = await supabaseAdmin
      .from("projects")
      .update({ glb_url: glbUrl, status: "completed", job_status: "completed" })
      .eq("id", projectId);

    if (updateError) throw updateError;

    return res.json({ success: true, projectId, glbUrl });
  } catch (err: any) {
    console.error("Set GLB URL error:", err);
    res
      .status(500)
      .json({ error: "Failed to set GLB url", details: err.message });
  }
});

// GET /api/projects/:id/status
router.get("/:id/status", authenticate, async (req: AuthedRequest, res) => {
  try {
    const projectId = req.params.id;
    const userId = requireUserId(req);

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("status, job_id, job_status, job_started_at, job_finished_at")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      status: data.status,
      jobId: data.job_id,
      jobStatus: data.job_status,
      startedAt: data.job_started_at,
      finishedAt: data.job_finished_at,
    });
  } catch (err: any) {
    console.error("Status check error:", err);
    res.status(500).json({ error: "Failed to get project status" });
  }
});

export default router;
