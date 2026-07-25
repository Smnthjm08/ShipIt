import { createClient } from "redis";
import { redisConfig } from "./config.js";
import type { RedisClient } from "./client.js";

export const redisPub: RedisClient = createClient(redisConfig);

redisPub.on("error", (err: Error) =>
  console.error("redis publisher error::", err),
);
