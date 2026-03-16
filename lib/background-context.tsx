"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDocument, COLLECTIONS } from "@/lib/firestore"
import type { Organization } from "@/lib/types"

interface BackgroundContextType {
  backgroundColor: string
  setPreviewColor: (color: string | null) => void
  setSelectedOrgColor: (color: string | null) => void
}

const BackgroundContext = createContext<BackgroundContextType>({
  backgroundColor: "#09090b",
  setPreviewColor: () => {},
  setSelectedOrgColor: () => {},
})

export function useBackground() {
  return useContext(BackgroundContext)
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [userOrgColor, setUserOrgColor] = useState<string | null>(null)
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [selectedOrgColor, setSelectedOrgColor] = useState<string | null>(null)

  // Fetch user's organization background color
  useEffect(() => {
    async function fetchUserOrgColor() {
      if (!user?.organizationId) {
        setUserOrgColor(null)
        return
      }
      try {
        const org = await getDocument<Organization>(COLLECTIONS.ORGANIZATIONS, user.organizationId)
        if (org?.backgroundColor) {
          setUserOrgColor(org.backgroundColor)
        } else {
          setUserOrgColor(null)
        }
      } catch (err) {
        console.error("Failed to fetch user org background:", err)
        setUserOrgColor(null)
      }
    }
    fetchUserOrgColor()
  }, [user?.organizationId])

  // Priority: preview (org settings editing) > selectedOrg (super admin viewing) > userOrg > default
  const backgroundColor = previewColor ?? selectedOrgColor ?? userOrgColor ?? "#09090b"

  const handleSetPreviewColor = useCallback((color: string | null) => {
    setPreviewColor(color)
  }, [])

  const handleSetSelectedOrgColor = useCallback((color: string | null) => {
    setSelectedOrgColor(color)
  }, [])

  return (
    <BackgroundContext.Provider
      value={{
        backgroundColor,
        setPreviewColor: handleSetPreviewColor,
        setSelectedOrgColor: handleSetSelectedOrgColor,
      }}
    >
      {children}
    </BackgroundContext.Provider>
  )
}
