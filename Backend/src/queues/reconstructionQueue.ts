// src/queues/reconstructionQueue.ts
import { Queue } from "bullmq";
import { connection } from "../config/queue";

export type ReconstructionJob = {
  jobId: string;
};

export const reconstructionQueue = new Queue<ReconstructionJob>(
  "reconstruction",
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 3600 * 24 * 7 },
      delay: 5000, // wait 5 seconds before processing
    },
  },
);
