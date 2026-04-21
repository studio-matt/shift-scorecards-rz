import { NextRequest, NextResponse } from "next/server"
import { deleteUserFromAuth, deleteUserFromAuthByUid } from "@/lib/firebase-admin"
import { deleteDocument, getDocument, COLLECTIONS } from "@/lib/firestore"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, authId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // First, try to get the user document to find their email/authId if not provided
    let userEmail = email
    let userAuthId = authId
    
    if (!userEmail && !userAuthId) {
      try {
        const userDoc = await getDocument(COLLECTIONS.USERS, userId)
        if (userDoc) {
          const userData = userDoc as Record<string, unknown>
          userEmail = userData.email as string
          userAuthId = userData.authId as string
        }
      } catch (e) {
        console.error("Could not fetch user document:", e)
      }
    }

    // Delete from Firebase Auth (try by authId first, then by email)
    let authDeleteResult = { success: true }
    
    if (userAuthId) {
      authDeleteResult = await deleteUserFromAuthByUid(userAuthId)
    } else if (userEmail) {
      authDeleteResult = await deleteUserFromAuth(userEmail)
    }

    if (!authDeleteResult.success) {
      console.error("Failed to delete from Firebase Auth:", authDeleteResult.error)
      // Continue to delete from Firestore anyway
    }

    // Delete from Firestore
    try {
      await deleteDocument(COLLECTIONS.USERS, userId)
    } catch (e) {
      console.error("Failed to delete from Firestore:", e)
      return NextResponse.json(
        { 
          error: "Failed to delete user from database",
          authDeleted: authDeleteResult.success
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      authDeleted: authDeleteResult.success,
      firestoreDeleted: true,
    })

  } catch (error) {
    console.error("Error in delete-user API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Also support DELETE method
export async function DELETE(request: NextRequest) {
  return POST(request)
}
