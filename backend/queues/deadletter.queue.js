import { Queue } from "bullmq";
import { bullConnection } from "./connection.js";

// Jobs land here only after the scoring queue has exhausted all its
// attempts (including the primary/fallback model retry inside
// openrouter.service.js). This is where a human would go to inspect
// permanently-failed resumes.
export const deadLetterQueue = new Queue("scoring-dead-letter", { connection: bullConnection });

export async function sendToDeadLetter(resumeId, reason) {
  await deadLetterQueue.add("failed-resume", { resumeId, reason, failedAt: new Date().toISOString() });
}
