"use client"

import { useState, useEffect, type ReactNode } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/lib/theme-context"
import { Toaster } from "sonner"

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering children until mounted
  // This ensures client and server render the same initial content
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <Toaster richColors closeButton position="top-center" theme="dark" />
      </AuthProvider>
    </ThemeProvider>
  )
}
