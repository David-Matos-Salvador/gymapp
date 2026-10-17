"use client"

import { useState } from "react"
import Image from "next/image"
import { Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExerciseImageProps {
  imageUrl?: string | null
  alt: string
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-20 w-20",
  lg: "h-48 w-full sm:w-64",
  xl: "h-64 w-full sm:w-80",
}

const iconSizes = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
}

export function ExerciseImage({ imageUrl, alt, className, size = "sm" }: ExerciseImageProps) {
  const [error, setError] = useState(false)

  if (!imageUrl || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted shrink-0",
          sizeClasses[size],
          className
        )}
      >
        <Dumbbell className={cn("text-muted-foreground/40", iconSizes[size])} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-muted",
        sizeClasses[size],
        className
      )}
    >
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setError(true)}
        unoptimized
      />
    </div>
  )
}
