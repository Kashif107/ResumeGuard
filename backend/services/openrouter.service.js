import "dotenv/config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const PRIMARY_MODEL = process.env.OPENROUTER_PRIMARY_MODEL || "anthropic/claude-3.7-sonnet";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || "openai/gpt-4o-mini";

async function callModel(model, prompt) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${model} error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenRouter ${model} returned no content`);
  return content;
}

async function withRetry(fn, { attempts = 3, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const delay = baseDelayMs * 2 ** i; // exponential backoff
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// Retries the primary model with exponential backoff; on exhausted retries,
// falls back to a secondary model before giving up entirely (caller decides
// what to do with a total failure — e.g. dead-letter it).
export async function scoreWithLLM(prompt) {
  try {
    const raw = await withRetry(() => callModel(PRIMARY_MODEL, prompt));
    return { raw, modelUsed: PRIMARY_MODEL };
  } catch (primaryErr) {
    console.warn(`Primary model (${PRIMARY_MODEL}) failed after retries, falling back`, primaryErr.message);
    const raw = await withRetry(() => callModel(FALLBACK_MODEL, prompt));
    return { raw, modelUsed: FALLBACK_MODEL };
  }
}

export function prepareInstructions({ jobTitle, jobDescription, resumeText, skillsMatch }) {
  return `You are an expert in ATS (Applicant Tracking System) and resume analysis.
Analyze the resume below against the job description and rate it. Be thorough and
honest — give low scores where warranted, this is meant to help the candidate improve.

Job title: ${jobTitle}
Job description: ${jobDescription}

Resume text:
${resumeText}

Deterministic keyword match results (use as a signal, not the sole basis, for the
skills score): matched=${JSON.stringify(skillsMatch.matched)} missing=${JSON.stringify(
    skillsMatch.missing
  )} coverage=${skillsMatch.coverage}%

Return ONLY a JSON object with exactly this shape, no backticks, no extra text:
{
  "overallScore": number,
  "ATS": { "score": number, "tips": [{ "type": "good"|"improve", "tip": string }] },
  "toneAndStyle": { "score": number, "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] },
  "content": { "score": number, "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] },
  "structure": { "score": number, "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] },
  "skills": { "score": number, "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] }
}`;
}
