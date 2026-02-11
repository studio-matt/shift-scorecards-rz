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
  return getDocuments(COLLECTIONS.ORGANIZATIONS, orderBy("name"))
}

export async function getOrganization(orgId: string) {
  return getDocument(COLLECTIONS.ORGANIZATIONS, orgId)
}

// ─── User Helpers ─────────────────────────────────────────────────────

export async function getUsersByOrg(orgId: string) {
  return getDocuments(
    COLLECTIONS.USERS,
    where("organizationId", "==", orgId),
    orderBy("lastName"),
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

// ─── Template Helpers ─────────────────────────────────────────────────

export async function getTemplates(orgId?: string) {
  const constraints: QueryConstraint[] = [orderBy("updatedAt", "desc")]
  if (orgId) {
    constraints.unshift(where("organizationId", "==", orgId))
  }
  return getDocuments(COLLECTIONS.TEMPLATES, ...constraints)
}

// ─── Scorecard Response Helpers ───────────────────────────────────────

export async function getUserResponses(userId: string) {
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("userId", "==", userId),
    orderBy("completedAt", "desc"),
  )
}

export async function getResponsesByOrg(orgId: string) {
  return getDocuments(
    COLLECTIONS.RESPONSES,
    where("organizationId", "==", orgId),
    orderBy("completedAt", "desc"),
  )
}

// ─── Release Helpers ──────────────────────────────────────────────────

export async function getScheduledReleases() {
  return getDocuments(
    COLLECTIONS.SCHEDULES,
    where("status", "in", ["scheduled"]),
    orderBy("scheduledAt", "asc"),
  )
}

export async function getActiveRelease() {
  const releases = await getDocuments(
    COLLECTIONS.SCHEDULES,
    where("status", "==", "active"),
    limit(1),
  )
  return releases[0] ?? null
}

export async function getCompletedReleases() {
  return getDocuments(
    COLLECTIONS.SCHEDULES,
    where("status", "in", ["completed", "expired"]),
    orderBy("scheduledAt", "desc"),
    limit(20),
  )
}

// ─── Invite Helpers ───────────────────────────────────────────────────

export async function getPendingInvites(orgId: string) {
  return getDocuments(
    COLLECTIONS.INVITES,
    where("organizationId", "==", orgId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
  )
}
