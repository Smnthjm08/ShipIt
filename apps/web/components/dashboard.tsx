"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

export default function Dashboard({ user }: DashboardProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [projects, setProjects] = useState<ProjectTypes[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        limit: 6,
        total: 0,
        totalPages: 0,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                            limit: 6,
                            ...(debouncedSearch && { search: debouncedSearch }),
                        },
                    }
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
    }, [currentPage, debouncedSearch, user.id]);

    return (
        <div className="container mx-auto px-2 py-6">
            <div className="mb-2">
                <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
            </div>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isLoading}
                    className="w-full sm:w-1/3"
                />
                <Button asChild>
                    <Link href="/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Project
                    </Link>
                </Button>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className="mt-2"
                    >
                        Retry
                    </Button>
                </div>
            )}

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : projects.length > 0 ? (
                <>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project: ProjectTypes) => (
                            <ProjectsCard key={project.id} project={project} />
                        ))}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className=" text-center text-sm text-muted-foreground">
                                Showing {projects.length} of {pagination.total} projects
                            </p>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || isLoading}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Previous
                                </Button>

                                <div className="flex gap-2">
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
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
                                                <div key={page} className="flex items-center gap-2">
                                                    {showEllipsis && <span>...</span>}
                                                    <Button
                                                        variant={currentPage === page ? "default" : "outline"}
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
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                                    }
                                    disabled={currentPage === pagination.totalPages || isLoading}
                                >
                                    Next
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div>
                    {debouncedSearch ? (
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">No projects found</h3>
                            <p className="text-muted-foreground">
                                Try adjusting your search query
                            </p>
                        </div>
                    ) : (
                        <EmptyProjects />
                    )}
                </div>
            )}
        </div>
    );
}
