import Redis from "ioredis";
import crypto from "crypto";
import "dotenv/config";

export const redis = new Redis(process.env.REDIS_URL);

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

export function fingerprint(resumeText, jdText) {
  return crypto.createHash("sha256").update(`${resumeText}::${jdText}`).digest("hex");
}

export async function getCachedFeedback(hash) {
  const raw = await redis.get(`feedback:${hash}`);
  return raw ? JSON.parse(raw) : null;
}

export async function setCachedFeedback(hash, feedback) {
  await redis.set(`feedback:${hash}`, JSON.stringify(feedback), "EX", CACHE_TTL_SECONDS);
}
