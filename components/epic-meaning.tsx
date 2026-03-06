"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Sparkles, Lightbulb } from "lucide-react"
import { DEFAULT_REASONS_WHY } from "@/lib/prompt-settings"

// Re-export for backward compatibility
export const REASONS_WHY = DEFAULT_REASONS_WHY

export function ReasonWhyBanner({ 
  className = "",
  reasons,
}: { 
  className?: string
  reasons?: string[]
}) {
  const reasonsList = reasons && reasons.length > 0 ? reasons : DEFAULT_REASONS_WHY
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Start with a random reason
    setCurrentIndex(Math.floor(Math.random() * reasonsList.length))
  }, [reasonsList.length])

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % reasonsList.length)
        setIsVisible(true)
      }, 300)
    }, 8000) // Rotate every 8 seconds

    return () => clearInterval(interval)
  }, [reasonsList.length])

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
      <p
        className={`text-sm font-medium text-muted-foreground italic transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        "{reasonsList[currentIndex]}"
      </p>
    </div>
  )
}

export function WhyThisMattersCard({ reasons }: { reasons?: string[] }) {
  const reasonsList = reasons && reasons.length > 0 ? reasons : DEFAULT_REASONS_WHY
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * reasonsList.length))
  }, [reasonsList.length])

  const nextReason = () => {
    setCurrentIndex((prev) => (prev + 1) % reasonsList.length)
  }

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card/80 to-card/80">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <CardContent className="relative p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              Why This Matters
            </p>
            <p className="mt-1 text-base font-medium text-foreground leading-relaxed">
              "{reasonsList[currentIndex]}"
            </p>
            <button
              onClick={nextReason}
              className="mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Show another →
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Movement Counter ───────────────────────────────────────────────────
// Shows the collective impact to make each scorecard feel like a contribution
export function MovementCounter({
  totalProfessionals,
  totalOrganizations,
  thisMonth = true,
  variant = "default",
}: {
  totalProfessionals: number
  totalOrganizations: number
  thisMonth?: boolean
  variant?: "default" | "compact" | "hero"
}) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5 text-primary" />
        <span>
          <span className="font-semibold text-foreground">{totalProfessionals.toLocaleString()}</span>
          {" professionals across "}
          <span className="font-semibold text-foreground">{totalOrganizations}</span>
          {" organizations"}
          {thisMonth && " this month"}
        </span>
      </div>
    )
  }

  if (variant === "hero") {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-primary mb-3">
          Join the Movement
        </p>
        <div className="flex items-center justify-center gap-8">
          <div>
            <p className="text-4xl font-bold text-foreground">{totalProfessionals.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">professionals</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div>
            <p className="text-4xl font-bold text-foreground">{totalOrganizations}</p>
            <p className="text-sm text-muted-foreground">organizations</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          building their AI capability {thisMonth ? "this month" : ""}
        </p>
      </div>
    )
  }

  // Default card variant
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-transparent" />
      <CardContent className="relative flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan/15 ring-1 ring-cyan/20">
          <Users className="h-6 w-6 text-cyan" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            The Movement
          </p>
          <p className="text-lg font-semibold text-foreground">
            <span className="text-2xl font-bold">{totalProfessionals.toLocaleString()}</span>
            {" professionals"}
          </p>
          <p className="text-sm text-muted-foreground">
            across <span className="font-semibold text-foreground">{totalOrganizations}</span> organizations
            {thisMonth && " are building AI capability this month"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Combined Epic Meaning Section ──────────────────────────────────────
export function EpicMeaningSection({
  totalProfessionals,
  totalOrganizations,
  reasons,
}: {
  totalProfessionals: number
  totalOrganizations: number
  reasons?: string[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WhyThisMattersCard reasons={reasons} />
      <MovementCounter
        totalProfessionals={totalProfessionals}
        totalOrganizations={totalOrganizations}
        thisMonth
      />
    </div>
  )
}
