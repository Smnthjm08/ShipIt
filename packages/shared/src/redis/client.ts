import { createClient } from "redis";
import { redisConfig } from "./config.js";

export type RedisClient = ReturnType<typeof createClient>;

export const redis: RedisClient = createClient(redisConfig);

redis.on("error", (err: Error) => console.error("redis client error:", err));

redis.connect().catch((err: unknown) => {
  console.error("Failed to connect to Redis client:", err);
});
