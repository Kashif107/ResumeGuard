import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";
import {
  uploadResume,
  getResume,
  listResumes,
  deleteResumeHandler,
  wipeResumes,
} from "../controllers/resume.controller.js";

const router = Router();

router.use(authMiddleware);

router.post("/upload", uploadMiddleware.single("resume"), uploadResume);
router.get("/", listResumes);
router.get("/:id", getResume);
router.delete("/wipe", wipeResumes);
router.delete("/:id", deleteResumeHandler);

export default router;
