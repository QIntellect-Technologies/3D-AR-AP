import { supabaseAdmin } from "../config/supabaseAdmin";
import type { Project } from "../models/project";

export async function createProjectRecord(
  userId: string,
  title: string,
  description?: string,
): Promise<Project> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({ user_id: userId, title, description, status: "pending" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Project;
}

export async function updateProjectStatus(
  projectId: string,
  status: Project["status"],
) {
  const { error } = await supabaseAdmin
    .from("projects")
    .update({ status })
    .eq("id", projectId);

  if (error) {
    throw error;
  }
}

export async function listUserProjects(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, title, description, status, glb_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
