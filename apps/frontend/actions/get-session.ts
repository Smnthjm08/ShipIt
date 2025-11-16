"use server";

import { auth } from "@workspace/shared/auth";
import { headers } from "next/headers";

export default async function getUserSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session ?? null;
}
