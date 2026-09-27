// Deterministic keyword/skill matching — the fast, non-LLM half of the
// hybrid scoring engine. Feeds the "skills" dimension of the feedback shape;
// the LLM handles tone/content/structure/ATS qualitatively.

const COMMON_SKILL_TOKENS = /[A-Za-z][A-Za-z0-9+.#/-]{1,30}/g;

function extractTokens(text = "") {
  const matches = text.match(COMMON_SKILL_TOKENS) || [];
  return new Set(matches.map((t) => t.toLowerCase()));
}

export function matchSkills(resumeText, jdText) {
  const resumeTokens = extractTokens(resumeText);
  const jdTokens = extractTokens(jdText);

  const matched = [];
  const missing = [];

  for (const token of jdTokens) {
    if (token.length < 3) continue;
    if (resumeTokens.has(token)) matched.push(token);
    else missing.push(token);
  }

  const total = matched.length + missing.length;
  const coverage = total === 0 ? 0 : Math.round((matched.length / total) * 100);

  return { matched, missing, coverage };
}
