"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn("", className)}>
      <ol className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
        <li className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            <Home className="h-3 w-3" />
          </Link>
        </li>
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0" />
              {isLast || !item.href ? (
                <span className="text-foreground font-medium truncate max-w-[180px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[180px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
