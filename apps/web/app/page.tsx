"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import ProjectsCard, { ProjectTypes } from "@/components/projects-card";
import { EmptyProjects } from "@/components/empty-projects";
import { useEffect, useState } from "react";
import { useSession } from "@repo/auth/client";
import LandingPage from "@/components/landing-page";
import Link from "next/link";
import type { PaginatedResponse, PaginationMeta } from "@/types/api";

export default function HomePage() {
  const { data: session, isPending } = useSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [projects, setProjects] = useState<ProjectTypes[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch projects when page or search changes
  useEffect(() => {
    if (!session?.user) return;

    const fetchProjects = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "9",
          ...(debouncedSearch && { search: debouncedSearch }),
        });

        const response = await fetch(`/api/projects?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }

        const data: PaginatedResponse<ProjectTypes> = await response.json();
        setProjects(data.data);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [currentPage, debouncedSearch, session]);

  // Show loading state while checking session
  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!session?.user) {
    return <LandingPage />;
  }

  return (
    <main className="flex flex-1 flex-col py-6 px-12 gap-4 lg:px-24 md:px-16">
      <h1 className="text-2xl font-bold">Welcome, {session.user.name}!</h1>

      <div className="flex space-x-4">
        <Input
          placeholder="Search Projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLoading}
        />
        <Link href="/new">
          <Button>
            New Project <PlusCircle />
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage)}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : projects.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: ProjectTypes) => (
              <ProjectsCard key={project.id} project={project} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first page, last page, current page, and pages around current
                    return (
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <div key={page} className="flex items-center gap-2">
                        {showEllipsis && <span className="px-2">...</span>}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          disabled={isLoading}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={currentPage === pagination.totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Showing {projects.length} of {pagination.total} projects
          </p>
        </>
      ) : (
        <div className="flex justify-center items-center">
          {debouncedSearch ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium">No projects found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search query
              </p>
            </div>
          ) : (
            <EmptyProjects />
          )}
        </div>
      )}
    </main>
  );
}
