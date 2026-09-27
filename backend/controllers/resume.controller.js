import { uploadBuffer, deleteAsset } from "../services/cloudinary.service.js";
import { extractTextFromPdf } from "../services/pdf.service.js";
import { enqueueScoringJob } from "../queues/scoring.queue.js";
import {
  createResume,
  getResumeById as getResumeByIdModel,
  listResumesByUser,
  deleteResume as deleteResumeModel,
  deleteAllResumesForUser,
} from "../db/models/resume.model.js";

function toClientShape(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    jobDescription: row.jd_text,
    resumeUrl: row.resume_url,
    imageUrl: row.image_url,
    status: row.status,
    feedback: row.feedback,
    createdAt: row.created_at,
  };
}

export async function uploadResume(req, res) {
  const { companyName, jobTitle, jobDescription } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ message: "Resume file is required" });

  try {
    // 1. Upload the PDF to Cloudinary
    const uploaded = await uploadBuffer(file.buffer, {
      folder: `resumes/${req.user.id}`,
      resourceType: "image", // PDFs go up as raw assets; preview image is derived via URL transform
    });
    

    // 2. Extract text server-side (replaces the client-side pdf2img.ts + image round-trip)
    const resumeText = await extractTextFromPdf(file.buffer);

    // 3. Insert a pending row and return immediately — scoring happens async
    const resume = await createResume({
      userId: req.user.id,
      companyName,
      jobTitle,
      jdText: jobDescription,
      resumeUrl: uploaded.secure_url,
      resumeText,
      fingerprint: null,
    });

    // 4. Push to BullMQ — request does not wait on the LLM call
    await enqueueScoringJob(resume.id);

    res.status(202).json({ resumeId: resume.id, status: "pending" });
  } catch (err) {
    console.error("uploadResume failed", err);
    res.status(500).json({ message: "Failed to upload and queue resume" });
  }
}

export async function getResume(req, res) {
  const resume = await getResumeByIdModel(req.params.id, req.user.id);
  if (!resume) return res.status(404).json({ message: "Resume not found" });
  res.json(toClientShape(resume));
}

export async function listResumes(req, res) {
  const resumes = await listResumesByUser(req.user.id);
  res.json(resumes.map(toClientShape));
}

export async function deleteResumeHandler(req, res) {
  const resume = await getResumeByIdModel(req.params.id, req.user.id);
  if (!resume) return res.status(404).json({ message: "Resume not found" });

  await deleteResumeModel(req.params.id, req.user.id);
  res.status(204).send();
}

export async function wipeResumes(req, res) {
  await deleteAllResumesForUser(req.user.id);
  res.status(204).send();
}
