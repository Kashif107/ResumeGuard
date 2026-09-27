# AI Resume Analyzer — Puter-free port

This is the cloned `ai-resume-analyzer` repo's UI, scoring shape, and feature
set, ported off Puter.js onto a real backend (Express, PostgreSQL, Redis,
BullMQ, Cloudinary, OpenRouter, JWT). Plain JavaScript throughout — no
TypeScript.

## Folder structure

```
frontend/   React + React Router v7 app (was .tsx, now .jsx/.js)
backend/    Express API + BullMQ worker + PostgreSQL + Redis
```

## What changed vs. the original repo

- `app/lib/puter.ts` → `app/lib/api.js` (talks to your Express API instead
  of `window.puter`)
- Client-side `puter.fs` / `puter.kv` → PostgreSQL (`resumes`, `users`
  tables) via the backend
- Client-side `puter.ai.chat()` → server-side OpenRouter call, done inside
  a BullMQ worker, with retry + cross-model fallback + dead-letter queue
- `pdf2img.ts` (canvas-based PDF→image conversion in the browser) →
  server-side text extraction (`pdf-parse`) for the LLM, plus a Cloudinary
  URL transformation for the on-page preview image (no extra image step)
- Every UI component, the 5-dimension feedback shape (`overallScore`, `ATS`,
  `toneAndStyle`, `content`, `structure`, `skills`, each with `tips`), and
  all routes are unchanged in behavior

## Running it

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, CLOUDINARY_*, OPENROUTER_API_KEY, JWT_SECRET
npm install
psql "$DATABASE_URL" -f db/schema.sql   # or run schema.sql via your Postgres client
npm start        # Express API on :4000
npm run worker   # in a second terminal — the BullMQ scoring worker
```

Two processes, on purpose: the API responds to an upload immediately after
queuing the job; the worker does the slow LLM call separately, so a stalled
OpenRouter request never blocks a request thread.

### 2. Frontend

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env
npm run dev
```

## Request flow (upload → score → view)

1. `POST /api/resumes/upload` — PDF → Cloudinary, text extracted with
   `pdf-parse`, row inserted in Postgres (`status: pending`), job pushed to
   BullMQ. Returns `{ resumeId }` immediately.
2. `scoring.worker.js` (separate process) picks up the job:
   - Checks Redis for a cached result keyed on `SHA256(resumeText + jdText)`
   - On a cache miss: runs deterministic keyword matching (feeds the
     `skills` dimension) + calls OpenRouter for the qualitative dimensions
   - Retries the primary model 3x with exponential backoff, falls back to a
     secondary model, and on total failure marks the resume `failed` and
     pushes it to the dead-letter queue
   - Writes the resulting JSON into `resumes.feedback` (`JSONB`)
3. Frontend polls `GET /api/resumes/:id` until `status` is `done` or
   `failed`, then renders with the exact same `Summary` / `ATS` / `Details`
   components as the original repo.

## Notes

- `deadletter.queue.js` just logs failed jobs into a separate BullMQ queue
  for now — wire it up to an admin view or an alert if you want to act on
  it.
- The keyword-matching in `services/keyword.service.js` is intentionally
  simple (token overlap). It's meant as a fast, deterministic signal fed
  into the LLM prompt, not a replacement for the semantic scoring.
