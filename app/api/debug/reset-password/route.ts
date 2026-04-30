import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/email-service"

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") || ""
  if (!auth.startsWith("Bearer ")) return false
  const token = auth.slice("Bearer ".length).trim()
  if (!token) return false
  const candidates = [
    process.env.DEBUG_SECRET,
    process.env.CRON_SECRET,
    process.env.BACKFILL_SECRET,
  ].filter((v): v is string => typeof v === "string" && v.length > 0)
  return candidates.includes(token)
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401)

  const body = (await req.json().catch(() => ({}))) as { email?: string }
  const email = String(body.email || "").trim().toLowerCase()
  if (!email || !email.includes("@")) {
    return json({ error: "Provide a valid email" }, 400)
  }

  // IMPORTANT: On App Hosting, `req.url` may be a `*.a.run.app` host even when
  // users hit our custom domain. Firebase Auth requires the continue URL domain to
  // be authorized, so use the canonical app URL instead of req.url.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard.envoydesign.com"
  const continueUrl = `${appUrl.replace(/\/$/, "")}/`

  const adminAuth = getAdminAuth()

  let resetLink: string | null = null
  let generateError: { code?: string; message?: string } | null = null
  try {
    resetLink = await adminAuth.generatePasswordResetLink(email, { url: continueUrl })
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    generateError = { code: err.code, message: err.message }
  }

  let sendResult: { success: boolean; error?: string } | null = null
  if (resetLink) {
    sendResult = await sendEmail({
      to: email,
      templateType: "password_reset",
      data: {
        "{{firstName}}": "there",
        "{{resetLink}}": resetLink,
      },
    })
  }

  return json({
    ok: true,
    email,
    generated: !!resetLink,
    generateError,
    sent: sendResult?.success ?? false,
    sendError: sendResult?.success ? null : sendResult?.error ?? null,
  })
}

