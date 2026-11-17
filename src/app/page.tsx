import { HeaderSection } from "@/components/landing/header-section"
import { HeroSection } from "@/components/landing/hero-section"
import { RolesSection } from "@/components/landing/roles-section"
import { StartSection } from "@/components/landing/start-section"
import { DemoSection } from "@/components/landing/demo-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { CTASection } from "@/components/landing/cta-section"
import { FooterSection } from "@/components/landing/footer-section"
import { roles, steps, plans } from "@/constants/landing"

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <HeaderSection />
      <main>
        <HeroSection />
        <RolesSection roles={roles} />
        <StartSection steps={steps} />
        <DemoSection />
        <PricingSection plans={plans} />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  )
}
