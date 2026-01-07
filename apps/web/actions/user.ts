"use server";

import { prisma } from "@repo/db";

export async function getUsers() {
  return prisma.user.findMany();
}
