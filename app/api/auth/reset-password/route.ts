import { NextResponse } from "next/server"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Send password reset email via Firebase Auth
    // Firebase handles the email sending and reset link generation
    await sendPasswordResetEmail(auth, email)

    return NextResponse.json({ 
      success: true,
      message: "If an account exists with this email, a password reset link has been sent."
    })
  } catch (error: unknown) {
    console.error("Password reset error:", error)
    
    // Don't reveal if email exists or not for security
    // Always return success to prevent email enumeration
    return NextResponse.json({ 
      success: true,
      message: "If an account exists with this email, a password reset link has been sent."
    })
  }
}
