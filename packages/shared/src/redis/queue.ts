import { createClient } from "redis";
import { redisConfig } from "./config.js";

export const redisQueue: any = createClient(redisConfig);

redisQueue.on("error", (err: any) => console.error("redis queue error:", err));

redisQueue.connect().catch((err: any) => {
  console.error("Failed to connect to Redis queue:", err);
});
