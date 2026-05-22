"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useSound } from "@/hooks/use-sound"
import { Trophy, Zap } from "lucide-react"

export function CTASection() {
  const { play } = useSound()

  return (
    <section className="relative py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="relative rounded-2xl border bg-card p-8 md:p-12 max-w-2xl w-full text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent-yellow/10 blur-[60px]" />
            <div className="relative z-10">
              <Trophy className="h-12 w-12 text-accent-yellow mx-auto mb-4" />
              <p className="text-3xl font-bold mb-2">Empieza gratis</p>
              <p className="text-muted-foreground mb-8">Sin tarjeta de crédito. Acceso completo por 7 días.</p>
              <Button
                size="lg"
                asChild
                className="h-12 px-10 text-base rounded-full"
                onClick={() => play("success")}
              >
                <Link href="/register">
                  Crear cuenta gratis
                  <Zap className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
