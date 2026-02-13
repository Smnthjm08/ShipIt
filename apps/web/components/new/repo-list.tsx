"use client";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Globe, Lock, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface RepoListProps {
  repos: any[];
}

export function RepoList({ repos }: RepoListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") || "";
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (search !== currentQ) {
        const params = new URLSearchParams(searchParams.toString());
        if (search) {
          params.set("q", search);
        } else {
          params.delete("q");
        }
        router.push(`?${params.toString()}`);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [search, router, searchParams]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ItemGroup>
        {repos.map((repo) => (
          <Item key={repo.id} className="bg-card">
            <ItemMedia>
              {repo.private ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Globe className="h-4 w-4 text-muted-foreground" />
              )}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {repo.name}
                <Badge variant="outline" className="ml-2 text-xs">
                  {repo.visibility}
                </Badge>
              </ItemTitle>
              <ItemDescription>
                {repo.description || "No description provided"}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button asChild size="sm">
                <Link
                  href={`/new/import/?repo=${repo?.fullName}&owner=${repo?.owner}&branch=${repo?.defaultBranch}&url=${repo?.url}`}
                >
                  Import
                </Link>
              </Button>
            </ItemActions>
          </Item>
        ))}
        {repos.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No repositories found
          </div>
        )}
      </ItemGroup>
    </div>
  );
}
