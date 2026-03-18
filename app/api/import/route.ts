import { NextRequest, NextResponse } from "next/server"
import { collection, doc, setDoc, getDocs, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Collections to import (order matters for foreign key relationships)
const COLLECTIONS = ["organizations", "templates", "users", "responses"]

// Convert date strings back to Firestore Timestamps
function convertDates(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && "seconds" in value && "nanoseconds" in value) {
      // It's a Firestore Timestamp object
      result[key] = new Timestamp(value.seconds as number, value.nanoseconds as number)
    } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      // It's an ISO date string
      result[key] = Timestamp.fromDate(new Date(value))
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = convertDates(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const wipeFirst = url.searchParams.get("wipe") === "true"

    const data = await request.json()

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid backup data" }, { status: 400 })
    }

    // Optionally wipe existing data first
    if (wipeFirst) {
      for (const collectionName of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, collectionName))
        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(doc(db, collectionName, docSnapshot.id))
        }
      }
    }

    // Import data
    const results: Record<string, number> = {}

    for (const collectionName of COLLECTIONS) {
      const docs = data[collectionName]
      if (!Array.isArray(docs)) continue

      let count = 0
      for (const docData of docs) {
        const { _id, ...rest } = docData
        if (!_id) continue

        const converted = convertDates(rest)
        await setDoc(doc(db, collectionName, _id), converted)
        count++
      }
      results[collectionName] = count
    }

    return NextResponse.json({
      success: true,
      message: wipeFirst ? "Data wiped and imported successfully" : "Data imported successfully",
      imported: results,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "Failed to import data", details: String(error) },
      { status: 500 }
    )
  }
}
