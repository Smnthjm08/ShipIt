import { createClient } from "redis";
import { redisConfig } from "./config.js";

const client = createClient(redisConfig);

export type RedisClient = any;
export const redis: any = client;

redis.on("error", (err: any) => console.error("redis client error:", err));

redis.connect().catch((err: any) => {
  console.error("Failed to connect to Redis client:", err);
});
