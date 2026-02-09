"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { User, UserRole } from "./types"
import { mockAdminUser, mockRegularUser } from "./mock-data"

const STORAGE_KEY = "shift-auth-user"

function persistUser(user: User | null) {
  if (typeof window === "undefined") return
  if (user) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

function loadUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithProvider: (provider: "google" | "microsoft") => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
  ready: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const stored = loadUser()
    if (stored) {
      setUser(stored)
    }
    setReady(true)
  }, [])

  const login = useCallback(async (_email: string, _password: string) => {
    persistUser(mockAdminUser)
    setUser(mockAdminUser)
  }, [])

  const loginWithProvider = useCallback(
    async (_provider: "google" | "microsoft") => {
      persistUser(mockAdminUser)
      setUser(mockAdminUser)
    },
    [],
  )

  const logout = useCallback(() => {
    persistUser(null)
    setUser(null)
  }, [])

  const switchRole = useCallback(
    (role: UserRole) => {
      const next = role === "admin" ? mockAdminUser : mockRegularUser
      persistUser(next)
      setUser(next)
    },
    [],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        login,
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
