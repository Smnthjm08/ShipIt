import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  /**
   * The base URL of the server (optional if you're using the same domain).
   * Must be a NEXT_PUBLIC_* var to survive into the browser bundle — a bare
   * `process.env.BASE_URL` is always undefined there, so it silently did
   * nothing. Left unset, better-auth uses the current origin, which is what we
   * want: the Next.js app serves /api/auth itself.
   */
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signUp, useSession, signOut } = authClient;
