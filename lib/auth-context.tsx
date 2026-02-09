"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { User, UserRole } from "./types"
import { mockAdminUser, mockRegularUser } from "./mock-data"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithProvider: (provider: "google" | "microsoft") => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (_email: string, _password: string) => {
    // Mock login - defaults to admin for demo purposes
    setUser(mockAdminUser)
  }, [])

  const loginWithProvider = useCallback(
    async (_provider: "google" | "microsoft") => {
      setUser(mockAdminUser)
    },
    [],
  )

  const logout = useCallback(() => {
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
