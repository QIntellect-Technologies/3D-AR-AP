import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Custom fetch with 60s timeout
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

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: customFetch }, // apply custom fetch to all requests
});
