export type ProjectStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  glb_url?: string | null;
  job_id?: string | null;
  job_status?: "queued" | "processing" | "completed" | "failed" | null;
  created_at?: string;
  updated_at?: string;
};
