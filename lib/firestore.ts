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

// ─── Collection References ────────────────────────────────────────────
export const COLLECTIONS = {
  ORGANIZATIONS: "organizations",
  USERS: "users",
  TEMPLATES: "templates",
  SCORECARDS: "scorecards",
  RESPONSES: "responses",
  INVITES: "invites",
  SCHEDULES: "schedules",
  SETTINGS: "settings",
} as const

// ─── Generic Helpers ──────────────────────────────────────────────────

export async function getDocument<T = DocumentData>(
  collectionName: string,
  docId: string,
): Promise<(T & { id: string }) | null> {
  const docRef = doc(db, collectionName, docId)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as T & { id: string }
}

export async function getDocuments<T = DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const q = query(collection(db, collectionName), ...constraints)
  const snapshot = await getDocs(q)
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

export async function getUserByEmail(email: string) {
  const users = await getDocuments(
    COLLECTIONS.USERS,
    where("email", "==", email.toLowerCase()),
    limit(1),
  )
  return users[0] ?? null
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

export async function getUserResponses(userId: string) {
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("userId", "==", userId),
  )
}

export async function getResponsesByOrg(orgId: string) {
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("organizationId", "==", orgId),
  )
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
