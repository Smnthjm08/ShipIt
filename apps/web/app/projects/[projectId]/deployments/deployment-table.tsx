"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Terminal, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Deployment {
  id: string;
  status: string;
  createdAt: Date;
  projectId: string;
}

interface DeploymentTableProps {
  deployments: Deployment[];
}

export function DeploymentTable({ deployments }: DeploymentTableProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (deploymentId: string) => {
    setIsDeleting(deploymentId);
    try {
      await axios.delete(`/api/deployments/${deploymentId}`);
      toast.success("Deployment deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete deployment", error);
      toast.error("Failed to delete deployment");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Deployment ID</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No deployments found.
              </TableCell>
            </TableRow>
          ) : (
            deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell>
                  <Badge
                    variant={
                      deployment.status === "COMPLETED"
                        ? "default"
                        : deployment.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {deployment.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {deployment.id}
                </TableCell>
                <TableCell>
                  {new Date(deployment.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/projects/${deployment.projectId}/deployments/${deployment.id}`}
                        >
                          <Terminal className="mr-2 h-4 w-4" />
                          View Logs
                        </Link>
                      </DropdownMenuItem>
                      {deployment.status === "COMPLETED" && (
                        <DropdownMenuItem asChild>
                          <a
                            href={`http://${deployment.id}.localhost:8001`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit App
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(deployment.id)}
                        disabled={isDeleting === deployment.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
