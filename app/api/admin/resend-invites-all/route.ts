import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { Resend } from "resend"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { getEmailSettings, getEmailTemplate, replacePlaceholders } from "@/lib/email-service"
import type { EmailTemplateType } from "@/lib/types"

async function verifyAnyAdminOrServerSecret(request: Request): Promise<{ authorized: boolean; reason?: string }> {
  try {
    const auth = getAdminAuth()
    const header = request.headers.get("authorization") || ""
    if (header.toLowerCase().startsWith("bearer ")) {
      const token = header.slice("bearer ".length).trim()
      if (token) {
        const serverSecrets = [
          process.env.DEBUG_SECRET,
          process.env.CRON_SECRET,
          process.env.BACKFILL_SECRET,
        ].filter((v): v is string => typeof v === "string" && v.length > 0)
        if (serverSecrets.includes(token)) return { authorized: true }

        try {
          const decoded = await auth.verifyIdToken(token, true)
          const uid = decoded.uid
          if (!uid) return { authorized: false, reason: "Invalid bearer token" }

          const db = getAdminDb()
          const profile = await db.collection("userProfiles").doc(uid).get()
          const role = profile.exists ? (profile.data()?.role as string | undefined) : undefined
          if (role === "admin" || role === "company_admin") return { authorized: true }

          const u = await db.collection("users").where("authId", "==", uid).limit(1).get()
          if (!u.empty) {
            const uRole = u.docs[0].data()?.role as string | undefined
            if (uRole === "admin" || uRole === "company_admin") return { authorized: true }
            return { authorized: false, reason: `Role is "${uRole}", not an admin role` }
          }
          return { authorized: false, reason: "User not found in userProfiles or users" }
        } catch (e) {
          return { authorized: false, reason: `Invalid bearer token: ${String(e)}` }
        }
      }
    }

    // Session cookie fallback
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("firebase-session")?.value
    if (!sessionCookie) return { authorized: false, reason: "No auth token provided" }
    const decoded = await auth.verifySessionCookie(sessionCookie, true)
    const uid = decoded.uid
    if (!uid) return { authorized: false, reason: "Invalid session cookie" }

    const db = getAdminDb()
    const profile = await db.collection("userProfiles").doc(uid).get()
    const role = profile.exists ? (profile.data()?.role as string | undefined) : undefined
    if (role === "admin" || role === "company_admin") return { authorized: true }

    return { authorized: false, reason: "Not an admin role" }
  } catch (e) {
    return { authorized: false, reason: `Auth error: ${String(e)}` }
  }
}

const TEMPLATE: EmailTemplateType = "member_invitation"

type PendingUserRow = {
  authId?: string
  email?: string
  organizationId?: string
  createdAt?: unknown
}

function isValidEmail(email: string): boolean {
  return email.includes("@") && email.length >= 5
}

/**
 * Bulk resend invite emails for "pending" users (users with no authId) across orgs.
 *
 * Safeties:
 * - hard caps on scanned docs + recipients per org
 * - optional sinceIso filter (best-effort)
 * - optional dryRun
 *
 * Body:
 * - sinceIso?: string
 * - limitPerOrg?: number (default 100; max 500)
 * - maxOrgs?: number (default 50; max 200)
 * - scanLimit?: number (default 5000; max 20000)  // how many user docs to scan
 * - dryRun?: boolean (default false)
 * - includeOrgIds?: string[] (optional allowlist)
 * - excludeOrgIds?: string[] (optional blocklist)
 */
export async function POST(request: Request) {
  const authz = await verifyAnyAdminOrServerSecret(request)
  if (!authz.authorized) {
    return NextResponse.json(
      { error: "Forbidden - admin access required", reason: authz.reason },
      { status: 403 },
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      sinceIso?: string
      limitPerOrg?: number
      maxOrgs?: number
      scanLimit?: number
      dryRun?: boolean
      includeOrgIds?: string[]
      excludeOrgIds?: string[]
    }

    const sinceIso = typeof body.sinceIso === "string" ? body.sinceIso : undefined
    const sinceMs = sinceIso ? Date.parse(sinceIso) : NaN
    const dryRun = Boolean(body.dryRun)

    const limitPerOrg = Math.min(Math.max(Number(body.limitPerOrg || 100), 1), 500)
    const maxOrgs = Math.min(Math.max(Number(body.maxOrgs || 50), 1), 200)
    const scanLimit = Math.min(Math.max(Number(body.scanLimit || 5000), 1), 20000)

    const includeOrgIds = new Set(Array.isArray(body.includeOrgIds) ? body.includeOrgIds.filter(Boolean) : [])
    const excludeOrgIds = new Set(Array.isArray(body.excludeOrgIds) ? body.excludeOrgIds.filter(Boolean) : [])

    const db = getAdminDb()

    // Load organizations map (id -> name)
    const orgsSnap = await db.collection("organizations").get()
    const orgNameById = new Map<string, string>()
    for (const d of orgsSnap.docs) {
      orgNameById.set(d.id, String(d.data()?.name || "").trim() || d.id)
    }

    // Scan users (bounded)
    const usersSnap = await db.collection("users").limit(scanLimit).get()
    const byOrg = new Map<string, Set<string>>() // orgId -> emails
    let pendingRowsSeen = 0
    let pendingRowsMatchedSince = 0

    for (const d of usersSnap.docs) {
      const data = d.data() as PendingUserRow
      if (data.authId) continue
      const email = String(data.email || "").trim().toLowerCase()
      if (!isValidEmail(email)) continue

      const orgId = String(data.organizationId || "").trim()
      if (!orgId) continue
      if (excludeOrgIds.has(orgId)) continue
      if (includeOrgIds.size > 0 && !includeOrgIds.has(orgId)) continue

      pendingRowsSeen++

      if (sinceIso && !Number.isNaN(sinceMs)) {
        const created = data.createdAt as { toDate?: () => Date } | string | undefined
        const createdMs =
          typeof created === "string"
            ? Date.parse(created)
            : created && typeof created === "object" && typeof created.toDate === "function"
              ? created.toDate().getTime()
              : NaN
        if (!Number.isNaN(createdMs) && createdMs < sinceMs) continue
      }
      pendingRowsMatchedSince++

      const set = byOrg.get(orgId) || new Set<string>()
      if (set.size < limitPerOrg) set.add(email)
      byOrg.set(orgId, set)
    }

    const orgEntries = Array.from(byOrg.entries())
      .map(([orgId, emails]) => ({ orgId, emails: Array.from(emails) }))
      .sort((a, b) => b.emails.length - a.emails.length)
      .slice(0, maxOrgs)

    const settings = await getEmailSettings()
    if (!settings?.enabled) {
      return NextResponse.json({ error: "Email is not configured or disabled" }, { status: 400 })
    }
    const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 })

    const fromEmail = settings.fromEmail && settings.fromEmail.includes("@") ? settings.fromEmail : ""
    const fromName = settings.fromName || "Shift Scorecards"
    if (!fromEmail) return NextResponse.json({ error: "From email not configured" }, { status: 500 })

    const template = await getEmailTemplate(TEMPLATE)
    if (!template.enabled) {
      return NextResponse.json({ error: `Template "${TEMPLATE}" is disabled` }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard.envoydesign.com"
    const resend = new Resend(apiKey)
    const BATCH_SIZE = 100

    const perOrgResults: Array<{
      organizationId: string
      organizationName: string | null
      uniqueEmails: number
      sent: number
      failed: number
      errors: string[]
    }> = []

    let totalSent = 0
    let totalFailed = 0

    for (const entry of orgEntries) {
      const organizationName = orgNameById.get(entry.orgId) || null

      const subject = await replacePlaceholders(template.subject, {
        "{{organizationName}}": organizationName || "Shift Scorecards",
      })
      const html = await replacePlaceholders(template.body, {
        "{{organizationName}}": organizationName || "Shift Scorecards",
        "{{inviteLink}}": appUrl,
      })

      if (dryRun) {
        perOrgResults.push({
          organizationId: entry.orgId,
          organizationName,
          uniqueEmails: entry.emails.length,
          sent: 0,
          failed: 0,
          errors: [],
        })
        continue
      }

      let sent = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 0; i < entry.emails.length; i += BATCH_SIZE) {
        const batch = entry.emails.slice(i, i + BATCH_SIZE).map((to) => ({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          html,
          reply_to: settings.replyToEmail || fromEmail,
        }))
        const result = await resend.batch.send(batch)
        if (result.error) {
          failed += batch.length
          errors.push(String(result.error?.message || result.error))
        } else if (result.data?.data) {
          sent += result.data.data.length
          const missing = batch.length - result.data.data.length
          if (missing > 0) {
            failed += missing
            errors.push(`Resend batch accepted fewer emails than requested (${result.data.data.length}/${batch.length}).`)
          }
        } else {
          failed += batch.length
          errors.push("Resend batch returned no data.")
        }
      }

      totalSent += sent
      totalFailed += failed
      perOrgResults.push({
        organizationId: entry.orgId,
        organizationName,
        uniqueEmails: entry.emails.length,
        sent,
        failed,
        errors,
      })
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      scan: {
        usersDocsScanned: usersSnap.size,
        pendingRowsSeen,
        pendingRowsMatchedSince,
      },
      caps: { scanLimit, maxOrgs, limitPerOrg },
      totals: {
        orgsProcessed: perOrgResults.length,
        sent: totalSent,
        failed: totalFailed,
      },
      orgs: perOrgResults,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

