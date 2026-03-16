"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDocument, COLLECTIONS } from "@/lib/firestore"
import type { Organization } from "@/lib/types"

interface BrandingContextType {
  backgroundColor: string
  buttonColor: string
  accentColor: string
  setPreviewColor: (color: string | null) => void
  setSelectedOrgColor: (color: string | null) => void
  setPreviewButtonColor: (color: string | null) => void
  setSelectedOrgButtonColor: (color: string | null) => void
  setPreviewAccentColor: (color: string | null) => void
  setSelectedOrgAccentColor: (color: string | null) => void
}

const DEFAULT_BUTTON_COLOR = "#3b82f6" // Blue
const DEFAULT_ACCENT_COLOR = "#3b82f6" // Blue

const BrandingContext = createContext<BrandingContextType>({
  backgroundColor: "#09090b",
  buttonColor: DEFAULT_BUTTON_COLOR,
  accentColor: DEFAULT_ACCENT_COLOR,
  setPreviewColor: () => {},
  setSelectedOrgColor: () => {},
  setPreviewButtonColor: () => {},
  setSelectedOrgButtonColor: () => {},
  setPreviewAccentColor: () => {},
  setSelectedOrgAccentColor: () => {},
})

export function useBackground() {
  return useContext(BrandingContext)
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  // Background color state
  const [userOrgColor, setUserOrgColor] = useState<string | null>(null)
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [selectedOrgColor, setSelectedOrgColor] = useState<string | null>(null)
  // Button color state
  const [userOrgButtonColor, setUserOrgButtonColor] = useState<string | null>(null)
  const [previewButtonColor, setPreviewButtonColor] = useState<string | null>(null)
  const [selectedOrgButtonColor, setSelectedOrgButtonColor] = useState<string | null>(null)
  // Accent color state (for charts/graphs)
  const [userOrgAccentColor, setUserOrgAccentColor] = useState<string | null>(null)
  const [previewAccentColor, setPreviewAccentColor] = useState<string | null>(null)
  const [selectedOrgAccentColor, setSelectedOrgAccentColor] = useState<string | null>(null)

  // Fetch user's organization branding colors
  useEffect(() => {
    async function fetchUserOrgColors() {
      if (!user?.organizationId) {
        setUserOrgColor(null)
        setUserOrgButtonColor(null)
        setUserOrgAccentColor(null)
        return
      }
      try {
        const org = await getDocument<Organization>(COLLECTIONS.ORGANIZATIONS, user.organizationId)
        setUserOrgColor(org?.backgroundColor ?? null)
        setUserOrgButtonColor(org?.buttonColor ?? null)
        setUserOrgAccentColor(org?.accentColor ?? null)
      } catch (err) {
        console.error("Failed to fetch user org branding:", err)
        setUserOrgColor(null)
        setUserOrgButtonColor(null)
        setUserOrgAccentColor(null)
      }
    }
    fetchUserOrgColors()
  }, [user?.organizationId])

  // Priority: preview > selectedOrg > userOrg > default
  const backgroundColor = previewColor ?? selectedOrgColor ?? userOrgColor ?? "#09090b"
  const buttonColor = previewButtonColor ?? selectedOrgButtonColor ?? userOrgButtonColor ?? DEFAULT_BUTTON_COLOR
  const accentColor = previewAccentColor ?? selectedOrgAccentColor ?? userOrgAccentColor ?? DEFAULT_ACCENT_COLOR

  // Apply branding colors as CSS variables for global access
  useEffect(() => {
    document.documentElement.style.setProperty("--org-button-color", buttonColor)
    document.documentElement.style.setProperty("--org-accent-color", accentColor)
  }, [buttonColor, accentColor])

  const handleSetPreviewColor = useCallback((color: string | null) => {
    setPreviewColor(color)
  }, [])

  const handleSetSelectedOrgColor = useCallback((color: string | null) => {
    setSelectedOrgColor(color)
  }, [])

  const handleSetPreviewButtonColor = useCallback((color: string | null) => {
    setPreviewButtonColor(color)
  }, [])

  const handleSetSelectedOrgButtonColor = useCallback((color: string | null) => {
    setSelectedOrgButtonColor(color)
  }, [])

  const handleSetPreviewAccentColor = useCallback((color: string | null) => {
    setPreviewAccentColor(color)
  }, [])

  const handleSetSelectedOrgAccentColor = useCallback((color: string | null) => {
    setSelectedOrgAccentColor(color)
  }, [])

  return (
    <BrandingContext.Provider
      value={{
        backgroundColor,
        buttonColor,
        accentColor,
        setPreviewColor: handleSetPreviewColor,
        setSelectedOrgColor: handleSetSelectedOrgColor,
        setPreviewButtonColor: handleSetPreviewButtonColor,
        setSelectedOrgButtonColor: handleSetSelectedOrgButtonColor,
        setPreviewAccentColor: handleSetPreviewAccentColor,
        setSelectedOrgAccentColor: handleSetSelectedOrgAccentColor,
      }}
    >
      {children}
    </BrandingContext.Provider>
  )
}
