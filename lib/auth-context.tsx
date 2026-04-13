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
import { getUserByAuthId, getUserByEmail, createDocument, updateDocument, COLLECTIONS } from "./firestore"
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
      return { ...existingByEmail, authId: fbUser.uid } as unknown as User
    }
  }

  // SECURITY: No pre-existing record found - user was not invited
  // Sign them out and throw an error with the email they tried to use
  await signOut(auth)
  throw new Error(`ACCESS_DENIED: The email "${email}" is not registered in this system. You must use the same email address that your invitation was sent to. If you believe this is an error, please contact your organization administrator.`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [ready, setReady] = useState(false)
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null) // Track the real DB role
  const [authError, setAuthError] = useState<string | null>(null)

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Only clear error when a new login attempt starts (user is present)
        setAuthError(null)
        setFirebaseUser(fbUser)
        try {
          const profile = await resolveUserProfile(fbUser)
          setUser(profile)
          setOriginalRole(profile.role) // Store the real role from DB
        } catch (err) {
          console.error("Failed to resolve user profile:", err)
          // Check if this is an access denied error
          if (err instanceof Error && err.message.includes("ACCESS_DENIED")) {
            // Extract the message after "ACCESS_DENIED: "
            const message = err.message.replace("ACCESS_DENIED: ", "")
            setAuthError(message)
          }
          setUser(null)
          setFirebaseUser(null)
        }
      } else {
        // User signed out - don't clear authError here, it may have just been set
        setFirebaseUser(null)
        setUser(null)
        setOriginalRole(null)
      }
      setReady(true)
    })
    return () => unsubscribe()
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
