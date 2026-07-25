"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, List, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectTabsProps {
  projectId: string;
  projectName: string;
}

export function ProjectTabs({ projectId, projectName }: ProjectTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      title: "Overview",
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
      matchExact: true,
    },
    {
      title: "Deployments",
      href: `/projects/${projectId}/deployments`,
      icon: List,
    },
    {
      title: "Settings",
      href: `/projects/${projectId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <div className="mb-6 flex flex-col gap-4">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="font-medium text-foreground">{projectName}</span>
      </nav>

      <div className="flex items-center gap-1 border-b">
        {tabs.map((tab) => {
          const isActive = tab.matchExact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="size-4" aria-hidden />
              {tab.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
