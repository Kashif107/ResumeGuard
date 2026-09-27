import { fingerprint, getCachedFeedback, setCachedFeedback } from "./cache.service.js";
import { matchSkills } from "./keyword.service.js";
import { prepareInstructions, scoreWithLLM } from "./openrouter.service.js";

function parseFeedbackJson(raw) {
  // Models sometimes wrap JSON in backticks despite instructions — strip defensively.
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  return JSON.parse(cleaned);
}

// Returns { feedback, fromCache, modelUsed }
export async function scoreResume({ resumeText, jdText, jobTitle }) {
  const hash = fingerprint(resumeText, jdText);

  const cached = await getCachedFeedback(hash);
  if (cached) {
    return { feedback: cached, fromCache: true, fingerprint: hash };
  }

  const skillsMatch = matchSkills(resumeText, jdText);
  const prompt = prepareInstructions({ jobTitle, jobDescription: jdText, resumeText, skillsMatch });

  const { raw, modelUsed } = await scoreWithLLM(prompt);
  const feedback = parseFeedbackJson(raw);

  await setCachedFeedback(hash, feedback);

  return { feedback, fromCache: false, modelUsed, fingerprint: hash };
}
