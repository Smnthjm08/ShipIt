import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Github, Lock } from "lucide-react";
import { Repo } from "@/types/types";
import Link from "next/link";
import { formatRelative } from "@/utils/format-time";

export default function GitHubSection({ repos }: { repos: Repo[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Github className="w-5 h-5" />
        Git Providers
      </h2>
      {repos.length === 0 ? (
        <Empty className="border rounded-lg">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Github className="w-12 h-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No Repositories Found</EmptyTitle>
            <EmptyDescription>
              Connect your GitHub account to view your repositories.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/connect-github">
                <Github className="w-4 h-4 mr-2" />
                Connect GitHub
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div>
          <ItemGroup className="gap-y-4">
            {repos.map((repo) => (
              <Item
                variant={"outline"}
                key={repo.id}
                className="py-4 px-4 hover:bg-muted/30 border transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full border flex items-center justify-center font-bold text-muted-foreground text-xs">
                    {repo?.name[0]?.toUpperCase()}
                  </div>
                  <ItemContent>
                    <div className="flex items-center gap-2">
                      <ItemTitle className="font-md text-sm">
                        {repo.name}
                      </ItemTitle>
                      {repo?.private ? (
                        <Lock size={"14"} className="font-bold" />
                      ) : null}
                      <Badge
                        className="text-xs rounded-full px-2 font-bold py-0.5"
                        variant="default"
                      >
                        {repo?.language}
                      </Badge>
                    </div>
                    <ItemDescription className="text-xs flex gap-2 dark:!text-slate-300 ">
                      {repo?.owner} · {formatRelative(repo.updatedAt)}
                    </ItemDescription>
                  </ItemContent>
                </div>
                <ItemActions>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-xl hover:pointer"
                    asChild
                  >
                    <Link
                      href={`/new?repo=${encodeURIComponent(repo.fullName)}&branch=${repo.defaultBranch}`}
                    >
                      Import
                    </Link>
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </div>
      )}
    </div>
  );
}
