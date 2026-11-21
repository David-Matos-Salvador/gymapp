import { HeaderSection } from "@/components/landing/header-section"
import { HeroSection } from "@/components/landing/hero-section"
import { RolesSection } from "@/components/landing/roles-section"
import { StartSection } from "@/components/landing/start-section"
import { DemoSection } from "@/components/landing/demo-section"
import { FreeSection } from "@/components/landing/free-section"
import { CTASection } from "@/components/landing/cta-section"
import { FooterSection } from "@/components/landing/footer-section"
import { roles, steps, freeFeatures } from "@/constants/landing"
import { contactWhatsappUrl } from "@/lib/contact-whatsapp"
import { connection } from "next/server"

export default async function LandingPage() {
  // CONTACT_WHATSAPP se lee en tiempo de ejecución (no se congela en el build).
  await connection()
  const whatsappUrl = contactWhatsappUrl(process.env.CONTACT_WHATSAPP)

  return (
    <div className="overflow-x-clip">
      <HeaderSection />
      <main>
        <HeroSection />
        <RolesSection roles={roles} />
        <StartSection steps={steps} />
        <DemoSection />
        <FreeSection features={freeFeatures} whatsappUrl={whatsappUrl} />
        <CTASection whatsappUrl={whatsappUrl} />
      </main>
      <FooterSection />
    </div>
  )
}
