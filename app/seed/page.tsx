"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function SeedPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [force, setForce] = useState(false)

  async function handleSeed() {
    setStatus("loading")
    setMessage("")
    try {
      const url = force ? "/api/seed?force=true" : "/api/seed"
      const res = await fetch(url, { method: "POST" })
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
            Populate Firestore with 3 organizations (Acme Corp, Envoy Design, Initech LLC),
            15 fake employees, 3 scorecard templates, 3 releases, and 45 scorecard responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="force"
              checked={force}
              onCheckedChange={(v) => setForce(v === true)}
            />
            <Label htmlFor="force" className="text-sm font-normal">
              Force re-seed (wipes existing data first)
            </Label>
          </div>
          <Button onClick={handleSeed} disabled={status === "loading"}>
            {status === "loading" ? "Seeding... this may take a moment" : "Seed Firestore"}
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
