import { Queue } from "bullmq";
import { bullConnection } from "./connection.js";

export const scoringQueue = new Queue("scoring", { connection: bullConnection });

export async function enqueueScoringJob(resumeId) {
  await scoringQueue.add(
    "score-resume",
    { resumeId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: false, // keep failed jobs around so the dead-letter queue can inspect them
    }
  );
}
