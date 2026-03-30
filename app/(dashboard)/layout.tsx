"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { BackgroundProvider, useBackground } from "@/lib/background-context"
import { AppSidebar } from "@/components/app-sidebar"
import { AppFooter } from "@/components/app-footer"
import { Loader2 } from "lucide-react"

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAuth()
  const { backgroundColor } = useBackground()
  const router = useRouter()

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push("/")
    }
  }, [ready, isAuthenticated, router])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div 
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor }}
    >
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Spacer for mobile header */}
        <div className="h-14 shrink-0 md:hidden" />
        <main 
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor }}
        >
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
          <AppFooter />
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BackgroundProvider>
      <DashboardShell>{children}</DashboardShell>
    </BackgroundProvider>
  )
}
