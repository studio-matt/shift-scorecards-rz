"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Building2, Sparkles, TrendingUp, Lightbulb } from "lucide-react"

// ── The 25 Reasons Why ─────────────────────────────────────────────────
// Philosophical foundation for why someone should care about building AI capability
export const REASONS_WHY = [
  "AI won't replace you. Someone using AI will.",
  "The best time to build AI fluency was yesterday. The second best time is now.",
  "Your expertise + AI = exponential impact.",
  "AI is a tool. Mastery is a choice.",
  "The future belongs to the AI-augmented professional.",
  "Every hour saved is an hour invested in what matters most.",
  "AI doesn't take jobs. It transforms them.",
  "Your competitive advantage is your ability to learn.",
  "The gap between AI-fluent and AI-resistant grows daily.",
  "AI multiplies human potential. It doesn't replace it.",
  "The organizations that win will be the ones that adapt.",
  "Your AI journey is your career insurance policy.",
  "Small improvements compound into massive advantages.",
  "AI capability is the new literacy.",
  "The best professionals will be those who can work with AI, not against it.",
  "Your value isn't in what you know. It's in how you apply it.",
  "AI handles the routine so you can focus on the remarkable.",
  "The future is human + machine, not human versus machine.",
  "Building AI capability is investing in your future self.",
  "The question isn't whether to use AI. It's how well you'll use it.",
  "AI is the great equalizer. Talent + AI beats pedigree alone.",
  "Your mindset about AI determines your trajectory.",
  "Every interaction with AI is a learning opportunity.",
  "The professionals who embrace AI will lead their fields.",
  "AI capability compounds. Start today, lead tomorrow.",
]

export function ReasonWhyBanner({ className = "" }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Start with a random reason
    setCurrentIndex(Math.floor(Math.random() * REASONS_WHY.length))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % REASONS_WHY.length)
        setIsVisible(true)
      }, 300)
    }, 8000) // Rotate every 8 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
      <p
        className={`text-sm font-medium text-muted-foreground italic transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        "{REASONS_WHY[currentIndex]}"
      </p>
    </div>
  )
}

export function WhyThisMattersCard() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * REASONS_WHY.length))
  }, [])

  const nextReason = () => {
    setCurrentIndex((prev) => (prev + 1) % REASONS_WHY.length)
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
              "{REASONS_WHY[currentIndex]}"
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
}: {
  totalProfessionals: number
  totalOrganizations: number
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WhyThisMattersCard />
      <MovementCounter
        totalProfessionals={totalProfessionals}
        totalOrganizations={totalOrganizations}
        thisMonth
      />
    </div>
  )
}
