import { NextResponse } from "next/server"
import { getAdminAuth } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/email-service"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Prefer our own email provider (Resend) so we control deliverability + templates.
    // We still return a generic success response to avoid email enumeration.
    try {
      const origin = new URL(request.url).origin
      const continueUrl = `${origin}/`
      const adminAuth = getAdminAuth()

      const resetLink = await adminAuth.generatePasswordResetLink(normalizedEmail, {
        url: continueUrl,
      })

      // If the user exists, send a templated email via configured provider.
      const sendResult = await sendEmail({
        to: normalizedEmail,
        templateType: "password_reset",
        data: {
          "{{firstName}}": "there",
          "{{resetLink}}": resetLink,
        },
      })

      if (!sendResult.success) {
        console.error("[reset-password] Failed sending reset email:", sendResult.error)
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      console.error("[reset-password] Admin-link flow failed:", e?.code, e?.message, err)
    }

    return NextResponse.json({ 
      success: true,
      message: "If an account exists with this email, a password reset link has been sent."
    })
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    console.error("[reset-password] Password reset error:", e?.code, e?.message, error)
    
    // Don't reveal if email exists or not for security
    // Always return success to prevent email enumeration
    return NextResponse.json({ 
      success: true,
      message: "If an account exists with this email, a password reset link has been sent."
    })
  }
}
