"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col items-center space-y-4 pt-2 pb-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2 flex flex-col items-center">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="w-full max-w-xs pt-2">
          <div className="flex justify-between mb-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Info card skeletons */}
      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-48 mt-1" />
        </CardHeader>
        <CardContent className="p-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit form skeleton */}
      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-44 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-8 w-[140px] rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Actions skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
