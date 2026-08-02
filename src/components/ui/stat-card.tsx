"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
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
  iconColor = "text-accent-yellow",
  borderColor = "border-t-accent-yellow",
  suffix,
  delay = 0,
  href,
  onClick,
  children,
}: StatCardProps) {
  const card = (
    <Card
      className={cn(
        "hover:shadow-md transition-all border-t-2",
        borderColor,
        (href || onClick) && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        {children ?? (
          <>
            <p className="text-3xl font-bold">{value}</p>
            {suffix && (
              <p className="text-xs text-muted-foreground mt-1">{suffix}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      {href ? (
        <Link href={href} onClick={onClick}>
          {card}
        </Link>
      ) : (
        card
      )}
    </motion.div>
  )
}
