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
router.post("/:id/trigger", authenticate, async (req: AuthedRequest, res) => {
  try {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id: projectId } = paramsSchema.parse(req.params);

    const userId = requireUserId(req);

    // 1) verify project belongs to user
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

    // Optional: prevent duplicate running jobs for same project
    const { data: existingJob } = await supabaseAdmin
      .from("recon_jobs")
      .select("id, status")
      .eq("project_id", projectId)
      .in("status", ["pending", "queued", "processing"])
      .maybeSingle();

    if (existingJob?.id) {
      return res.status(200).json({
        success: true,
        projectId,
        jobId: existingJob.id,
        message: `Job already ${existingJob.status}`,
      });
    }

    // 2) Create recon_jobs row (real DB jobId)
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

    // 3) Enqueue worker using DB jobId (BullMQ jobId can be the same UUID)
    const job = await reconstructionQueue.add(
      "reconstruct",
      { jobId },
      { jobId },
    );

    console.log(
      `Enqueued reconstruction job ${job.id} for project ${projectId}`,
    );

    // 4) Update project status (optional)
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

    return res.json({
      success: true,
      projectId,
      jobId, // ✅ real UUID from DB
      message: "Reconstruction job enqueued",
    });
  } catch (err: any) {
    console.error("Trigger reconstruction error:", err);
    return res.status(500).json({
      error: "Failed to enqueue reconstruction job",
      details: err.message,
    });
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
