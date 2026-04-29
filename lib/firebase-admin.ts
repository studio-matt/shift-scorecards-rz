/**
 * Firebase Admin SDK initialization for server-side operations
 * Used for operations that require elevated privileges like deleting users from Firebase Auth
 * Last updated: 2026-04-28 to fix env var loading
 */

import { initializeApp, applicationDefault, getApps, getApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let app: App
let adminAuth: Auth
let adminDb: Firestore

function initializeAdmin(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  // On Firebase App Hosting, just use initializeApp() with no arguments
  // The Admin SDK automatically uses ADC when running in Google Cloud environment
  console.log(`[Firebase Admin] Initializing with default credentials...`)
  
  try {
    // Try simplest initialization first - works on Firebase App Hosting
    return initializeApp()
  } catch (e) {
    console.log(`[Firebase Admin] Default init failed, trying with projectId...`)
  }
  
  try {
    // Fallback: specify projectId explicitly
    return initializeApp({ projectId: 'shift-fe6e9' })
  } catch (e) {
    console.log(`[Firebase Admin] ProjectId init failed, trying ADC...`)
  }
  
  try {
    // Fallback: explicit ADC
    return initializeApp({
      credential: applicationDefault(),
      projectId: 'shift-fe6e9',
    })
  } catch (adcError) {
    throw new Error(`Failed to initialize Firebase Admin: ${adcError}`)
  }
}

export function getAdminApp(): App {
  if (!app) {
    app = initializeAdmin()
  }
  return app
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp())
  }
  return adminAuth
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp())
  }
  return adminDb
}

/**
 * Delete a user from Firebase Auth by their email
 * Returns true if deleted, false if user not found
 */
export async function deleteUserFromAuth(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAdminAuth()
    const userRecord = await auth.getUserByEmail(email)
    await auth.deleteUser(userRecord.uid)
    return { success: true }
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string }
    if (firebaseError.code === "auth/user-not-found") {
      // User doesn't exist in Firebase Auth - that's fine
      return { success: true }
    }
    console.error("Failed to delete user from Firebase Auth:", error)
    return { success: false, error: firebaseError.message || "Unknown error" }
  }
}

/**
 * Delete a user from Firebase Auth by their UID
 */
export async function deleteUserFromAuthByUid(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getAdminAuth()
    await auth.deleteUser(uid)
    return { success: true }
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string }
    if (firebaseError.code === "auth/user-not-found") {
      return { success: true }
    }
    console.error("Failed to delete user from Firebase Auth:", error)
    return { success: false, error: firebaseError.message || "Unknown error" }
  }
}
