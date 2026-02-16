"use client"

import { useEffect, type ReactNode } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/lib/theme-context"

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Suppress hydration errors caused by browser extensions (e.g. LastPass)
    // injecting DOM nodes before React hydrates. These are harmless --
    // React recovers by re-rendering on the client.
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : ""
      if (
        msg.includes("Hydration failed") ||
        msg.includes("hydrating") ||
        msg.includes("server rendered HTML") ||
        msg.includes("did not match") ||
        msg.includes("data-lastpass")
      ) {
        return
      }
      originalError.apply(console, args)
    }
    return () => {
      console.error = originalError
    }
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
