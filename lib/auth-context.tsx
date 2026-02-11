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
import { getUserByAuthId, createDocument, updateDocument, COLLECTIONS } from "./firestore"
import type { User, UserRole } from "./types"

// Temp store for signup extras that get applied after profile creation
let pendingSignupExtras: { company?: string; department?: string } | null = null

const googleProvider = new GoogleAuthProvider()
const microsoftProvider = new OAuthProvider("microsoft.com")

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, company?: string, department?: string) => Promise<void>
  loginWithProvider: (provider: "google" | "microsoft") => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
  ready: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Fetch or create the Firestore user profile from a Firebase Auth user.
 * On first sign-in we auto-create a basic profile.
 */
async function resolveUserProfile(fbUser: FirebaseUser): Promise<User> {
  // Check if a profile already exists
  const existing = await getUserByAuthId(fbUser.uid)
  if (existing) {
    return existing as unknown as User
  }

  // First-time login — create a profile
  const nameParts = (fbUser.displayName ?? "New User").split(" ")
  const firstName = nameParts[0] ?? "New"
  const lastName = nameParts.slice(1).join(" ") || "User"

  const profile: Record<string, unknown> = {
    email: fbUser.email ?? "",
    firstName,
    lastName,
    role: "admin", // First user is admin; future invites will default to "user"
    department: "",
    jobTitle: "",
    phone: "",
    organizationId: "",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    authId: fbUser.uid,
  }
  // Only include avatar if a real URL exists (Firestore rejects undefined)
  if (fbUser.photoURL) {
    profile.avatar = fbUser.photoURL
  }

  // Apply any pending signup extras (company/department)
  if (pendingSignupExtras) {
    if (pendingSignupExtras.company) {
      profile.organizationId = pendingSignupExtras.company
    }
    if (pendingSignupExtras.department) {
      profile.department = pendingSignupExtras.department
    }
    pendingSignupExtras = null
  }

  const docId = await createDocument(COLLECTIONS.USERS, profile)
  return { id: docId, ...profile } as unknown as User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [ready, setReady] = useState(false)

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser)
        try {
          const profile = await resolveUserProfile(fbUser)
          setUser(profile)
        } catch (err) {
          console.error("Failed to resolve user profile:", err)
          setUser(null)
        }
      } else {
        setFirebaseUser(null)
        setUser(null)
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

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        login,
        signup,
        loginWithProvider,
        logout,
        switchRole,
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
