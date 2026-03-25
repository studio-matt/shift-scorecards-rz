import { NextResponse } from "next/server"
import { getDocuments, updateDocument, COLLECTIONS } from "@/lib/firestore"

// Migration API - Allow both GET (for browser URL visit) and POST
export async function GET() {
  return runMigration()
}

export async function POST() {
  return runMigration()
}

async function runMigration() {
  try {
    // Find the SHIFT REAL SCORECARD template
    const templates = await getDocuments(COLLECTIONS.TEMPLATES)
    const shiftTemplate = templates.find(
      (t) => (t as { name?: string }).name === "SHIFT REAL SCORECARD"
    )

    if (!shiftTemplate) {
      return NextResponse.json(
        { error: "SHIFT REAL SCORECARD template not found" },
        { status: 404 }
      )
    }

    // Get all responses
    const responses = await getDocuments(COLLECTIONS.RESPONSES)

    // Update each response to point to the SHIFT REAL SCORECARD template
    let updatedCount = 0
    for (const response of responses) {
      const currentTemplateId = (response as { templateId?: string }).templateId
      if (currentTemplateId !== shiftTemplate.id) {
        await updateDocument(COLLECTIONS.RESPONSES, response.id, {
          templateId: shiftTemplate.id,
        })
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migrated ${updatedCount} responses to SHIFT REAL SCORECARD template`,
      templateId: shiftTemplate.id,
      totalResponses: responses.length,
      updatedResponses: updatedCount,
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    )
  }
}
