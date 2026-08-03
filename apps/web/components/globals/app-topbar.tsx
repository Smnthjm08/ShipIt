"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

const NAV = [
  { title: "Projects", href: "/projects" },
  { title: "Deployments", href: "/deployments" },
] as const;

/** Importing a repo is how a project starts, so /new reads as Projects. */
function isActive(href: string, pathname: string) {
  if (href === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/new");
  }
  return pathname.startsWith(href);
}

/**
 * The account-level shell's only chrome.
 *
 * The project list *is* the navigation at this level, so the bar carries only
 * what the page body can't: the two top-level destinations and the account
 * controls. Height matches the project-level header so switching between shells
 * moves the sidebar and nothing else.
 */
export function AppTopbar() {
  const pathname = usePathname();

  return (
    <header className="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-1 border-b px-4 backdrop-blur-sm md:px-6">
      {/* The wordmark hides below sm, so the link needs its own name. */}
      <Link
        href="/projects"
        aria-label="ShipIt — all projects"
        className="focus-visible:ring-ring mr-2 flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="bg-primary text-primary-foreground flex aspect-square size-7 shrink-0 items-center justify-center rounded-md">
          <Image src="/logo.svg" alt="" width={14} height={14} />
        </span>
        <span
          aria-hidden
          className="hidden text-sm font-semibold tracking-tight sm:inline"
        >
          ShipIt
        </span>
      </Link>

      <nav aria-label="Main" className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "px-3",
                active ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                {item.title}
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
