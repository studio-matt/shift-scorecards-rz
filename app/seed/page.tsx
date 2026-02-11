"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function SeedPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSeed() {
    setStatus("loading")
    setMessage("")
    try {
      const res = await fetch("/api/seed", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setMessage(data.message)
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to seed")
      }
    } catch (err: unknown) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Network error")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Seed Database</CardTitle>
          <CardDescription>
            Populate Firestore with initial organizations and scorecard templates.
            This only runs once -- if data already exists it will skip.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleSeed} disabled={status === "loading"}>
            {status === "loading" ? "Seeding..." : "Seed Firestore"}
          </Button>
          {status === "success" && (
            <div className="rounded-md bg-success/10 p-3 text-sm text-success">
              {message}
            </div>
          )}
          {status === "error" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {message}
            </div>
          )}
          {status === "success" && (
            <a href="/" className="text-sm font-medium text-primary hover:underline">
              Go to Login
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
