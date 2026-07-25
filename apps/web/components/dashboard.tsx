"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import ProjectsCard, { ProjectTypes } from "@/components/cards/projects-card";
import { EmptyProjects } from "@/components/empty-projects";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PaginatedResponse, PaginationMeta } from "@/types/api";
import axios from "axios";
import { SessionUser } from "@/types/session";

interface DashboardProps {
  user: SessionUser;
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-5 space-y-2.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-36" />
      </div>
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return initials.map((part) => part[0]?.toUpperCase()).join("");
}

export default function Dashboard({ user }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [projects, setProjects] = useState<ProjectTypes[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get<PaginatedResponse<ProjectTypes>>(
          "/api/projects",
          {
            params: {
              page: currentPage,
              limit: limit,
              ...(debouncedSearch && { search: debouncedSearch }),
            },
          },
        );

        setProjects(response.data.data);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [currentPage, debouncedSearch, limit, retryNonce, user.id]);

  const handleLimitChange = (value: string) => {
    setLimit(Number(value));
    setCurrentPage(1);
  };

  const firstName = user.name.split(" ")[0];
  const isPristine =
    !isLoading && !error && !debouncedSearch && pagination.total === 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="border border-border">
            <AvatarImage src={user.image ?? undefined} alt="" />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and deploy your projects
            </p>
          </div>
        </div>
        <Button asChild size="lg">
          <Link href="/new">
            <PlusCircle aria-hidden />
            New Project
          </Link>
        </Button>
      </div>

      {!isPristine && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="text"
              placeholder="Search projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search projects"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select value={limit.toString()} onValueChange={handleLimitChange}>
              <SelectTrigger
                className="h-8 w-17.5"
                aria-label="Projects per page"
              >
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {[6, 10, 14, 20].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Couldn&apos;t load projects</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setRetryNonce((n) => n + 1)}
            >
              <RefreshCw aria-hidden />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : projects.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: ProjectTypes) => (
              <ProjectsCard key={project.id} project={project} />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Showing {projects.length} of {pagination.total} project
              {pagination.total === 1 ? "" : "s"}
            </p>

            {pagination.totalPages > 1 && (
              <nav
                aria-label="Projects pagination"
                className="flex items-center gap-2"
              >
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft aria-hidden />
                  Previous
                </Button>

                <div className="hidden gap-1 sm:flex">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1,
                  )
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === pagination.totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      const showEllipsis =
                        index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span
                              className="px-1 text-sm text-muted-foreground"
                              aria-hidden
                            >
                              …
                            </span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="icon"
                            aria-label={`Go to page ${page}`}
                            aria-current={
                              currentPage === page ? "page" : undefined
                            }
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(pagination.totalPages, p + 1),
                    )
                  }
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                  <ChevronRight aria-hidden />
                </Button>
              </nav>
            )}
          </div>
        </>
      ) : debouncedSearch ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No projects found</EmptyTitle>
            <EmptyDescription>
              No projects match &ldquo;{debouncedSearch}&rdquo;. Try a different
              search term.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <EmptyProjects />
      )}
    </div>
  );
}
