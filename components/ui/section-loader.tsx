"use client"

import { cn } from "@/lib/utils"

interface SectionLoaderProps {
  className?: string
  minHeight?: string
}

/**
 * A simple clockwise spinning loader for individual dashboard sections.
 * Shows immediate feedback while data is loading.
 */
export function SectionLoader({ className, minHeight = "h-32" }: SectionLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", minHeight, className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
    </div>
  )
}

/**
 * Wrapper that shows content when loaded, or a spinner while loading.
 */
export function LoadingSection({ 
  loading, 
  children, 
  className,
  minHeight = "h-32"
}: { 
  loading: boolean
  children: React.ReactNode
  className?: string
  minHeight?: string
}) {
  if (loading) {
    return <SectionLoader className={className} minHeight={minHeight} />
  }
  return <>{children}</>
}
