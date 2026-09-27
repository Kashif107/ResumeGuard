import { pool } from "../postgres.js";

export async function createResume({ userId, companyName, jobTitle, jdText, resumeUrl, resumeText, fingerprint }) {
  const { rows } = await pool.query(
    `INSERT INTO resumes (user_id, company_name, job_title, jd_text, resume_url, resume_text, fingerprint, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [userId, companyName, jobTitle, jdText, resumeUrl, resumeText, fingerprint]
  );
  return rows[0];
}

export async function getResumeById(id, userId) {
  const { rows } = await pool.query(`SELECT * FROM resumes WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] || null;
}

export async function listResumesByUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateResumeFeedback(id, { feedback, imageUrl, status }) {
  const { rows } = await pool.query(
    `UPDATE resumes
     SET feedback = $2, image_url = COALESCE($3, image_url), status = $4, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, feedback, imageUrl || null, status]
  );
  return rows[0];
}

export async function markResumeStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE resumes SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0];
}

export async function deleteResume(id, userId) {
  await pool.query(`DELETE FROM resumes WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function deleteAllResumesForUser(userId) {
  await pool.query(`DELETE FROM resumes WHERE user_id = $1`, [userId]);
}
