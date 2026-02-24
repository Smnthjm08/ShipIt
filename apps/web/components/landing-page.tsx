import Feature02 from "./landing/feature-section";
import AgencyHeroSection from "./ui/shadcn-space/hero";
import CTA from "./landing/cta";
import Footer from "./landing/footer";

export default function LandingPage() {
  return (
    <>
      <AgencyHeroSection />
      <Feature02 />
      <CTA />
      <Footer />
    </>
  );
}
