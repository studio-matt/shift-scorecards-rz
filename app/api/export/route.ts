import { NextResponse } from "next/server"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Collections to export
const COLLECTIONS = ["organizations", "users", "templates", "responses"]

export async function GET() {
  try {
    const backup: Record<string, Record<string, unknown>[]> = {}

    for (const collectionName of COLLECTIONS) {
      const snapshot = await getDocs(collection(db, collectionName))
      backup[collectionName] = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }))
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `firestore-backup-${timestamp}.json`

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: "Failed to export data", details: String(error) },
      { status: 500 }
    )
  }
}
