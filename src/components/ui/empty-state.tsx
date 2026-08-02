import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { FileText } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  message: string
  className?: string
}

export function EmptyState({
  icon: Icon = FileText,
  message,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
