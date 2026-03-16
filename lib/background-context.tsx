"use client"

// Branding context provider for organization colors throughout the app
import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDocument, COLLECTIONS } from "@/lib/firestore"
import type { Organization, GlobalSettings } from "@/lib/types"

interface BrandingContextType {
  backgroundColor: string
  buttonColor: string
  buttonFontColor: string
  accentColor: string
  setPreviewColor: (color: string | null) => void
  setSelectedOrgColor: (color: string | null) => void
  setPreviewButtonColor: (color: string | null) => void
  setSelectedOrgButtonColor: (color: string | null) => void
  setPreviewButtonFontColor: (color: string | null) => void
  setSelectedOrgButtonFontColor: (color: string | null) => void
  setPreviewAccentColor: (color: string | null) => void
  setSelectedOrgAccentColor: (color: string | null) => void
}

const DEFAULT_BUTTON_COLOR = "#3b82f6" // Blue default
const DEFAULT_BUTTON_FONT_COLOR = "#ffffff" // White default
const DEFAULT_ACCENT_COLOR = "#3b82f6" // Blue default

const BrandingContext = createContext<BrandingContextType>({
  backgroundColor: "#09090b",
  buttonColor: DEFAULT_BUTTON_COLOR,
  buttonFontColor: DEFAULT_BUTTON_FONT_COLOR,
  accentColor: DEFAULT_ACCENT_COLOR,
  setPreviewColor: () => {},
  setSelectedOrgColor: () => {},
  setPreviewButtonColor: () => {},
  setSelectedOrgButtonColor: () => {},
  setPreviewButtonFontColor: () => {},
  setSelectedOrgButtonFontColor: () => {},
  setPreviewAccentColor: () => {},
  setSelectedOrgAccentColor: () => {},
})

export function useBackground() {
  return useContext(BrandingContext)
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  // Global defaults (from admin settings)
  const [globalBgColor, setGlobalBgColor] = useState<string | null>(null)
  const [globalButtonColor, setGlobalButtonColor] = useState<string | null>(null)
  const [globalButtonFontColor, setGlobalButtonFontColor] = useState<string | null>(null)
  const [globalAccentColor, setGlobalAccentColor] = useState<string | null>(null)
  // Background color state
  const [userOrgColor, setUserOrgColor] = useState<string | null>(null)
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [selectedOrgColor, setSelectedOrgColor] = useState<string | null>(null)
  // Button color state
  const [userOrgButtonColor, setUserOrgButtonColor] = useState<string | null>(null)
  const [previewButtonColor, setPreviewButtonColor] = useState<string | null>(null)
  const [selectedOrgButtonColor, setSelectedOrgButtonColor] = useState<string | null>(null)
  // Button font color state
  const [userOrgButtonFontColor, setUserOrgButtonFontColor] = useState<string | null>(null)
  const [previewButtonFontColor, setPreviewButtonFontColor] = useState<string | null>(null)
  const [selectedOrgButtonFontColor, setSelectedOrgButtonFontColor] = useState<string | null>(null)
  // Accent color state (for charts/graphs)
  const [userOrgAccentColor, setUserOrgAccentColor] = useState<string | null>(null)
  const [previewAccentColor, setPreviewAccentColor] = useState<string | null>(null)
  const [selectedOrgAccentColor, setSelectedOrgAccentColor] = useState<string | null>(null)

  // Fetch global defaults on mount
  useEffect(() => {
    async function fetchGlobalDefaults() {
      try {
        const settings = await getDocument<GlobalSettings>(COLLECTIONS.SETTINGS, "global")
        if (settings?.branding) {
          setGlobalBgColor(settings.branding.backgroundColor)
          setGlobalButtonColor(settings.branding.buttonColor)
          setGlobalButtonFontColor(settings.branding.buttonFontColor)
          setGlobalAccentColor(settings.branding.accentColor)
        }
      } catch (err) {
        console.error("Failed to fetch global branding defaults:", err)
      }
    }
    fetchGlobalDefaults()
  }, [])

  // Fetch user's organization branding colors
  useEffect(() => {
    async function fetchUserOrgColors() {
      if (!user?.organizationId) {
        setUserOrgColor(null)
        setUserOrgButtonColor(null)
        setUserOrgButtonFontColor(null)
        setUserOrgAccentColor(null)
        return
      }
      try {
        const org = await getDocument<Organization>(COLLECTIONS.ORGANIZATIONS, user.organizationId)
        setUserOrgColor(org?.backgroundColor ?? null)
        setUserOrgButtonColor(org?.buttonColor ?? null)
        setUserOrgButtonFontColor(org?.buttonFontColor ?? null)
        setUserOrgAccentColor(org?.accentColor ?? null)
      } catch (err) {
        console.error("Failed to fetch user org branding:", err)
        setUserOrgColor(null)
        setUserOrgButtonColor(null)
        setUserOrgButtonFontColor(null)
        setUserOrgAccentColor(null)
      }
    }
    fetchUserOrgColors()
  }, [user?.organizationId])

  // Priority: preview > selectedOrg > userOrg > globalDefault > hardcoded default
  const backgroundColor = previewColor ?? selectedOrgColor ?? userOrgColor ?? globalBgColor ?? "#09090b"
  const buttonColor = previewButtonColor ?? selectedOrgButtonColor ?? userOrgButtonColor ?? globalButtonColor ?? DEFAULT_BUTTON_COLOR
  const buttonFontColor = previewButtonFontColor ?? selectedOrgButtonFontColor ?? userOrgButtonFontColor ?? globalButtonFontColor ?? DEFAULT_BUTTON_FONT_COLOR
  const accentColor = previewAccentColor ?? selectedOrgAccentColor ?? userOrgAccentColor ?? globalAccentColor ?? DEFAULT_ACCENT_COLOR

  // Apply branding colors as CSS variables for global access
  useEffect(() => {
    document.documentElement.style.setProperty("--org-button-color", buttonColor)
    document.documentElement.style.setProperty("--org-button-font-color", buttonFontColor)
    document.documentElement.style.setProperty("--org-accent-color", accentColor)
  }, [buttonColor, buttonFontColor, accentColor])

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

  const handleSetPreviewButtonFontColor = useCallback((color: string | null) => {
    setPreviewButtonFontColor(color)
  }, [])

  const handleSetSelectedOrgButtonFontColor = useCallback((color: string | null) => {
    setSelectedOrgButtonFontColor(color)
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
        buttonFontColor,
        accentColor,
        setPreviewColor: handleSetPreviewColor,
        setSelectedOrgColor: handleSetSelectedOrgColor,
        setPreviewButtonColor: handleSetPreviewButtonColor,
        setSelectedOrgButtonColor: handleSetSelectedOrgButtonColor,
        setPreviewButtonFontColor: handleSetPreviewButtonFontColor,
        setSelectedOrgButtonFontColor: handleSetSelectedOrgButtonFontColor,
        setPreviewAccentColor: handleSetPreviewAccentColor,
        setSelectedOrgAccentColor: handleSetSelectedOrgAccentColor,
      }}
    >
      {children}
    </BrandingContext.Provider>
  )
}
