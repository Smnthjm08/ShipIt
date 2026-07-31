import { FolderCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import Link from "next/link";

export function EmptyProjects() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderCode aria-hidden />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          Import a GitHub repository and ShipIt builds it and serves it on its
          own URL.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {/* One action, and it works. The old "Import Project" button had no
            handler and "Learn More" pointed at "#". */}
        <Button asChild>
          <Link href="/new">Import a repository</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
