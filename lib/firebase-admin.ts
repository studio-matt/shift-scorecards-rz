/**
 * Firebase Admin SDK initialization for server-side operations
 * Used for operations that require elevated privileges like deleting users from Firebase Auth
 * Last updated: 2026-04-28 to fix env var loading
 */

import { initializeApp, cert, applicationDefault, getApps, getApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let app: App
let adminAuth: Auth
let adminDb: Firestore

function initializeAdmin(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  // On Firebase App Hosting, use Application Default Credentials (ADC)
  // This automatically authenticates using the service account assigned to the App Hosting backend
  // No service account key file needed - Google Cloud handles it automatically
  
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  
  // If running on Firebase App Hosting (Google Cloud), try ADC first
  if (!serviceAccountKey || serviceAccountKey === '') {
    console.log(`[Firebase Admin] No service account key found, trying Application Default Credentials...`)
    try {
      return initializeApp({
        credential: applicationDefault(),
        projectId: 'shift-fe6e9',
      })
    } catch (adcError) {
      console.log(`[Firebase Admin] ADC failed: ${adcError}`)
      throw new Error("Failed to initialize Firebase Admin: No service account key and ADC failed")
    }
  }

  try {
    // Try to parse as JSON first, then as base64-encoded JSON
    let jsonString = serviceAccountKey
    
    // If it doesn't start with '{', assume it's base64 encoded
    if (!serviceAccountKey.trim().startsWith('{')) {
      console.log(`[Firebase Admin] Key appears to be base64 encoded, decoding...`)
      jsonString = Buffer.from(serviceAccountKey, 'base64').toString('utf8')
    }
    
    const serviceAccount = JSON.parse(jsonString)
    console.log(`[Firebase Admin] Successfully parsed service account for project: ${serviceAccount.project_id}`)
    return initializeApp({
      credential: cert(serviceAccount),
    })
  } catch (error) {
    // If service account key fails, try ADC as fallback
    console.log(`[Firebase Admin] Service account key failed, trying ADC fallback...`)
    try {
      return initializeApp({
        credential: applicationDefault(),
        projectId: 'shift-fe6e9',
      })
    } catch (adcError) {
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY and ADC failed: ${error}`)
    }
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
