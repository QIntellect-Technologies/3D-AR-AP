import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import type { AuthedRequest } from "../middleware/auth";
import { requireUserId } from "../utils/requireUserId";
import { supabaseAdmin } from "../config/supabaseAdmin";

const router = Router();

router.get("/:jobId", authenticate, async (req: AuthedRequest, res) => {
  try {
    const schema = z.object({ jobId: z.string().uuid() });
    const { jobId } = schema.parse(req.params);

    const userId = requireUserId(req);

    const { data, error } = await supabaseAdmin
      .from("recon_jobs")
      .select(
        "id, project_id, status, progress, model_url, error, created_at, updated_at",
      )
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      console.error("Failed to fetch job:", error);
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json({ job: data });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: "Failed to get job", details: e.message });
  }
});

export default router;
