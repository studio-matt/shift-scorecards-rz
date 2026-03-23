"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { createDocument, COLLECTIONS } from "@/lib/firebase"

const SHIFT_TEMPLATE = {
  name: "SHIFT REAL SCORECARD",
  description: "Production scorecard for measuring AI productivity and time savings",
  isActive: true,
  questions: [
    { id: "q1", text: "Your name:", type: "text", required: true },
    { id: "q2", text: "Your email:", type: "text", required: true },
    { id: "q3", text: "On average, how many emails do you write per day?", type: "number", required: true },
    { id: "q4", text: "How much time do you save per week using AI to draft, reply to, or manage emails?", type: "scale", min: 0, max: 10, minLabel: "0 min", maxLabel: "60+ min", required: true },
    { id: "q5", text: "Before AI, how many minutes did each email take to draft (on average)?", type: "number", required: true },
    { id: "q6", text: "After AI, how many minutes does each email take to draft (on average)?", type: "number", required: true },
    { id: "q7", text: "How many minutes do you spend editing AI-generated email drafts (on average)?", type: "number", required: true },
    { id: "q8", text: "On average, how many meetings do you attend each week?", type: "number", required: true },
    { id: "q9", text: "How much time do you save per week using AI to create meeting preparation & agendas?", type: "scale", min: 0, max: 10, minLabel: "0 min", maxLabel: "60+ min", required: true },
    { id: "q10", text: "How much time do you save per week using AI to create meeting follow up?", type: "scale", min: 0, max: 10, minLabel: "0 min", maxLabel: "60+ min", required: true },
    { id: "q11", text: "How much time do you save per week using AI to review documents, contracts, or reports?", type: "scale", min: 0, max: 10, minLabel: "0 min", maxLabel: "60+ min", required: true },
    { id: "q12", text: "How much time do you save per week using AI to prepare documents and deliverables?", type: "scale", min: 0, max: 10, minLabel: "0 min", maxLabel: "60+ min", required: true },
    { id: "q13", text: "How much time do you save per week using AI for research and data analysis?", type: "scale", min: 0, max: 10, minLabel: "0 min", maxLabel: "60+ min", required: true },
    { id: "q14", text: "How much time do you save per week using AI to summarize long documents or communication threads?", type: "scale", min: 0, max: 10, minLabel: "0 min", maxLabel: "60+ min", required: true },
    { id: "q15", text: "What's your biggest AI win this month?", type: "text", required: false },
    { id: "q16", text: "What's your next AI goal?", type: "text", required: false },
    { id: "q17", text: "Overall confidence in your AI ROI:", type: "scale", min: 1, max: 10, minLabel: "Not confident", maxLabel: "Very confident", required: true },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export default function CreateShiftTemplatePage() {
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleCreate() {
    setCreating(true)
    setResult(null)
    
    try {
      const docId = await createDocument(COLLECTIONS.TEMPLATES, SHIFT_TEMPLATE)
      setResult({
        type: "success",
        text: `Template created successfully! ID: ${docId}`,
      })
    } catch (error) {
      setResult({
        type: "error",
        text: `Failed to create template: ${error}`,
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create SHIFT REAL SCORECARD</CardTitle>
          <CardDescription>
            Create the production scorecard template with all 17 questions for measuring AI productivity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-2">Template Preview</h3>
            <p className="text-sm text-muted-foreground mb-2">{SHIFT_TEMPLATE.name}</p>
            <p className="text-xs text-muted-foreground">{SHIFT_TEMPLATE.questions.length} questions:</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1 max-h-48 overflow-y-auto">
              {SHIFT_TEMPLATE.questions.map((q, i) => (
                <li key={q.id} className="truncate">
                  {i + 1}. {q.text} <span className="text-muted-foreground/60">({q.type})</span>
                </li>
              ))}
            </ul>
          </div>

          {result && (
            <div
              className={`flex items-start gap-2 rounded-lg p-4 text-sm ${
                result.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-300"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <p>{result.text}</p>
            </div>
          )}

          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Template...
              </>
            ) : (
              "Create SHIFT REAL SCORECARD Template"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
