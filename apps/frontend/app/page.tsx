import { auth } from "@workspace/shared/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import FeaturesSection from "@/components/home/features";
import FooterSection from "@/components/home/footer";
import HeroSection from "@/components/home/hero-section";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) return redirect("/dashboard");

  return (
    <main className="flex flex-col min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <FooterSection />
    </main>
  );
}
