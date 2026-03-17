"use client"

// Global admin settings for organization branding defaults
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useBackground } from "@/lib/background-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getDocument,
  setDocument,
  getDocuments,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { Shield, Palette, Save, RotateCcw, AlertTriangle, Loader2 } from "lucide-react"
import type { GlobalSettings, Organization } from "@/lib/types"

const ACCENT_PRESETS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Slate", value: "#64748b" },
]

const BACKGROUND_PRESETS = [
  { label: "Default Dark", value: "#09090b" },
  { label: "Charcoal", value: "#18181b" },
  { label: "Navy", value: "#0c1222" },
  { label: "Dark Slate", value: "#0f172a" },
  { label: "Dark Green", value: "#052e16" },
  { label: "Dark Purple", value: "#1e1b4b" },
  { label: "Dark Brown", value: "#1c1917" },
  { label: "Pure Black", value: "#000000" },
]

const BUTTON_COLOR_PRESETS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Purple", value: "#a855f7" },
]

const BUTTON_FONT_COLOR_PRESETS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Light Gray", value: "#f4f4f5" },
  { label: "Dark Gray", value: "#18181b" },
]

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  id: "global",
  branding: {
    accentColor: "#3b82f6",
    backgroundColor: "#09090b",
    buttonColor: "#3b82f6",
    buttonFontColor: "#ffffff",
  },
  updatedAt: new Date().toISOString(),
  updatedBy: "",
}

export default function AdminSettingsPage() {
  const { isSuperAdmin, user } = useAuth()
  const router = useRouter()
  const { setPreviewColor, setPreviewButtonColor, setPreviewButtonFontColor, setPreviewAccentColor } = useBackground()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [orgCount, setOrgCount] = useState(0)

  // Branding state
  const [accentColor, setAccentColor] = useState("#3b82f6")
  const [backgroundColor, setBackgroundColor] = useState("#09090b")
  const [buttonColor, setButtonColor] = useState("#3b82f6")
  const [buttonFontColor, setButtonFontColor] = useState("#ffffff")

  // Redirect non-super-admins
  useEffect(() => {
    if (!isSuperAdmin) {
      router.push("/dashboard")
    }
  }, [isSuperAdmin, router])

  // Load global settings
  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getDocument<GlobalSettings>(COLLECTIONS.SETTINGS, "global")
      if (settings) {
        setAccentColor(settings.branding.accentColor)
        setBackgroundColor(settings.branding.backgroundColor)
        setButtonColor(settings.branding.buttonColor)
        setButtonFontColor(settings.branding.buttonFontColor ?? "#ffffff")
      }
      // Get org count for reset dialog
      const orgs = await getDocuments<Organization>(COLLECTIONS.ORGANIZATIONS)
      setOrgCount(orgs.length)
    } catch (err) {
      console.error("Failed to load global settings:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Live preview
  useEffect(() => {
    setPreviewColor(backgroundColor)
    setPreviewButtonColor(buttonColor)
    setPreviewButtonFontColor(buttonFontColor)
    setPreviewAccentColor(accentColor)
    return () => {
      setPreviewColor(null)
      setPreviewButtonColor(null)
      setPreviewButtonFontColor(null)
      setPreviewAccentColor(null)
    }
  }, [backgroundColor, buttonColor, buttonFontColor, accentColor, setPreviewColor, setPreviewButtonColor, setPreviewButtonFontColor, setPreviewAccentColor])

  // Save global settings
  async function handleSave() {
    setSaving(true)
    try {
      const settings: GlobalSettings = {
        id: "global",
        branding: {
          accentColor,
          backgroundColor,
          buttonColor,
          buttonFontColor,
        },
        updatedAt: new Date().toISOString(),
        updatedBy: user?.id ?? "",
      }
      await setDocument(COLLECTIONS.SETTINGS, "global", settings)
    } catch (err) {
      console.error("Failed to save global settings:", err)
    } finally {
      setSaving(false)
    }
  }

  // Reset all organizations to global defaults
  async function handleResetAll() {
    setResetting(true)
    try {
      const orgs = await getDocuments<Organization>(COLLECTIONS.ORGANIZATIONS)
      console.log("[v0] Resetting branding for", orgs.length, "organizations")
      console.log("[v0] New values - accent:", accentColor, "bg:", backgroundColor, "button:", buttonColor, "buttonFont:", buttonFontColor)
      
      // Update all organizations with global branding (but NOT logoUrl)
      await Promise.all(
        orgs.map((org) =>
          updateDocument(COLLECTIONS.ORGANIZATIONS, org.id, {
            accentColor,
            backgroundColor,
            buttonColor,
            buttonFontColor,
            // Note: logoUrl is NOT changed
          })
        )
      )
      
      console.log("[v0] Reset complete, reloading page...")
      setShowResetDialog(false)
      // Reload the page to refresh branding context with new values
      window.location.reload()
    } catch (err) {
      console.error("Failed to reset organization branding:", err)
    } finally {
      setResetting(false)
    }
  }

  if (!isSuperAdmin) return null

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Settings</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Configure global defaults for all organizations. Individual organizations can override these settings.
        </p>
      </div>

      {/* Global Branding Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>Global Branding Defaults</CardTitle>
          </div>
          <CardDescription>
            These colors will be used as defaults for all organizations. Organizations can override these in their settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Accent Color */}
          <div className="flex flex-col gap-2">
            <Label>Accent Color</Label>
            <p className="text-xs text-muted-foreground">Used for charts, graphs, and data visualizations</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setAccentColor(preset.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      accentColor === preset.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-24 font-mono text-xs h-7"
                  placeholder="#3b82f6"
                />
                <label className="relative h-7 w-7 cursor-pointer rounded border border-border overflow-hidden" title="Pick a custom color">
                  <div className="absolute inset-0" style={{ backgroundColor: accentColor }} />
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Page Background */}
          <div className="flex flex-col gap-2">
            <Label>Page Background</Label>
            <p className="text-xs text-muted-foreground">Background color for the entire application</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setBackgroundColor(preset.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      backgroundColor === preset.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-24 font-mono text-xs h-7"
                  placeholder="#09090b"
                />
                <label className="relative h-7 w-7 cursor-pointer rounded border border-border overflow-hidden" title="Pick a custom color">
                  <div className="absolute inset-0" style={{ backgroundColor: backgroundColor }} />
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Button Color */}
          <div className="flex flex-col gap-2">
            <Label>Button Color</Label>
            <p className="text-xs text-muted-foreground">Primary button and toggle color throughout the app</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {BUTTON_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setButtonColor(preset.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      buttonColor === preset.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="w-24 font-mono text-xs h-7"
                  placeholder="#3b82f6"
                />
                <label className="relative h-7 w-7 cursor-pointer rounded border border-border overflow-hidden" title="Pick a custom color">
                  <div className="absolute inset-0" style={{ backgroundColor: buttonColor }} />
                  <input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Button Font Color */}
          <div className="flex flex-col gap-2">
            <Label>Button Font Color</Label>
            <p className="text-xs text-muted-foreground">Text color on buttons throughout the app</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {BUTTON_FONT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setButtonFontColor(preset.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      buttonFontColor === preset.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={buttonFontColor}
                  onChange={(e) => setButtonFontColor(e.target.value)}
                  className="w-24 font-mono text-xs h-7"
                  placeholder="#ffffff"
                />
                <label className="relative h-7 w-7 cursor-pointer rounded border border-border overflow-hidden" title="Pick a custom color">
                  <div className="absolute inset-0" style={{ backgroundColor: buttonFontColor }} />
                  <input
                    type="color"
                    value={buttonFontColor}
                    onChange={(e) => setButtonFontColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Live Preview</p>
            <div className="flex items-center gap-4">
              <div className="rounded-lg p-4" style={{ backgroundColor }}>
                <div className="flex items-center gap-2">
                  <Button size="sm" style={{ backgroundColor: buttonColor, color: buttonFontColor }}>
                    Sample Button
                  </Button>
                  <Badge style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                    Accent Badge
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <div className="h-6 w-16 rounded" style={{ backgroundColor: accentColor }} />
                  <div className="h-6 w-12 rounded" style={{ backgroundColor: accentColor, opacity: 0.7 }} />
                  <div className="h-6 w-8 rounded" style={{ backgroundColor: accentColor, opacity: 0.4 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Global Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset All Organizations Card */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Reset All Organization Branding</CardTitle>
          </div>
          <CardDescription>
            Reset all organizations to use the global branding defaults above. This will overwrite any custom branding settings for all organizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">This action will:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Reset <span className="font-medium text-foreground">accent color</span> for all {orgCount} organizations</li>
                  <li>Reset <span className="font-medium text-foreground">page background</span> for all {orgCount} organizations</li>
                  <li>Reset <span className="font-medium text-foreground">button color</span> for all {orgCount} organizations</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-medium text-foreground">Organization logos will NOT be affected.</span>
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="destructive" onClick={() => setShowResetDialog(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All Branding Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset All Organization Branding
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm resetting all organization branding settings to global defaults
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              You are about to reset branding settings for <span className="font-semibold text-foreground">{orgCount} organizations</span>.
            </p>
            <p>
              This will overwrite all custom accent colors, page backgrounds, and button colors with the global defaults you have configured.
            </p>
            <p className="font-semibold text-destructive">
              This action is irreversible.
            </p>
            <p className="text-muted-foreground">
              Note: Organization logos will not be affected by this reset.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetAll} disabled={resetting}>
              {resetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Yes, Reset All Branding
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
