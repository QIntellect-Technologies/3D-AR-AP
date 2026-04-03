import express from "express";
import cors from "cors";
import { config } from "./config";
import uploadRoutes from "./routes/uploads";
import projectRoutes from "./routes/projects";
import jobsRoutes from "./routes/jobs";
import webhookRoutes from "./routes/webhooks";
import { errorHandler } from "./middleware/errorHandler";

const originalFetch = global.fetch;
global.fetch = async (...args) => {
  const url = args[0];
  console.log(`🌐 [FETCH] ${url}`);

  // Don't log Supabase health checks to avoid spam
  if (typeof url === "string" && !url.includes("/rest/v1/")) {
    console.log(`🌐 [FETCH DETAILS]`, {
      url,
      method: args[1]?.method || "GET",
    });
  }

  return originalFetch(...args);
};

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/uploads", uploadRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/webhooks", webhookRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

// global error handler
app.use(errorHandler);

const port = Number(config.port);

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${port}`);
});
