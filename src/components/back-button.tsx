"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function BackButton({ href, label }: { href?: string; label?: string }) {
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (href) {
          router.push(href)
        } else {
          router.back()
        }
      }}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      {label || "Volver"}
    </Button>
  )
}
