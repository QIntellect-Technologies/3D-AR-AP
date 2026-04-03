import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

// Custom fetch with 5-minute timeout (300,000 ms)
const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);
  const opts = { ...options, signal: controller.signal };
  try {
    return await fetch(url, opts);
  } finally {
    clearTimeout(timeoutId);
  }
};

// Use the service role key for auth verification
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: customFetch,
    },
  },
);

export async function authenticate(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;

      if (!token) {
        return res.status(401).json({ error: "Missing token" });
      }

      console.log(
        `🔐 Verifying token with Supabase (attempt ${attempt}/${maxRetries})...`,
      );
      const { data, error } = await supabase.auth.getUser(token);
      console.log(
        `✅ Token verification complete (attempt ${attempt}/${maxRetries})`,
      );

      if (error || !data.user) {
        console.error("Auth error:", error?.message);
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      req.userId = data.user.id;
      req.userEmail = data.user.email;

      return next();
    } catch (err: any) {
      lastError = err;
      console.error(
        `Auth attempt ${attempt}/${maxRetries} failed:`,
        err?.message,
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

  console.error("All auth attempts failed");
  return res
    .status(401)
    .json({ error: "Authentication service unavailable. Please try again." });
}
