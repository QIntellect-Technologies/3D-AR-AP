import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabaseAdmin";
import { authenticate } from "../middleware/auth";
import type { AuthedRequest } from "../middleware/auth";

const router = Router();

const webhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.string(), z.any()),
});

// This endpoint can be triggered by external workers or Supabase storage
router.post("/", async (req, res) => {
  try {
    const body = webhookSchema.parse(req.body);

    // basic health/forwarding style for now
    console.log("[Webhook] received event:", body.event);

    if (body.event === "reconstruction-completed") {
      const { jobId, modelUrl } = body.payload as {
        jobId: string;
        modelUrl: string;
      };

      await supabaseAdmin
        .from("recon_jobs")
        .update({ status: "completed", progress: 100, model_url: modelUrl })
        .eq("id", jobId);

      return res.status(200).json({ success: true, jobId });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[Webhook] failed", err);
    return res.status(400).json({ error: err.message });
  }
});

router.get("/status", authenticate, async (req: AuthedRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, status, glb_url")
      .eq("user_id", req.userId);

    if (error) throw error;

    return res.json({ ok: true, projects: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
