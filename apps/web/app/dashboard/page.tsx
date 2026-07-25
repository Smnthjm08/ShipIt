"use client";

import { LayoutDashboard } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function DashboardPage() {
  return (
    <ComingSoon
      icon={LayoutDashboard}
      title="Dashboard"
      description="An overview of your usage, build activity, and project health is on its way."
    />
  );
}
