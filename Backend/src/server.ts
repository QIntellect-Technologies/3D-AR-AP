import express from "express";
import cors from "cors";
import { config } from "./config";
import uploadRoutes from "./routes/uploads";
import projectRoutes from "./routes/projects";
import jobsRoutes from "./routes/jobs";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/uploads", uploadRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/jobs", jobsRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

const port = Number(config.port);

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${port}`);
});
