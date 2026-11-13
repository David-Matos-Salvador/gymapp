import { HeaderSection } from "@/components/landing/header-section"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { DemoSection } from "@/components/landing/demo-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { CTASection } from "@/components/landing/cta-section"
import { FooterSection } from "@/components/landing/footer-section"
import { features, steps, plans } from "@/constants/landing"

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <HeaderSection />
      <HeroSection />
      <FeaturesSection features={features} />
      <HowItWorksSection steps={steps} />
      <DemoSection />
      <PricingSection plans={plans} />
      <CTASection />
      <FooterSection />
    </div>
  )
}
