"use client"

import { useState, useCallback } from "react"
import { Bell } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  unreadCount: number
  onOpen?: () => void
  children?: React.ReactNode
}

export function NotificationBell({
  unreadCount,
  onOpen,
  children,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next && onOpen) onOpen()
    },
    [onOpen],
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex items-center justify-center size-9 rounded-lg transition-colors hover:bg-muted",
        )}
        aria-label="Notificaciones"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center",
              "size-4.5 rounded-full bg-destructive text-[10px] font-bold leading-none text-white",
              unreadCount > 9 ? "px-0.5 size-fit min-w-[18px]" : "",
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <SheetContent
        side="right"
        className="w-full max-w-sm p-0 [&>button.absolute]:top-4 [&>button.absolute]:right-4"
      >
        <SheetTitle className="sr-only">Notificaciones</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  )
}
