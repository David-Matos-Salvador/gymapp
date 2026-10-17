"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
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
  const { isAuthenticated, isAdmin, isTrainer, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      router.replace("/super-admin")
      return
    }
    if (isAdmin) {
      router.replace("/admin")
      return
    }
    if (isTrainer) {
      router.replace("/coach")
      return
    }
    if (isAuthenticated) {
      router.replace("/rutinas")
      return
    }
  }, [isAuthenticated, isAdmin, isTrainer, user, router])

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
