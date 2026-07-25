"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Rocket, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DeploymentTable } from "./deployment-table";
import { useAuth } from "@/components/providers/auth-provider";
import type { PaginatedResponse, PaginationMeta } from "@/types/api";

interface DeploymentRow {
  id: string;
  status: string;
  branch: string;
  createdAt: string;
  projectId: string;
  project: { id: string; name: string };
}

export function DeploymentsView() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [deployments, setDeployments] = useState<DeploymentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
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
    if (!user) return;

    const fetchDeployments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get<PaginatedResponse<DeploymentRow>>(
          "/api/deployments",
          {
            params: {
              page: currentPage,
              limit,
              ...(debouncedSearch && { search: debouncedSearch }),
            },
          },
        );

        setDeployments(response.data.data);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setDeployments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeployments();
  }, [user, currentPage, debouncedSearch, limit, retryNonce]);

  if (!user) return null;

  const isPristine =
    !isLoading && !error && !debouncedSearch && pagination.total === 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Deployments</h1>
        <p className="text-sm text-muted-foreground">
          Every deployment across all your projects
        </p>
      </div>

      {!isPristine && (
        <div className="mb-6 relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="text"
            placeholder="Search by project…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search deployments"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Couldn&apos;t load deployments</AlertTitle>
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
      ) : isPristine ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Rocket />
            </EmptyMedia>
            <EmptyTitle>No deployments yet</EmptyTitle>
            <EmptyDescription>
              Deployments from any of your projects will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <DeploymentTable
            deployments={deployments.map((d) => ({
              ...d,
              createdAt: new Date(d.createdAt),
            }))}
            showProject
          />

          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Showing {deployments.length} of {pagination.total} deployment
              {pagination.total === 1 ? "" : "s"}
            </p>

            {pagination.totalPages > 1 && (
              <nav
                aria-label="Deployments pagination"
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
      )}
    </div>
  );
}
