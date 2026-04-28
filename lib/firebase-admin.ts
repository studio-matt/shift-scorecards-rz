/**
 * Firebase Admin SDK initialization for server-side operations
 * Used for operations that require elevated privileges like deleting users from Firebase Auth
 * Last updated: 2026-04-28 to fix env var loading
 */

import { initializeApp, cert, getApps, getApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let app: App
let adminAuth: Auth
let adminDb: Firestore

function initializeAdmin(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  
  // Debug: log first 50 chars to verify env var is set (not the full key for security)
  console.log(`[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY exists: ${!!serviceAccountKey}`)
  console.log(`[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY length: ${serviceAccountKey?.length || 0}`)
  console.log(`[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY starts with: ${serviceAccountKey?.substring(0, 20) || 'N/A'}...`)
  
  if (!serviceAccountKey) {
    // List all env vars that start with FIREBASE to help debug
    const firebaseEnvVars = Object.keys(process.env).filter(k => k.includes('FIREBASE'))
    console.log(`[Firebase Admin] Available FIREBASE env vars: ${firebaseEnvVars.join(', ') || 'none'}`)
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set")
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
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${error}`)
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
