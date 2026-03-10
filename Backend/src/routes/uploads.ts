import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { z } from "zod";
import { supabaseAdmin } from "../config/supabaseAdmin";
import { requireUserId } from "../utils/requireUserId";
const router = Router();

const generateUrlsSchema = z.object({
  projectId: z.string().min(1),
  photoCount: z.number().int().min(1).max(100),
});

router.post("/signed-upload-urls", authenticate, async (req, res) => {
  try {
    const { projectId, photoCount } = generateUrlsSchema.parse(req.body);
    const userId = requireUserId(req);
    const signedUrls = [];

    for (let i = 0; i < photoCount; i++) {
      const timestamp = Date.now();
      const index = String(i + 1).padStart(3, "0");
      const path = `users/${userId}/projects/${projectId}/photos/photo_${timestamp}_${index}.jpg`;

      const { data, error } = await supabaseAdmin.storage
        .from("scans")
        .createSignedUploadUrl(path, { upsert: false });

      if (error) throw error;

      signedUrls.push({
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token,
      });
    }
    console.log("example signedUrl:", signedUrls[0]?.signedUrl);
    res.json({ signedUrls });
  } catch (err) {
    console.error("Signed URL error:", err);
    res.status(500).json({ error: "Failed to generate signed URLs" });
  }
});

export default router;
