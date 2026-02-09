"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import type { User, UserRole } from "./types"
import { mockAdminUser, mockRegularUser } from "./mock-data"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isAuthenticatedRef: React.RefObject<boolean>
  login: (email: string, password: string) => Promise<void>
  loginWithProvider: (provider: "google" | "microsoft") => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const isAuthenticatedRef = useRef(false)

  const login = useCallback(async (_email: string, _password: string) => {
    isAuthenticatedRef.current = true
    setUser(mockAdminUser)
  }, [])

  const loginWithProvider = useCallback(
    async (_provider: "google" | "microsoft") => {
      isAuthenticatedRef.current = true
      setUser(mockAdminUser)
    },
    [],
  )

  const logout = useCallback(() => {
    isAuthenticatedRef.current = false
    setUser(null)
  }, [])

  const switchRole = useCallback(
    (role: UserRole) => {
      if (role === "admin") {
        setUser(mockAdminUser)
      } else {
        setUser(mockRegularUser)
      }
    },
    [],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isAuthenticatedRef,
        login,
        loginWithProvider,
        logout,
        switchRole,
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
