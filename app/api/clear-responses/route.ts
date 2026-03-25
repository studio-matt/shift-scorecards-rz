import { NextResponse } from "next/server"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET() {
  return clearResponses()
}

export async function POST() {
  return clearResponses()
}

async function clearResponses() {
  try {
    const responsesSnapshot = await getDocs(collection(db, "responses"))
    
    let deleted = 0
    for (const docSnapshot of responsesSnapshot.docs) {
      await deleteDoc(doc(db, "responses", docSnapshot.id))
      deleted++
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted} response(s)`,
      deletedCount: deleted,
    })
  } catch (error) {
    console.error("Error clearing responses:", error)
    return NextResponse.json(
      { error: "Failed to clear responses", details: String(error) },
      { status: 500 }
    )
  }
}
