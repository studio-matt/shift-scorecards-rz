"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/app-sidebar"
import { AppFooter } from "@/components/app-footer"
import { Loader2 } from "lucide-react"
import { getDocument, COLLECTIONS } from "@/lib/firestore"
import type { Organization } from "@/lib/types"

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready, user } = useAuth()
  const router = useRouter()
  const [orgBackgroundColor, setOrgBackgroundColor] = useState<string | null>(null)

  // Fetch organization's custom background color
  useEffect(() => {
    async function fetchOrgBranding() {
      if (!user?.organizationId) return
      try {
        const org = await getDocument<Organization>(COLLECTIONS.ORGANIZATIONS, user.organizationId)
        if (org?.backgroundColor) {
          setOrgBackgroundColor(org.backgroundColor)
        }
      } catch (err) {
        console.error("Failed to fetch org branding:", err)
      }
    }
    fetchOrgBranding()
  }, [user?.organizationId])

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
      style={orgBackgroundColor ? { backgroundColor: orgBackgroundColor } : undefined}
    >
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main 
          className="flex-1 overflow-y-auto"
          style={orgBackgroundColor ? { backgroundColor: orgBackgroundColor } : undefined}
        >
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
