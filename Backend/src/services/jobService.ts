import { reconstructionQueue } from "../queues/reconstructionQueue";
import { supabaseAdmin } from "../config/supabaseAdmin";
import type { Project } from "../models/project";

export async function createReconJob(projectId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("recon_jobs")
    .insert({
      project_id: projectId,
      user_id: userId,
      status: "queued",
      progress: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to create recon job");
  }

  const jobId = data.id;

  await reconstructionQueue.add("reconstruct", { jobId }, { jobId });

  await supabaseAdmin
    .from("projects")
    .update({ status: "queued", job_id: jobId, job_status: "queued" })
    .eq("id", projectId);

  return jobId as string;
}

export async function getReconJob(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from("recon_jobs")
    .select("id, project_id, status, progress, model_url, error")
    .eq("id", jobId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
