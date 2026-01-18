import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString: connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
export * from "../generated/prisma/client";
