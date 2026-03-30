import { supabaseAdmin } from "../config/supabaseAdmin";

export async function setProjectReconstructionStatus(
  projectId: string,
  status: string,
) {
  const { error } = await supabaseAdmin
    .from("projects")
    .update({ status, job_status: status })
    .eq("id", projectId);

  if (error) {
    throw error;
  }
}

export async function setReconJobStatus(
  jobId: string,
  status: string,
  progress: number,
  modelUrl?: string,
  errorMsg?: string,
) {
  const update = {
    status,
    progress,
    model_url: modelUrl || null,
    error: errorMsg || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("recon_jobs")
    .update(update)
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}
