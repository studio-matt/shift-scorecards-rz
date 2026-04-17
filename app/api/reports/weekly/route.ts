import { NextResponse } from "next/server"
import { getDocuments, COLLECTIONS } from "@/lib/firestore"
import {
  fetchAllResponses,
  computeOrgHoursMetrics,
  computeUserStreaks,
  computeNonResponders,
  computeTopPerformers,
} from "@/lib/dashboard-data"
import { getEmailSettings, getEmailTemplate, sendEmail } from "@/lib/email-service"
import type { Organization, User, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/types"

interface ReportRecipient {
  user: User
  organizationId: string
  organizationName: string
}

// Send weekly leadership reports to admins
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, type = "leadership" } = body as { organizationId?: string; type?: "leadership" | "user_digest" }

    // Get email settings
    const emailSettings = await getEmailSettings()
    if (!emailSettings?.enabled) {
      return NextResponse.json({ error: "Email not configured" }, { status: 400 })
    }

    // Load organizations
    const orgDocs = await getDocuments(COLLECTIONS.ORGANIZATIONS)
    const organizations = orgDocs.map((d) => ({ ...d } as unknown as Organization))
    
    // Filter to specific org if provided
    const targetOrgs = organizationId 
      ? organizations.filter(o => o.id === organizationId)
      : organizations

    // Load all users
    const userDocs = await getDocuments(COLLECTIONS.USERS)
    const allUsers = userDocs.map((d) => ({ ...d } as unknown as User))

    // Get templates
    const templates = await getDocuments(COLLECTIONS.TEMPLATES)
    
    const results: { sent: number; failed: number; errors: string[] } = {
      sent: 0,
      failed: 0,
      errors: [],
    }

    if (type === "leadership") {
      // Send leadership reports
      const template = await getEmailTemplate("leadership_report")
      if (!template?.enabled) {
        return NextResponse.json({ error: "Leadership report template is disabled" }, { status: 400 })
      }

      for (const org of targetOrgs) {
        try {
          // Find admin users for this org who have leadership reports enabled
          const orgAdmins = allUsers.filter(u => 
            u.organizationId === org.id && 
            (u.role === "admin" || u.role === "company_admin") &&
            (u.notificationPreferences?.leadershipReport !== false) // Default to true
          )

          if (orgAdmins.length === 0) continue

          // Compute metrics for this org
          const responses = await fetchAllResponses(org.id, "all")
          const hoursMetrics = await computeOrgHoursMetrics(responses, templates, org.hourlyRate || 100)
          const topPerformers = await computeTopPerformers(responses, allUsers, templates)
          const nonResponders = await computeNonResponders(responses, allUsers, [org])

          // Get current week
          const now = new Date()
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          const weekOf = weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

          // Build top performers list HTML
          const topPerformersList = topPerformers.slice(0, 5).map((p, i) => 
            `<p style="margin: 4px 0; color: #555;">${i + 1}. ${p.name} - ${p.hoursSaved.toFixed(1)} hours saved</p>`
          ).join("") || "<p style='color: #999;'>No data yet</p>"

          // Build non-responders list HTML
          const orgNonResponders = nonResponders.filter(n => {
            const u = allUsers.find(usr => usr.id === n.userId)
            return u?.organizationId === org.id
          })
          const nonRespondersList = orgNonResponders.slice(0, 5).map(n => 
            `<p style="margin: 4px 0; color: #555;">• ${n.name} (${n.department})</p>`
          ).join("") || "<p style='color: #22c55e;'>Everyone responded!</p>"

          // Calculate participation
          const orgUsers = allUsers.filter(u => u.organizationId === org.id)
          const respondedUserIds = new Set(responses.map(r => r.userId))
          const activeParticipants = orgUsers.filter(u => respondedUserIds.has(u.id)).length
          const participationRate = orgUsers.length > 0 ? (activeParticipants / orgUsers.length) * 100 : 0

          // Build variables for template
          const variables = {
            organizationName: org.name,
            weekOf,
            totalHoursSaved: hoursMetrics.totalHoursSaved.toFixed(0),
            productivityGain: hoursMetrics.avgProductivityPercent.toFixed(1),
            participationRate: participationRate.toFixed(0),
            periodValue: hoursMetrics.periodValue.toLocaleString(),
            topPerformersList,
            nonRespondersCount: String(orgNonResponders.length),
            nonRespondersList,
            reportLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://shift-app.vercel.app"}/admin/reports`,
          }

          // Send to each admin
          for (const admin of orgAdmins) {
            try {
              await sendEmail({
                to: admin.email,
                templateType: "leadership_report",
                variables: {
                  ...variables,
                  firstName: admin.firstName,
                },
              })
              results.sent++
            } catch (err) {
              results.failed++
              results.errors.push(`Failed to send to ${admin.email}: ${err}`)
            }
          }
        } catch (err) {
          results.errors.push(`Failed to process org ${org.name}: ${err}`)
        }
      }
    } else if (type === "user_digest") {
      // Send user weekly digests
      const template = await getEmailTemplate("weekly_digest")
      if (!template?.enabled) {
        return NextResponse.json({ error: "Weekly digest template is disabled" }, { status: 400 })
      }

      // Get current week
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      const weekOf = weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

      for (const org of targetOrgs) {
        try {
          const orgUsers = allUsers.filter(u => 
            u.organizationId === org.id &&
            (u.notificationPreferences?.weeklyDigest !== false) // Default to true
          )

          if (orgUsers.length === 0) continue

          // Compute org data
          const responses = await fetchAllResponses(org.id, "all")
          const topPerformers = await computeTopPerformers(responses, allUsers, templates)
          const streaks = await computeUserStreaks(responses, allUsers)

          for (const user of orgUsers) {
            try {
              // Find user's rank and streak
              const userRank = topPerformers.findIndex(p => p.id === user.id) + 1
              const userStreak = streaks.find(s => s.userId === user.id)
              const userPerformer = topPerformers.find(p => p.id === user.id)

              const variables = {
                firstName: user.firstName,
                organizationName: org.name,
                weekOf,
                hoursSaved: userPerformer?.hoursSaved.toFixed(1) || "0",
                streak: String(userStreak?.currentStreak || 0),
                rank: userRank > 0 ? String(userRank) : "N/A",
                dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://shift-app.vercel.app"}/dashboard`,
              }

              await sendEmail({
                to: user.email,
                templateType: "weekly_digest",
                variables,
              })
              results.sent++
            } catch (err) {
              results.failed++
              results.errors.push(`Failed to send digest to ${user.email}: ${err}`)
            }
          }
        } catch (err) {
          results.errors.push(`Failed to process org ${org.name}: ${err}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${results.sent} reports, ${results.failed} failed`,
      ...results,
    })
  } catch (error) {
    console.error("Weekly report error:", error)
    return NextResponse.json(
      { error: "Failed to send reports" },
      { status: 500 }
    )
  }
}
