"use client";

import LandingPage from "@/components/landing-page";
import Dashboard from "@/components/dashboard";
import { useAuth } from "@/components/providers/auth-provider";

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <LandingPage />;
  }

  return <Dashboard user={user} />;
}
