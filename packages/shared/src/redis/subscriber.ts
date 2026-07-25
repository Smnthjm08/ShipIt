import { createClient } from "redis";
import { redisConfig } from "./config.js";
import type { RedisClient } from "./client.js";

export const redisSub: RedisClient = createClient(redisConfig);

redisSub.on("error", (err: Error) =>
  console.error("redis subscriber error:", err),
);
