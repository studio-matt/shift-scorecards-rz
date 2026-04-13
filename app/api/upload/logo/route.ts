import { type NextRequest, NextResponse } from "next/server"
import { uploadOrgLogo, deleteFile } from "@/lib/storage"

// Accepted image types
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const orgId = formData.get("orgId") as string
    const previousUrl = formData.get("previousUrl") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!orgId) {
      return NextResponse.json({ error: "No organization ID provided" }, { status: 400 })
    }

    // Check file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be PNG, JPG, GIF, or WEBP" },
        { status: 400 }
      )
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 })
    }

    // Delete old logo if replacing (best effort - don't fail if this errors)
    if (previousUrl) {
      try {
        // Extract path from Firebase Storage URL if it's a Firebase URL
        const match = previousUrl.match(/logos%2F[^?]+/)
        if (match) {
          const path = decodeURIComponent(match[0])
          await deleteFile(path)
        }
      } catch {
        // Ignore delete errors for old files
        console.log("Could not delete previous logo, continuing with upload")
      }
    }

    // Upload to Firebase Storage
    const url = await uploadOrgLogo(orgId, file)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Logo upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
