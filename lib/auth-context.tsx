"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "./firebase"
import { getUserByAuthId, getUserByEmail, createDocument, updateDocument, deleteDocument, getInviteByEmail, upsertUserProfile, COLLECTIONS } from "./firestore"
import { syncUserProfileMirrorAfterUserDocUpdate } from "./api-client"
import type { User, UserRole } from "./types"

// Temp store for signup extras that get applied after profile creation
let pendingSignupExtras: { company?: string; department?: string } | null = null

const googleProvider = new GoogleAuthProvider()
const microsoftProvider = new OAuthProvider("microsoft.com")

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  isAuthenticated: boolean
  isAdmin: boolean // true for both admin and company_admin (has admin-level access)
  isSuperAdmin: boolean // true only for global admin
  isCompanyAdmin: boolean // true only for company_admin (org-scoped)
  isActuallySuperAdmin: boolean // true if the user's real DB role is admin (not affected by switchRole)
  authError: string | null // Error message for unauthorized access attempts
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, company?: string, department?: string) => Promise<void>
  loginWithProvider: (provider: "google" | "microsoft") => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
  clearAuthError: () => void
  ready: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Fetch the Firestore user profile from a Firebase Auth user.
 * 
 * SECURITY: Users must be pre-invited (exist in users collection) before they 
 * can authenticate. This prevents unauthorized access by random emails.
 * 
 * If a user record already exists with the same email (added by admin invite),
 * we link the Firebase Auth UID to that existing record so they inherit their 
 * organization, role, and department.
 */
async function resolveUserProfile(fbUser: FirebaseUser): Promise<User> {
  // Check if a profile already exists by authId (user has logged in before)
  const existingByAuthId = await getUserByAuthId(fbUser.uid)
  if (existingByAuthId) {
    // Update last login time
    await updateDocument(COLLECTIONS.USERS, existingByAuthId.id, {
      lastLogin: new Date().toISOString(),
    })
    
    // Upsert the userProfiles mirror for security rules (best-effort; fallback to Admin SDK endpoint)
    const userData = existingByAuthId as Record<string, unknown>
    try {
      await upsertUserProfile(fbUser.uid, existingByAuthId.id, {
        role: userData.role as string,
        organizationId: userData.organizationId as string,
        department: userData.department as string,
        email: userData.email as string,
        firstName: userData.firstName as string,
        lastName: userData.lastName as string,
        status: userData.status as string,
      })
    } catch (e) {
      const err = e as { code?: string; message?: string }
      if (/permission|insufficient|PERMISSION_DENIED/i.test(String(err.code || err.message || ""))) {
        await syncUserProfileMirrorAfterUserDocUpdate(existingByAuthId.id)
      } else {
        throw e
      }
    }
    
    return existingByAuthId as unknown as User
  }

  // Check if a user record exists with this email (pre-created by admin invite)
  const email = fbUser.email?.toLowerCase() ?? ""
  if (email) {
    const existingByEmail = await getUserByEmail(email)
    if (existingByEmail) {
      // Link the Firebase Auth UID to this existing user record
      await updateDocument(COLLECTIONS.USERS, existingByEmail.id, {
        authId: fbUser.uid,
        lastLogin: new Date().toISOString(),
        // Update avatar if they signed in with OAuth and we have one
        ...(fbUser.photoURL ? { avatar: fbUser.photoURL } : {}),
      })
      
      // Upsert the userProfiles mirror for security rules (best-effort; fallback to Admin SDK endpoint)
      const userData = existingByEmail as Record<string, unknown>
      try {
        await upsertUserProfile(fbUser.uid, existingByEmail.id, {
          role: userData.role as string,
          organizationId: userData.organizationId as string,
          department: userData.department as string,
          email: userData.email as string,
          firstName: userData.firstName as string,
          lastName: userData.lastName as string,
          status: userData.status as string,
        })
      } catch (e) {
        const err = e as { code?: string; message?: string }
        if (/permission|insufficient|PERMISSION_DENIED/i.test(String(err.code || err.message || ""))) {
          await syncUserProfileMirrorAfterUserDocUpdate(existingByEmail.id)
        } else {
          throw e
        }
      }
      
      return { ...existingByEmail, authId: fbUser.uid } as unknown as User
    }
    
    // Legacy invites stored separately in INVITES collection
    const matchingInvite = await getInviteByEmail(email)
    if (matchingInvite) {
      const inviteData = matchingInvite as Record<string, unknown>
      // Migrate invite to USERS collection
      const newUserData = {
        email,
        firstName: (inviteData.firstName as string) ?? "",
        lastName: (inviteData.lastName as string) ?? "",
        department: (inviteData.department as string) ?? "",
        organizationId: (inviteData.organizationId as string) ?? "",
        role: (inviteData.role as string) ?? "user",
        status: "active",
        authId: fbUser.uid,
        createdAt: (inviteData.createdAt as string) ?? new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        ...(fbUser.photoURL ? { avatar: fbUser.photoURL } : {}),
        ...(fbUser.displayName ? { 
          firstName: fbUser.displayName.split(" ")[0] ?? "",
          lastName: fbUser.displayName.split(" ").slice(1).join(" ") ?? "",
        } : {}),
      }
      const docId = await createDocument(COLLECTIONS.USERS, newUserData)
      // Delete the old invite
      await deleteDocument(COLLECTIONS.INVITES, matchingInvite.id)
      
      // Upsert the userProfiles mirror for security rules (best-effort; fallback to Admin SDK endpoint)
      try {
        await upsertUserProfile(fbUser.uid, docId, {
          role: newUserData.role,
          organizationId: newUserData.organizationId,
          department: newUserData.department,
          email: newUserData.email,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          status: newUserData.status,
        })
      } catch (e) {
        const err = e as { code?: string; message?: string }
        if (/permission|insufficient|PERMISSION_DENIED/i.test(String(err.code || err.message || ""))) {
          await syncUserProfileMirrorAfterUserDocUpdate(docId)
        } else {
          throw e
        }
      }
      
      return { id: docId, ...newUserData } as unknown as User
    }
  }

  // No invite on file: create staging account (server) so user can be assigned to an org by an admin
  const idToken = await fbUser.getIdToken()
  const nameParts = (fbUser.displayName || "").trim().split(/\s+/)
  const firstName = nameParts[0] || "User"
  const lastName = nameParts.slice(1).join(" ")
  const res = await fetch("/api/auth/create-staging-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      firstName,
      lastName,
      department: pendingSignupExtras?.department ?? "",
    }),
  })
  pendingSignupExtras = null

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string }
    await signOut(auth)
    throw new Error(
      errBody.error ||
        `ACCESS_DENIED: The email "${email}" is not registered in this system. You must use the same email address that your invitation was sent to. If you believe this is an error, please contact your organization administrator.`,
    )
  }

  const createdUser = await getUserByEmail(email)
  if (!createdUser) {
    await signOut(auth)
    throw new Error(
      `ACCESS_DENIED: Your account could not be loaded. Please contact your organization administrator.`,
    )
  }

  const createdData = createdUser as Record<string, unknown>
  try {
    await upsertUserProfile(fbUser.uid, createdUser.id, {
      role: createdData.role as string,
      organizationId: createdData.organizationId as string,
      department: createdData.department as string,
      email: createdData.email as string,
      firstName: createdData.firstName as string,
      lastName: createdData.lastName as string,
      status: createdData.status as string,
    })
  } catch (e) {
    const err = e as { code?: string; message?: string }
    if (/permission|insufficient|PERMISSION_DENIED/i.test(String(err.code || err.message || ""))) {
      await syncUserProfileMirrorAfterUserDocUpdate(createdUser.id)
    } else {
      throw e
    }
  }

  return createdUser as unknown as User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [ready, setReady] = useState(false)
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null) // Track the real DB role
  const [authError, setAuthError] = useState<string | null>(null)

  // Listen to Firebase Auth state changes
  useEffect(() => {
    let mounted = true
    
    // Set a timeout to ensure we don't hang indefinitely
    const timeout = setTimeout(() => {
      if (mounted && !ready) {
        console.warn("[v0] Auth initialization timeout - setting ready state")
        setReady(true)
      }
    }, 10000) // 10 second timeout
    
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!mounted) return
      
      if (fbUser) {
        // Only clear error when a new login attempt starts (user is present)
        setAuthError(null)
        setFirebaseUser(fbUser)
        try {
          const profile = await resolveUserProfile(fbUser)
          if (mounted) {
            setUser(profile)
            setOriginalRole(profile.role) // Store the real role from DB
          }
        } catch (err) {
          console.error("Failed to resolve user profile:", err)
          try {
            await signOut(auth)
          } catch {
            /* ignore */
          }
          let message =
            "Could not complete sign-in. Please try again or contact your organization administrator."
          if (err instanceof Error) {
            const raw = err.message
            if (raw.includes("ACCESS_DENIED")) {
              message = raw
                .replace(/^ACCESS_DENIED:\s*/i, "")
                .replace(/^ACCESS_DENIED\s*/i, "")
                .trim()
            } else if (/permission|insufficient|PERMISSION_DENIED/i.test(raw)) {
              message =
                "Account setup failed due to a permissions error. Please contact your organization administrator."
            } else if (raw.length > 0 && raw.length < 400) {
              message = raw
            }
          }
          if (mounted) setAuthError(message)
          if (mounted) {
            setUser(null)
            setFirebaseUser(null)
          }
        }
      } else {
        // User signed out - don't clear authError here, it may have just been set
        if (mounted) {
          setFirebaseUser(null)
          setUser(null)
          setOriginalRole(null)
        }
      }
      if (mounted) setReady(true)
    })
    
    return () => {
      mounted = false
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string, company?: string, department?: string) => {
    // Store extras so resolveUserProfile can pick them up
    pendingSignupExtras = { company, department }
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
  }, [])

  const loginWithProvider = useCallback(
    async (provider: "google" | "microsoft") => {
      const prov = provider === "google" ? googleProvider : microsoftProvider
      await signInWithPopup(auth, prov)
    },
    [],
  )

  const logout = useCallback(async () => {
    await signOut(auth)
    setUser(null)
    setFirebaseUser(null)
    setAuthError(null)
  }, [])

  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  // Dev-only: toggle role for testing both views
  const switchRole = useCallback(
    (role: UserRole) => {
      if (user) {
        setUser({ ...user, role })
      }
    },
    [user],
  )

  // Role-based access flags
  const isSuperAdmin = user?.role === "admin"
  const isCompanyAdmin = user?.role === "company_admin"
  const isAdmin = isSuperAdmin || isCompanyAdmin // Either role gets admin-level access
  const isActuallySuperAdmin = originalRole === "admin" // Real DB role, unaffected by switchRole

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isAdmin,
        isSuperAdmin,
        isCompanyAdmin,
        isActuallySuperAdmin,
        authError,
        login,
        signup,
        loginWithProvider,
        logout,
        switchRole,
        clearAuthError,
        ready,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
