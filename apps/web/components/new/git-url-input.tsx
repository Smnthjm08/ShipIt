"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function GitUrlInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleImport = () => {
    if (!url) return;

    setLoading(true);

    // Extract owner and repo from URL
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const owner = match[1];
        const repo = match[2]?.replace(".git", "");

        // Redirect to import page with params
        router.push(
          `/new/import/?repo=${owner}/${repo}&owner=${owner}&url=${url}`,
        );
      } else {
        // Handle invalid URL or private repo that needs more info?
        // For now just pass the URL
        router.push(`/new/import/?url=${url}`);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Enter a Git repository URL here..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleImport();
        }}
      />
      <Button onClick={handleImport} disabled={!url || loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continue
      </Button>
    </div>
  );
}
