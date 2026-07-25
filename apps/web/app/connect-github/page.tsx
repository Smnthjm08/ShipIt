"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Github, Loader2 } from "lucide-react";
import { signIn } from "@repo/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/globals/theme-toggle";

export default function ConnectGithubPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    await signIn.social(
      {
        provider: "github",
        callbackURL: "/",
      },
      {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
      },
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-105 w-205 max-w-full -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Link href="/">
            <ArrowLeft aria-hidden />
            Back to home
          </Link>
        </Button>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="flex flex-col items-center gap-2 text-center">
            <span className="mb-1 flex size-12 items-center justify-center rounded-xl border border-border bg-muted/50">
              <Github className="size-6" aria-hidden />
            </span>
            <CardTitle className="text-xl">Connect GitHub</CardTitle>
            <CardDescription>
              Sign in with GitHub to deploy and manage your projects
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              className="w-full"
              size="lg"
              disabled={loading}
              aria-busy={loading}
              onClick={handleSignIn}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Redirecting to GitHub…
                </>
              ) : (
                <>
                  <Github aria-hidden />
                  Sign in with GitHub
                </>
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex-col gap-3 border-t">
            <p className="text-center text-xs text-muted-foreground">
              We only request access to repositories you choose to deploy.
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Built with{" "}
              <a
                href="https://better-auth.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                better-auth
              </a>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
