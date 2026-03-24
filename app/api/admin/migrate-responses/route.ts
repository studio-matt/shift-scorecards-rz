import { NextResponse } from "next/server"
import { getDocuments, updateDocument, COLLECTIONS } from "@/lib/firebase"

// Allow both GET (for browser URL visit) and POST
export async function GET() {
  return runMigration()
}

export async function POST() {
  return runMigration()
}

async function runMigration() {
  try {
    // 1. Find the SHIFT REAL SCORECARD template
    const templates = await getDocuments(COLLECTIONS.TEMPLATES)
    const shiftReal = templates.find((t) => (t as { name?: string }).name === "SHIFT REAL SCORECARD")

    if (!shiftReal) {
      return NextResponse.json(
        { error: "Could not find template named 'SHIFT REAL SCORECARD'", templates: templates.map(t => ({ id: t.id, name: (t as { name?: string }).name })) },
        { status: 404 }
      )
    }

    const templateId = shiftReal.id
    console.log(`Found SHIFT REAL SCORECARD with ID: ${templateId}`)

    // 2. Get all responses
    const responses = await getDocuments(COLLECTIONS.RESPONSES)
    console.log(`Found ${responses.length} total responses`)

    // 3. Update each response that doesn't already point to this template
    let updateCount = 0
    const errors: string[] = []

    for (const response of responses) {
      const currentTemplateId = (response as { templateId?: string }).templateId
      if (currentTemplateId !== templateId) {
        try {
          await updateDocument(COLLECTIONS.RESPONSES, response.id, { templateId })
          updateCount++
        } catch (err) {
          errors.push(`Failed to update response ${response.id}: ${err}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updateCount} responses to use SHIFT REAL SCORECARD (ID: ${templateId})`,
      totalResponses: responses.length,
      updatedCount: updateCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Migration failed:", error)
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    )
  }
}
