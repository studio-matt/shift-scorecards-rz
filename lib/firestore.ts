import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "./firebase"
import { logPerf } from "./perf-diagnostic"

// ─── Collection References ────────────────────────────────────────────
export const COLLECTIONS = {
  ORGANIZATIONS: "organizations",
  USERS: "users",
  USER_PROFILES: "userProfiles", // Mirror collection keyed by authUid for security rules
  TEMPLATES: "templates",
  SCORECARDS: "scorecards",
  RESPONSES: "responses",
  INVITES: "invites",
  SCHEDULES: "schedules",
  SETTINGS: "settings",
  WEBINARS: "webinars",
  REPORT_HISTORY: "report_history",
  ROLLUP_SNAPSHOTS: "rollup_snapshots",
} as const

// ─── UserProfile Mirror Type ──────────────────────────────────────────
// Minimal fields needed for Firestore Security Rules lookups
export interface UserProfileMirror {
  authId: string
  userDocId: string
  role: string
  organizationId: string
  department: string
  email: string
  name: string
  status: string
  updatedAt: Date
}

// ─── Generic Helpers ──────────────────────────────────────────────────

export async function getDocument<T = DocumentData>(
  collectionName: string,
  docId: string,
): Promise<(T & { id: string }) | null> {
  const start = performance.now()
  const docRef = doc(db, collectionName, docId)
  const docSnap = await getDoc(docRef)
  const elapsed = performance.now() - start
  logPerf('getDocument', collectionName, elapsed, 1)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as T & { id: string }
}

export async function getDocuments<T = DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const start = performance.now()
  const q = query(collection(db, collectionName), ...constraints)
  const snapshot = await getDocs(q)
  const elapsed = performance.now() - start
  const count = snapshot.docs.length
  logPerf('getDocuments', collectionName, elapsed, count)
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as T & { id: string },
  )
}

export async function createDocument(
  collectionName: string,
  data: DocumentData,
): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function setDocument(
  collectionName: string,
  docId: string,
  data: DocumentData,
): Promise<void> {
  await setDoc(doc(db, collectionName, docId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>,
): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDocument(
  collectionName: string,
  docId: string,
): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId))
}

// ─── Organization Helpers ─────────────────────────────────────────────

export async function getOrganizations() {
  return getDocuments(COLLECTIONS.ORGANIZATIONS)
}

export async function getOrganization(orgId: string) {
  return getDocument(COLLECTIONS.ORGANIZATIONS, orgId)
}

// ─── User Helpers ─────────────────────────────────────────────────────

export async function getUsersByOrg(orgId: string) {
  return getDocuments(
    COLLECTIONS.USERS,
    where("organizationId", "==", orgId),
  )
}

export async function getUserByAuthId(authId: string) {
  const users = await getDocuments(
    COLLECTIONS.USERS,
    where("authId", "==", authId),
    limit(1),
  )
  return users[0] ?? null
}

/**
 * Resolve a single user row for an email when duplicates may exist (e.g. staging + invited).
 * Prefer the row already linked to this Firebase Auth UID, then rows with organizationId,
 * then the most recently updated.
 */
export async function getUserByEmail(
  email: string,
  opts?: { preferredAuthId?: string },
): Promise<(DocumentData & { id: string }) | null> {
  const normalized = email.toLowerCase()
  const docs = await getUsersByEmailAll(normalized, 25)
  if (docs.length === 0) return null
  if (docs.length === 1) return docs[0]

  const preferredAuthId = opts?.preferredAuthId
  if (preferredAuthId) {
    const byAuth = docs.find((d) => (d as Record<string, unknown>).authId === preferredAuthId)
    if (byAuth) return byAuth
  }

  const ts = (d: Record<string, unknown>) =>
    String((d.updatedAt as string) || (d.createdAt as string) || "")

  const sorted = [...docs].sort((a, b) => {
    const ar = a as Record<string, unknown>
    const br = b as Record<string, unknown>
    const aOrg = String(ar.organizationId ?? "").trim()
    const bOrg = String(br.organizationId ?? "").trim()
    const aHasOrg = aOrg ? 1 : 0
    const bHasOrg = bOrg ? 1 : 0
    if (bHasOrg !== aHasOrg) return bHasOrg - aHasOrg

    const aAuth = Boolean(ar.authId)
    const bAuth = Boolean(br.authId)
    if (aAuth !== bAuth) return (aAuth ? 1 : 0) - (bAuth ? 1 : 0)

    return ts(br).localeCompare(ts(a))
  })

  return sorted[0] ?? null
}

/** All user docs matching an email (helps detect duplicates). */
export async function getUsersByEmailAll(email: string, maxDocs = 25) {
  const normalized = email.toLowerCase()
  const cap = Math.min(Math.max(maxDocs, 1), 100)
  return getDocuments(COLLECTIONS.USERS, where("email", "==", normalized), limit(cap))
}

// ─── Template Helpers ─────────────────────────────────────────────────

export async function getTemplates(orgId?: string) {
  // Simple query -- no composite index needed
  const constraints: QueryConstraint[] = orgId
    ? [where("organizationId", "==", orgId)]
    : []
  return getDocuments(COLLECTIONS.TEMPLATES, ...constraints)
}

// ─── Scorecard Response Helpers ───────────────────────────────────────

/** User's scorecards only (indexed query + cap — avoids scanning all responses). */
export async function getUserResponses(userId: string, maxDocs = 5000) {
  const cap = Math.min(Math.max(maxDocs, 1), 10000)
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("userId", "==", userId),
    orderBy("completedAt", "desc"),
    limit(cap),
  )
}

/**
 * All response docs for a user (no completedAt ordering).
 * Use when getUserResponses returns empty — e.g. legacy rows missing completedAt cannot satisfy orderBy.
 */
export async function getUserResponsesUnordered(userId: string, maxDocs = 5000) {
  const cap = Math.min(Math.max(maxDocs, 1), 10000)
  return getDocuments(COLLECTIONS.RESPONSES, where("userId", "==", userId), limit(cap))
}

/**
 * Canonical user response stream: merges docs stored under the user's Firestore doc id
 * and any legacy docs stored under Firebase authId.
 */
export async function getUserResponsesMerged(
  user: { id: string; authId?: string },
  maxDocsPerKey = 5000,
) {
  const authId = user.authId && user.authId !== user.id ? user.authId : null
  const [byUserId, byAuthId] = await Promise.all([
    getUserResponsesUnordered(user.id, maxDocsPerKey),
    authId ? getUserResponsesUnordered(authId, maxDocsPerKey) : Promise.resolve([]),
  ])
  const byId = new Map<string, unknown>()
  for (const r of [...byUserId, ...byAuthId]) {
    const response = r as unknown as { id?: string; userId?: string } & Record<string, unknown>
    const id = response.id
    if (!id) continue
    byId.set(id, authId && response.userId === authId ? { ...response, userId: user.id } : response)
  }
  return Array.from(byId.values()) as typeof byUserId
}

export async function getResponsesByOrg(orgId: string) {
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("organizationId", "==", orgId),
  )
}

/** Tier C: bounded org read (no order; includes rows missing completedAt). */
export async function getResponsesForOrgLimited(organizationId: string, maxDocs = 15000) {
  // Firestore client structured query limit has a hard maximum of 10,000.
  const cap = Math.min(Math.max(maxDocs, 1), 10000)
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("organizationId", "==", organizationId),
    limit(cap),
  )
}

/**
 * Tier C: org + completedAt window (requires composite index on organizationId + completedAt).
 * Use for leadership email metrics and dashboard fallback (completed responses only).
 */
export async function getResponsesForOrgCompletedBetween(
  organizationId: string,
  completedAtMinInclusive: string,
  completedAtMaxExclusive: string,
  maxDocs = 25000,
) {
  // Firestore client structured query limit has a hard maximum of 10,000.
  // Keeping this helper safe prevents runtime export/report failures.
  const cap = Math.min(Math.max(maxDocs, 1), 10000)
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("organizationId", "==", organizationId),
    where("completedAt", ">=", completedAtMinInclusive),
    where("completedAt", "<", completedAtMaxExclusive),
    limit(cap),
  )
}

/** Newest completions first — requires composite index (organizationId + completedAt desc). */
export async function getResponsesForOrgRecent(organizationId: string, maxDocs = 12000) {
  const cap = Math.min(Math.max(maxDocs, 1), 25000)
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("organizationId", "==", organizationId),
    orderBy("completedAt", "desc"),
    limit(cap),
  )
}

export async function getDocumentsByIds<T = DocumentData>(
  collectionName: string,
  ids: string[],
): Promise<(T & { id: string })[]> {
  const unique = [...new Set(ids)].filter(Boolean)
  const rows: (T & { id: string })[] = []
  for (const id of unique) {
    const doc = await getDocument<T>(collectionName, id)
    if (doc) rows.push(doc)
  }
  return rows
}

// ─── Release Helpers ──────────────────────────────────────────────────
// NOTE: We fetch all releases in one query (no composite index needed)
// and filter/sort client-side to avoid Firestore composite index requirements.

export async function getAllReleases() {
  return getDocuments(COLLECTIONS.SCHEDULES)
}

export function filterScheduledReleases(releases: Record<string, unknown>[]) {
  return releases
    .filter((r) => r.status === "scheduled")
    .sort((a, b) =>
      String(a.scheduledAt ?? "").localeCompare(String(b.scheduledAt ?? "")),
    )
}

export function filterActiveRelease(releases: Record<string, unknown>[]) {
  return releases.find((r) => r.status === "active") ?? null
}

export function filterCompletedReleases(releases: Record<string, unknown>[]) {
  return releases
    .filter((r) => r.status === "completed" || r.status === "expired")
    .sort((a, b) =>
      String(b.scheduledAt ?? "").localeCompare(String(a.scheduledAt ?? "")),
    )
    .slice(0, 20)
}

// ─── Invite Helpers ───────────────────────────────────────────────────

export async function getPendingInvites(orgId: string) {
  return getDocuments(
    COLLECTIONS.INVITES,
    where("organizationId", "==", orgId),
    where("status", "==", "pending"),
  )
}

/** Single invite by email (avoids scanning entire invites collection). */
export async function getInviteByEmail(email: string) {
  const normalized = email.toLowerCase()
  const invites = await getDocuments(
    COLLECTIONS.INVITES,
    where("email", "==", normalized),
    limit(1),
  )
  return invites[0] ?? null
}

// ─── UserProfile Mirror Helpers ───────────────────────────────────────
// These maintain the /userProfiles/{authUid} mirror collection for security rules

/**
 * Upsert the userProfiles mirror document.
 * Called on login and whenever user profile data changes.
 * Document ID = Firebase Auth UID (authId) for predictable security rules.
 */
export async function upsertUserProfile(
  authId: string,
  userDocId: string,
  userData: {
    role?: string
    organizationId?: string
    department?: string
    email?: string
    firstName?: string
    lastName?: string
    status?: string
  }
): Promise<void> {
  const name = `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
  
  const profileData: Omit<UserProfileMirror, "updatedAt"> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
    authId,
    userDocId,
    role: userData.role || "user",
    organizationId: userData.organizationId || "",
    department: userData.department || "",
    email: userData.email || "",
    name,
    status: userData.status || "active",
    updatedAt: serverTimestamp(),
  }
  
  // Use setDoc with merge to upsert
  await setDoc(doc(db, COLLECTIONS.USER_PROFILES, authId), profileData, { merge: true })
}

/**
 * Get a user profile mirror by auth ID.
 * Useful for security rules and quick lookups.
 */
export async function getUserProfile(authId: string): Promise<UserProfileMirror | null> {
  const docSnap = await getDoc(doc(db, COLLECTIONS.USER_PROFILES, authId))
  if (!docSnap.exists()) return null
  return docSnap.data() as UserProfileMirror
}

/**
 * Sync user profile mirror after updating user data.
 * Call this after any updateDocument(COLLECTIONS.USERS, ...) that changes
 * fields relevant to security rules (role, organizationId, department, status).
 * 
 * @param authId - Firebase Auth UID
 * @param userDocId - The /users document ID
 * @param updatedFields - The fields that were updated (partial)
 */
export async function syncUserProfileMirror(
  authId: string,
  userDocId: string,
  updatedFields: Partial<{
    role: string
    organizationId: string
    department: string
    email: string
    firstName: string
    lastName: string
    status: string
  }>
): Promise<void> {
  // Only sync if security-relevant fields were updated
  const relevantFields = ["role", "organizationId", "department", "email", "firstName", "lastName", "status"]
  const hasRelevantUpdate = Object.keys(updatedFields).some((k) => relevantFields.includes(k))
  
  if (!hasRelevantUpdate) return
  
  // Build the update object with only the fields that were changed
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }
  
  if (updatedFields.role !== undefined) updateData.role = updatedFields.role
  if (updatedFields.organizationId !== undefined) updateData.organizationId = updatedFields.organizationId
  if (updatedFields.department !== undefined) updateData.department = updatedFields.department
  if (updatedFields.email !== undefined) updateData.email = updatedFields.email
  if (updatedFields.status !== undefined) updateData.status = updatedFields.status
  
  // Handle name (combined from firstName + lastName)
  if (updatedFields.firstName !== undefined || updatedFields.lastName !== undefined) {
    // We need to fetch current values to combine
    const existingProfile = await getUserProfile(authId)
    const firstName = updatedFields.firstName ?? existingProfile?.name?.split(" ")[0] ?? ""
    const lastName = updatedFields.lastName ?? existingProfile?.name?.split(" ").slice(1).join(" ") ?? ""
    updateData.name = `${firstName} ${lastName}`.trim()
  }
  
  // Use setDoc with merge to update only changed fields
  await setDoc(doc(db, COLLECTIONS.USER_PROFILES, authId), updateData, { merge: true })
}
