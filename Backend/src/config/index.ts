import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// ── Debug ──
console.log("Current working directory:", process.cwd());
console.log("SUPABASE_URL from env:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY exists?", !!process.env.SUPABASE_ANON_KEY);
console.log(
  "SUPABASE_SERVICE_ROLE_KEY exists?",
  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
);

if (!process.env.SUPABASE_URL) {
  console.error("SUPABASE_URL is missing or empty in .env file!");
  process.exit(1);
}

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
};

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);
