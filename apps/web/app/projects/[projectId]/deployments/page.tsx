"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ProjectDeploymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deployments</h1>
        <p className="text-muted-foreground">
          View and manage your deployment history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <p>Deployment history feature coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
