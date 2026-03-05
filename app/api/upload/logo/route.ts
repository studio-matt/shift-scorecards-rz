import { put, del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const orgId = formData.get("orgId") as string
    const previousUrl = formData.get("previousUrl") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 })
    }

    // Delete old logo if replacing
    if (previousUrl) {
      try {
        await del(previousUrl)
      } catch {
        // Ignore delete errors for old files
      }
    }

    const blob = await put(`logos/${orgId}/${file.name}`, file, {
      access: "public",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Logo upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
