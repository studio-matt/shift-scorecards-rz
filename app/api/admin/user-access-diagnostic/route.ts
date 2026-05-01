import { NextRequest, NextResponse } from "next/server"
import { FieldValue, type DocumentSnapshot, type QueryDocumentSnapshot } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { verifyCallerIsAdmin } from "@/lib/verify-admin-request"

const USERS = "users"
const USER_PROFILES = "userProfiles"
const RESPONSES = "responses"
const SCHEDULES = "schedules"

type UserRow = {
  id: string
  data: Record<string, unknown>
}

function normalizedEmail(value: unknown) {
  return String(value || "").trim().toLowerCase()
}

function timestampRank(data: Record<string, unknown>) {
  return String(data.updatedAt || data.lastLogin || data.createdAt || "")
}

function chooseCanonicalUserRow(rows: UserRow[], preferredAuthId?: string | null): UserRow | null {
  if (rows.length === 0) return null
  if (preferredAuthId) {
    const linked = rows.find((row) => String(row.data.authId || "") === preferredAuthId)
    if (linked) return linked
  }

  return [...rows].sort((a, b) => {
    const aOrg = String(a.data.organizationId || "").trim()
    const bOrg = String(b.data.organizationId || "").trim()
    if (Boolean(bOrg) !== Boolean(aOrg)) return bOrg ? 1 : -1

    const aAuth = Boolean(String(a.data.authId || "").trim())
    const bAuth = Boolean(String(b.data.authId || "").trim())
    if (aAuth !== bAuth) return aAuth ? 1 : -1

    return timestampRank(b.data).localeCompare(timestampRank(a.data))
  })[0]
}

function userSummary(row: UserRow) {
  return {
    id: row.id,
    authId: String(row.data.authId || ""),
    email: String(row.data.email || ""),
    role: String(row.data.role || ""),
    organizationId: String(row.data.organizationId || ""),
    department: String(row.data.department || ""),
    status: String(row.data.status || ""),
    createdAt: row.data.createdAt || null,
    updatedAt: row.data.updatedAt || null,
    lastLogin: row.data.lastLogin || null,
  }
}

function responseSummary(doc: QueryDocumentSnapshot | DocumentSnapshot) {
  const data = doc.data() as Record<string, unknown>
  return {
    id: doc.id,
    userId: String(data.userId || ""),
    releaseId: String(data.releaseId || ""),
    templateId: String(data.templateId || ""),
    templateName: String(data.templateName || ""),
    organizationId: String(data.organizationId || ""),
    status: String(data.status || ""),
    weekOf: String(data.weekOf || ""),
    completedAt: data.completedAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    answerCount:
      data.answers && typeof data.answers === "object"
        ? Object.keys(data.answers as Record<string, unknown>).length
        : 0,
  }
}

async function getActiveRelease() {
  const snap = await getAdminDb().collection(SCHEDULES).where("status", "==", "active").limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  const data = doc.data() as Record<string, unknown>
  return {
    id: doc.id,
    templateId: String(data.templateId || ""),
    organizationId: String(data.organizationId || ""),
    activeUntil: data.activeUntil || null,
  }
}

async function loadResponsesForIds(userIds: string[]) {
  const db = getAdminDb()
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  const responses = []

  for (const userId of uniqueIds) {
    const snap = await db.collection(RESPONSES).where("userId", "==", userId).limit(100).get()
    responses.push(...snap.docs.map(responseSummary))
  }

  return responses
}

async function rebuildMirror(authId: string, userDocId: string, userData: Record<string, unknown>) {
  const firstName = String(userData.firstName || "")
  const lastName = String(userData.lastName || "")
  const email = String(userData.email || "")
  const name = `${firstName} ${lastName}`.trim() || email

  await getAdminDb().collection(USER_PROFILES).doc(authId).set(
    {
      authId,
      userDocId,
      role: String(userData.role || "user"),
      organizationId: String(userData.organizationId || ""),
      department: String(userData.department || ""),
      email,
      name,
      status: String(userData.status || "active"),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

export async function POST(request: NextRequest) {
  const authz = await verifyCallerIsAdmin(request)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })
  if (authz.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - super admin required" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    emails?: string[]
    email?: string
    repair?: boolean
    repairResponses?: boolean
    canonicalUserDocId?: string
  }
  const emails = [...(Array.isArray(body.emails) ? body.emails : []), body.email]
    .map(normalizedEmail)
    .filter(Boolean)
  if (emails.length === 0) {
    return NextResponse.json({ error: "email or emails is required" }, { status: 400 })
  }

  const auth = getAdminAuth()
  const db = getAdminDb()
  const activeRelease = await getActiveRelease()
  const results = []

  for (const email of [...new Set(emails)]) {
    const actions: string[] = []
    let authUser:
      | {
          uid: string
          email: string | undefined
          providerIds: string[]
          disabled: boolean
          emailVerified: boolean
        }
      | null = null
    let authError: { code?: string; message?: string } | null = null

    try {
      const userRecord = await auth.getUserByEmail(email)
      authUser = {
        uid: userRecord.uid,
        email: userRecord.email,
        providerIds: userRecord.providerData.map((provider) => provider.providerId),
        disabled: userRecord.disabled,
        emailVerified: userRecord.emailVerified,
      }
    } catch (error) {
      const e = error as { code?: string; message?: string }
      authError = { code: e.code, message: e.message }
    }

    const usersSnap = await db.collection(USERS).where("email", "==", email).get()
    const rows = usersSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
    const canonical =
      body.canonicalUserDocId && rows.some((row) => row.id === body.canonicalUserDocId)
        ? rows.find((row) => row.id === body.canonicalUserDocId) ?? null
        : chooseCanonicalUserRow(rows, authUser?.uid)

    const profileSnap = authUser ? await db.collection(USER_PROFILES).doc(authUser.uid).get() : null
    const profile = profileSnap?.exists ? profileSnap.data() : null
    const candidateIds = [
      authUser?.uid,
      canonical?.id,
      ...(rows.map((row) => row.id)),
      String(profile?.userDocId || ""),
    ].filter(Boolean) as string[]
    const responses = await loadResponsesForIds(candidateIds)
    const deterministicResponseId =
      activeRelease && canonical ? `${activeRelease.id}__${canonical.id}` : null
    const deterministicResponse =
      deterministicResponseId ? await db.collection(RESPONSES).doc(deterministicResponseId).get() : null

    if (body.repair && authUser && canonical) {
      if (String(canonical.data.authId || "") !== authUser.uid) {
        await db.collection(USERS).doc(canonical.id).set(
          {
            authId: authUser.uid,
            lastLogin: new Date().toISOString(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        canonical.data.authId = authUser.uid
        actions.push(`Linked users/${canonical.id} to auth uid ${authUser.uid}`)
      }

      await rebuildMirror(authUser.uid, canonical.id, canonical.data)
      actions.push(`Rebuilt userProfiles/${authUser.uid}`)

      if (body.repairResponses) {
        const fromIds = [...new Set(candidateIds)].filter((id) => id && id !== canonical.id)
        let migrated = 0
        for (const fromId of fromIds) {
          const snap = await db.collection(RESPONSES).where("userId", "==", fromId).limit(500).get()
          if (snap.empty) continue

          const batch = db.batch()
          for (const doc of snap.docs) {
            batch.set(
              doc.ref,
              {
                userId: canonical.id,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            )
            migrated += 1
          }
          await batch.commit()
        }
        actions.push(`Migrated ${migrated} response(s) to users/${canonical.id}`)
      }
    }

    results.push({
      email,
      dryRun: !body.repair,
      authUser,
      authError,
      canonicalUserDocId: canonical?.id || null,
      userRows: rows.map(userSummary),
      profile: profile
        ? {
            authId: String(profile.authId || ""),
            userDocId: String(profile.userDocId || ""),
            role: String(profile.role || ""),
            organizationId: String(profile.organizationId || ""),
            email: String(profile.email || ""),
            status: String(profile.status || ""),
          }
        : null,
      activeRelease,
      deterministicResponseId,
      deterministicResponse: deterministicResponse?.exists
        ? responseSummary(deterministicResponse)
        : null,
      responses,
      checks: {
        hasFirebaseAuthUser: Boolean(authUser),
        hasCanonicalUserRow: Boolean(canonical),
        mirrorMatchesCanonical:
          Boolean(authUser && canonical && profile) &&
          String(profile?.userDocId || "") === canonical?.id &&
          String(profile?.authId || "") === authUser?.uid,
        hasCompletedResponse: responses.some(
          (response) =>
            response.status === "completed" ||
            Boolean(String(response.completedAt || "").trim()),
        ),
      },
      actions,
    })
  }

  return NextResponse.json({ ok: true, results })
}
