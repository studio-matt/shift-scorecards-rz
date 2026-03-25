"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function SeedPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    template?: string
    weekOf?: string
    createdFor?: string[]
    skippedCount?: number
    error?: string
  } | null>(null)

  async function handleSeed() {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/seed-test-responses", {
        method: "POST",
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Seed Test Responses</CardTitle>
          <CardDescription>
            Create test scorecard responses for all users in the system who
            don&apos;t already have a response for the current week.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSeed} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Seeding..." : "Generate Test Responses"}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {result.success ? "Success" : "Error"}
              </AlertTitle>
              <AlertDescription>
                {result.message || result.error}
                {result.success && result.createdFor && result.createdFor.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Created responses for:</p>
                    <ul className="list-disc list-inside mt-1">
                      {result.createdFor.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.success && result.skippedCount !== undefined && result.skippedCount > 0 && (
                  <p className="mt-2 text-muted-foreground">
                    Skipped {result.skippedCount} user(s) who already had responses.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
