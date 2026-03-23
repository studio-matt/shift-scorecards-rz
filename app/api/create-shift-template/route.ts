import { NextResponse } from "next/server"
import { doc, setDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const SHIFT_REAL_SCORECARD = {
  id: "tmpl-shift-real",
  name: "SHIFT REAL SCORECARD",
  description: "Comprehensive AI productivity and time savings assessment for measuring real ROI",
  status: "active",
  version: "V1.0",
  questionCount: 17,
  questions: [
    // Identity fields
    { id: "sr1", text: "Your name", type: "text", order: 1 },
    { id: "sr2", text: "Your email", type: "text", order: 2 },
    
    // Email productivity
    { id: "sr3", text: "On average, how many emails do you write per day?", type: "number", order: 3 },
    { id: "sr4", text: "How much time do you save per week using AI to draft, reply to, or manage emails?", type: "scale", min: 0, max: 10, order: 4, scaleLabels: { 0: "0 min", 5: "30 min", 10: "60+ min" } },
    { id: "sr5", text: "Before AI, how many minutes did each email take to draft (on average)?", type: "number", order: 5 },
    { id: "sr6", text: "After AI, how many minutes does each email take to draft (on average)?", type: "number", order: 6 },
    { id: "sr7", text: "How many minutes do you spend editing AI-generated email drafts (on average)?", type: "number", order: 7 },
    
    // Meeting productivity
    { id: "sr8", text: "On average, how many meetings do you attend each week?", type: "number", order: 8 },
    { id: "sr9", text: "How much time do you save per week using AI to create meeting preparation & agendas?", type: "scale", min: 0, max: 10, order: 9, scaleLabels: { 0: "0 min", 5: "30 min", 10: "60+ min" } },
    { id: "sr10", text: "How much time do you save per week using AI to create meeting follow up?", type: "scale", min: 0, max: 10, order: 10, scaleLabels: { 0: "0 min", 5: "30 min", 10: "60+ min" } },
    
    // Document & research productivity
    { id: "sr11", text: "How much time do you save per week using AI to review documents, contracts, or reports?", type: "scale", min: 0, max: 10, order: 11, scaleLabels: { 0: "0 min", 5: "30 min", 10: "60+ min" } },
    { id: "sr12", text: "How much time do you save per week using AI to prepare documents and deliverables?", type: "scale", min: 0, max: 10, order: 12, scaleLabels: { 0: "0 min", 5: "30 min", 10: "60+ min" } },
    { id: "sr13", text: "How much time do you save per week using AI for research and data analysis?", type: "scale", min: 0, max: 10, order: 13, scaleLabels: { 0: "0 min", 5: "30 min", 10: "60+ min" } },
    { id: "sr14", text: "How much time do you save per week using AI to summarize long documents or communication threads?", type: "scale", min: 0, max: 10, order: 14, scaleLabels: { 0: "0 min", 5: "30 min", 10: "60+ min" } },
    
    // Qualitative
    { id: "sr15", text: "What's your biggest AI win this month?", type: "text", order: 15 },
    { id: "sr16", text: "What's your next AI goal?", type: "text", order: 16 },
    
    // Overall confidence
    { id: "sr17", text: "Overall confidence in your AI ROI", type: "scale", min: 1, max: 10, order: 17 },
  ],
}

export async function POST() {
  try {
    const templateRef = doc(db, "templates", SHIFT_REAL_SCORECARD.id)
    await setDoc(templateRef, {
      ...SHIFT_REAL_SCORECARD,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({
      success: true,
      message: "SHIFT REAL SCORECARD template created successfully",
      templateId: SHIFT_REAL_SCORECARD.id,
    })
  } catch (error) {
    console.error("Failed to create template:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to create the SHIFT REAL SCORECARD template",
    template: SHIFT_REAL_SCORECARD,
  })
}
