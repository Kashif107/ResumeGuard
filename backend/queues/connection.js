import IORedis from "ioredis";
import "dotenv/config";

// BullMQ requires maxRetriesPerRequest: null on the ioredis connection.
export const bullConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
