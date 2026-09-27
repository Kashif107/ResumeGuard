import { Worker } from "bullmq";
import "dotenv/config";
import { bullConnection } from "../queues/connection.js";
import { sendToDeadLetter } from "../queues/deadletter.queue.js";
import { getResumeById, updateResumeFeedback, markResumeStatus } from "../db/models/resume.model.js";
import { pool } from "../db/postgres.js";
import { scoreResume } from "../services/scoring.service.js";
import { buildPdfPreviewImageUrl } from "../services/pdf.service.js";

// This process is run separately from the Express API (`npm run worker`),
// so a slow or failing LLM call never blocks a request thread.
const worker = new Worker(
  "scoring",
  async (job) => {
    const { resumeId } = job.data;

    // Fetch without a user_id filter since the worker isn't tied to a request.
    const { rows } = await pool.query(`SELECT * FROM resumes WHERE id = $1`, [resumeId]);
    const resume = rows[0];
    if (!resume) throw new Error(`Resume ${resumeId} not found`);

    const { feedback, fromCache, modelUsed } = await scoreResume({
      resumeText: resume.resume_text,
      jdText: resume.jd_text,
      jobTitle: resume.job_title,
    });

    const imageUrl = resume.resume_url ? buildPdfPreviewImageUrl(resume.resume_url) : null;

    await updateResumeFeedback(resumeId, { feedback, imageUrl, status: "done" });

    console.log(
      `[scoring.worker] resume=${resumeId} scored (cache=${fromCache}, model=${modelUsed || "cache"})`
    );
  },
  { connection: bullConnection, concurrency: 3 } // cap concurrency to respect OpenRouter rate limits
);

worker.on("failed", async (job, err) => {
  console.error(`[scoring.worker] job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts})`, err.message);

  const isFinalAttempt = job.attemptsMade >= job.opts.attempts;
  if (isFinalAttempt) {
    const { resumeId } = job.data;
    await markResumeStatus(resumeId, "failed");
    await sendToDeadLetter(resumeId, err.message);
  }
});

worker.on("completed", (job) => {
  console.log(`[scoring.worker] job ${job.id} completed`);
});

console.log("Scoring worker started");
