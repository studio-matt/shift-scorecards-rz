"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/app-sidebar"
import { AppFooter } from "@/components/app-footer"

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push("/")
    }
  }, [ready, isAuthenticated, router])

  if (!ready || !isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
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
  return <DashboardShell>{children}</DashboardShell>
}
