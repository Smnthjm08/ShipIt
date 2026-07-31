"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** github.com/owner/repo, with or without protocol, .git suffix or trailing path. */
const GITHUB_URL = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#]|$)/i;

export function GitUrlInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleImport = () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    const match = trimmed.match(GITHUB_URL);
    if (!match) {
      // Validate here rather than routing to the import form and letting it
      // render "Invalid GitHub import link" — the error belongs next to the
      // input that caused it.
      setError("That doesn't look like a GitHub repository URL.");
      return;
    }

    const [, owner, repo] = match;
    setError(null);
    setLoading(true);

    const params = new URLSearchParams({
      repo: repo!,
      owner: owner!,
      url: `https://github.com/${owner}/${repo}`,
    });
    router.push(`/new/import/?${params.toString()}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          aria-label="Git repository URL"
          aria-invalid={!!error}
          aria-describedby={error ? "git-url-error" : undefined}
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleImport();
          }}
          className="font-machine text-sm"
        />
        <Button onClick={handleImport} disabled={!url.trim() || loading}>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          Continue
        </Button>
      </div>
      {error && (
        <p id="git-url-error" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
