"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Eye,
  EyeOff,
  Hand,
  Trophy,
  Star,
  Sparkles,
  Send,
  X,
} from "lucide-react"
import type { TopPerformer } from "@/lib/types"
import { COLLECTIONS, setDocument, getDocuments } from "@/lib/firestore"
import { Timestamp } from "firebase/firestore"

// ── Privacy helpers ──────────────────────────────────────────────────
function anonymizeName(name: string): string {
  const parts = name.split(" ")
  if (parts.length < 2) return `${name.charAt(0)}***`
  return `${parts[0].charAt(0)}. ${parts[parts.length - 1].charAt(0)}.`
}

// ── High Five type ──────────────────────────────────────────────────
export interface HighFive {
  id: string
  fromName: string
  toUserId: string
  toName: string
  message: string
  createdAt: string
}

// ── MVP Spotlight (Top 5 in Organization) ────────────────────────────────────
export function MVPSpotlight({ performer, topPerformers = [] }: { performer: TopPerformer | null; topPerformers?: TopPerformer[] }) {
  // Show top 5 performers
  const top5 = topPerformers.slice(0, 5)
  
  if (!performer && top5.length === 0) return null
  
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      <CardContent className="relative p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">This Month{"'"}s Top Performers</p>
          </div>
        </div>
        
        {/* Top 5 List */}
        <div className="flex flex-col gap-3">
          {top5.map((p, index) => (
            <div 
              key={p.id} 
              className={`rounded-lg border p-3 ${index === 0 ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card/50"}`}
            >
              <div className="flex items-start gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index === 0
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : index === 1
                      ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      : index === 2
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-muted text-muted-foreground"
                }`}>
                  {index + 1}
                </span>
                <Avatar className={`h-10 w-10 shrink-0 ${index === 0 ? "border-2 border-primary/20" : ""}`}>
                  <AvatarFallback className={`text-sm font-bold ${index === 0 ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard?viewUser=${p.id}`} className="text-sm font-semibold text-foreground">
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {p.department}
                  </p>
                  
                  {/* Goal */}
                  {p.goalNarrative && (
                    <div className="mt-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-0.5">Goal</p>
                      <p className="text-xs text-foreground leading-snug">{p.goalNarrative}</p>
                    </div>
                  )}
                  
                  {/* Win */}
                  {p.winNarrative && (
                    <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-0.5">Win</p>
                      <p className="text-xs text-foreground leading-snug italic">"{p.winNarrative}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {top5.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No top performers data available yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── High Five Section ────────────────────────────────────────────────
export function HighFiveSection({
  performers,
  currentUserName,
}: {
  performers: TopPerformer[]
  currentUserName: string
}) {
  const [highFives, setHighFives] = useState<HighFive[]>([])
  const [sending, setSending] = useState<string | null>(null) // userId being high-fived
  const [message, setMessage] = useState("")
  const [loadedFives, setLoadedFives] = useState(false)

  const loadHighFives = useCallback(async () => {
    if (loadedFives) return
    try {
      const docs = await getDocuments(COLLECTIONS.SETTINGS)
      const fiveDoc = docs.find((d) => d.id === "highFives") as Record<string, unknown> | undefined
      if (fiveDoc && Array.isArray(fiveDoc.items)) {
        setHighFives(fiveDoc.items as HighFive[])
      }
    } catch {
      // fail silently
    }
    setLoadedFives(true)
  }, [loadedFives])

  // Load on mount
  useEffect(() => { loadHighFives() }, [loadHighFives])

  async function sendHighFive(toPerformer: TopPerformer) {
    if (!message.trim()) return
    const newFive: HighFive = {
      id: `hf-${Date.now()}`,
      fromName: currentUserName || "Anonymous",
      toUserId: toPerformer.id,
      toName: toPerformer.name,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    }
    const updated = [newFive, ...highFives].slice(0, 50) // Keep last 50
    setHighFives(updated)
    setSending(null)
    setMessage("")
    try {
      await setDocument(COLLECTIONS.SETTINGS, "highFives", { items: updated, updatedAt: Timestamp.now() })
    } catch {
      // fail silently
    }
  }

  const recentFives = highFives.slice(0, 6)

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Hand className="h-4 w-4 text-amber-400" />
          High Fives
        </CardTitle>
        <p className="text-xs text-muted-foreground">Give recognition to your colleagues</p>
      </CardHeader>
      <CardContent className="relative">
        {/* Quick send buttons */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {performers.slice(0, 8).map((p) => (
            <button
              key={p.id}
              onClick={() => setSending(sending === p.id ? null : p.id)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                sending === p.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Hand className="h-3 w-3" />
              {p.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Send form */}
        {sending && (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">
                High five to {performers.find((p) => p.id === sending)?.name}
              </p>
              <button onClick={() => { setSending(null); setMessage("") }}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="What did they do great?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const p = performers.find((p) => p.id === sending)
                    if (p) sendHighFive(p)
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  const p = performers.find((p) => p.id === sending)
                  if (p) sendHighFive(p)
                }}
                disabled={!message.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Recent high fives */}
        {recentFives.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">No high fives yet. Be the first!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentFives.map((hf) => (
              <div key={hf.id} className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
                <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{hf.fromName}</span>
                    {" gave "}<span className="font-semibold">{hf.toName}</span>{" a high five"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground italic">{`"${hf.message}"`}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Leaderboard ─────────────────────────────────────────────────
interface TopPerformersProps {
  showCompany?: boolean
  data: TopPerformer[]
}

export function TopPerformers({ showCompany = false, data }: TopPerformersProps) {
  const [showNames, setShowNames] = useState(false)

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Leaderboard
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {showCompany ? "Top Performers Across All Companies" : "Top Performers This Week"}
            </p>
          </div>
          <button
            onClick={() => setShowNames(!showNames)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            title={showNames ? "Hide names for privacy" : "Show full names"}
          >
            {showNames ? (
              <><EyeOff className="h-3.5 w-3.5" /> Hide Names</>
            ) : (
              <><Eye className="h-3.5 w-3.5" /> Show Names</>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col gap-3">
          {data.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No performers match the current filters
            </p>
          )}
          {data.map((performer, index) => {
            const displayName = showNames ? performer.name : anonymizeName(performer.name)
            const initials = performer.name.split(" ").map((n) => n[0]).join("")
            const isTop3 = index < 3
            return (
              <div
                key={performer.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  isTop3
                    ? "border-primary/20 bg-primary/5"
                    : "border-border"
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index === 0
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : index === 1
                      ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      : index === 2
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-primary/10 text-primary"
                }`}>
                  {index + 1}
                </span>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={`text-xs font-medium ${isTop3 ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
                    {showNames ? initials : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard?viewUser=${performer.id}`} className="text-sm font-medium text-foreground">
                    {displayName}
                  </Link>
                  {showCompany ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {performer.company} &middot; {performer.department}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {performer.department}
                    </p>
                  )}
                  {/* Win narrative inline for top 3 */}
                  {isTop3 && performer.winNarrative && (
                    <p className="mt-1 text-[11px] italic leading-snug text-muted-foreground">
                      {`"${performer.winNarrative}"`}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">
                    {performer.avgScore}
                  </p>
                  <p className="text-xs text-muted-foreground">Hrs Saved</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {performer.streak} wk streak
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
