"use client"

import { cn } from "@/lib/utils"

interface ConfidenceDotsProps {
  /** Value from 0-10 (or 0-100 if using percentage scale) */
  value: number
  /** Maximum value for scaling (default 10) */
  max?: number
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Color variant */
  variant?: "primary" | "cyan" | "emerald" | "amber" | "gradient"
  /** Show numeric label */
  showLabel?: boolean
  /** Custom class name */
  className?: string
}

const sizeClasses = {
  sm: "h-1.5 w-1.5 gap-1",
  md: "h-2 w-2 gap-1.5",
  lg: "h-2.5 w-2.5 gap-2",
}

const filledClasses = {
  primary: "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]",
  cyan: "bg-cyan shadow-[0_0_6px_hsl(var(--cyan)/0.5)]",
  emerald: "bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153/0.5)]",
  amber: "bg-amber-400 shadow-[0_0_6px_rgb(251_191_36/0.5)]",
  gradient: "bg-gradient-to-r from-primary to-cyan shadow-[0_0_6px_hsl(var(--primary)/0.4)]",
}

const emptyClasses = "bg-muted-foreground/20"

export function ConfidenceDots({
  value,
  max = 10,
  size = "md",
  variant = "primary",
  showLabel = false,
  className,
}: ConfidenceDotsProps) {
  // Normalize value to 0-10 scale
  const normalizedValue = Math.min(Math.max((value / max) * 10, 0), 10)
  const filledCount = Math.round(normalizedValue)

  const dotSize = sizeClasses[size].split(" ").slice(0, 2).join(" ")
  const gapSize = sizeClasses[size].split(" ")[2]

  return (
    <div className={cn("flex items-center", gapSize, className)}>
      <div className={cn("flex items-center", gapSize)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-300",
              dotSize,
              i < filledCount ? filledClasses[variant] : emptyClasses
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-medium text-muted-foreground tabular-nums">
          {value.toFixed(1)}/{max}
        </span>
      )}
    </div>
  )
}

/** Inline confidence display with label */
export function ConfidenceDisplay({
  label,
  value,
  max = 10,
  size = "md",
  variant = "primary",
  className,
}: ConfidenceDotsProps & { label: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <ConfidenceDots value={value} max={max} size={size} variant={variant} />
        <span className="min-w-[2.5rem] text-right text-sm font-semibold tabular-nums">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

/** Compact score badge with dots */
export function ConfidenceBadge({
  value,
  max = 10,
  variant = "primary",
  className,
}: Omit<ConfidenceDotsProps, "size" | "showLabel">) {
  const normalizedValue = Math.min(Math.max((value / max) * 10, 0), 10)
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1.5 backdrop-blur-sm",
        className
      )}
    >
      <span className="text-sm font-bold tabular-nums">{value.toFixed(1)}</span>
      <ConfidenceDots value={normalizedValue} max={10} size="sm" variant={variant} />
    </div>
  )
}
