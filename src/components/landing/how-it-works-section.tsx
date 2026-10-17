"use client"

import { motion } from "framer-motion"
import { fadeIn } from "@/constants/landing"
import type { LucideIcon } from "lucide-react"

interface Step {
  icon: LucideIcon
  step: string
  title: string
  description: string
  color: string
  bg: string
}

interface HowItWorksSectionProps {
  steps: Step[]
}

export function HowItWorksSection({ steps }: HowItWorksSectionProps) {
  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div {...fadeIn} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Cómo <span className="text-accent-yellow">funciona</span>?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Digitaliza tu gimnasio en tres simples pasos. Sin instalaciones complicadas ni hardware
            especializado.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-px bg-border" />
              )}
              <div className="relative z-10">
                <div
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${step.bg} mb-6`}
                >
                  <step.icon className={`h-9 w-9 ${step.color}`} />
                </div>
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-3">
                  {step.step}
                </span>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
