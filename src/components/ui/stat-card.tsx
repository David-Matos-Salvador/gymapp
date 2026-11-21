"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value?: string | number
  icon: LucideIcon
  iconColor?: string
  borderColor?: string
  suffix?: string
  delay?: number
  href?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-gold",
  borderColor = "border-t-accent-yellow",
  suffix,
  delay = 0,
  href,
  onClick,
  children,
}: StatCardProps) {
  const card = (
    <Card
      size="sm"
      className={cn(
        "h-full border-t-2",
        borderColor,
        (href || onClick) && "cursor-pointer transition-shadow hover:shadow-md"
      )}
      onClick={onClick}
    >
      <div className="flex h-full items-center justify-between gap-2 px-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {children ?? (
            <p className="mt-0.5 text-2xl md:text-3xl font-bold tracking-tight tabular-nums leading-none">
              {value}
              {suffix && (
                <span className="ml-1.5 text-xs md:text-sm font-normal text-muted-foreground">
                  {suffix}
                </span>
              )}
            </p>
          )}
        </div>
        <Icon className={cn("h-5 w-5 shrink-0", iconColor)} />
      </div>
    </Card>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full"
    >
      {href ? (
        <Link href={href} onClick={onClick} className="block h-full">
          {card}
        </Link>
      ) : (
        card
      )}
    </motion.div>
  )
}
