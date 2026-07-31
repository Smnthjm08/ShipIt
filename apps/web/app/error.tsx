"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Route-level error boundary. Without this a single component throw takes out
 * the whole app shell and leaves the user with a blank screen and no way back.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex flex-1 items-center justify-center px-4 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Something broke on this page</EmptyTitle>
          <EmptyDescription>
            The error was logged. Trying again usually clears it — if it
            doesn&apos;t, head back to your projects.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>
              <RefreshCw aria-hidden />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects">Back to projects</Link>
            </Button>
          </div>
          {error.digest && (
            <p className="text-muted-foreground font-machine mt-4 text-xs">
              Reference: {error.digest}
            </p>
          )}
        </EmptyContent>
      </Empty>
    </div>
  );
}
