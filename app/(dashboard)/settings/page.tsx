"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, ChevronDown, ChevronRight, Shield, Key, ZoomIn, RotateCw } from "lucide-react"
import { uploadAvatar } from "@/lib/storage"
import { updateDocument, COLLECTIONS } from "@/lib/firestore"

// ─── Canvas-based crop helper ────────────────────────────────────────
function cropImageToCanvas(
  img: HTMLImageElement,
  zoom: number,
  offsetX: number,
  offsetY: number,
  rotation: number,
  size: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, size, size)

  const scale = zoom
  const drawW = img.width * scale
  const drawH = img.height * scale

  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(img, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH)
  ctx.restore()

  return canvas
}

// ─── Photo Upload Modal ──────────────────────────────────────────────
function PhotoUploadModal({
  open,
  onOpenChange,
  currentAvatar,
  userId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAvatar?: string
  userId: string
  onSaved: (url: string) => void
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState([1])
  const [rotation, setRotation] = useState(0)
  const [saving, setSaving] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const drawPreview = useCallback(() => {
    if (!imgRef.current || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext("2d")!
    const size = 256
    canvas.width = size
    canvas.height = size

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = "#f4f4f5"
    ctx.fillRect(0, 0, size, size)

    const img = imgRef.current
    const scale = zoom[0]
    const drawW = img.width * scale
    const drawH = img.height * scale

    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.translate(size / 2, size / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(
      img,
      -drawW / 2 + dragOffset.x,
      -drawH / 2 + dragOffset.y,
      drawW,
      drawH,
    )
    ctx.restore()
  }, [zoom, rotation, dragOffset])

  useEffect(() => {
    drawPreview()
  }, [drawPreview])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setZoom([1])
    setRotation(0)
    setDragOffset({ x: 0, y: 0 })

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imgRef.current = img
      // Auto-fit: scale so shortest side fills the 256px crop area
      const fitScale = 256 / Math.min(img.width, img.height)
      setZoom([fitScale])
    }
    img.src = url
  }

  function handleMouseDown(e: React.MouseEvent) {
    setDragging(true)
    setDragStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    setDragOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  function handleMouseUp() {
    setDragging(false)
  }

  async function handleSave() {
    if (!imgRef.current || !selectedFile) return
    setSaving(true)
    try {
      const outputCanvas = cropImageToCanvas(
        imgRef.current,
        zoom[0],
        dragOffset.x,
        dragOffset.y,
        rotation,
        512,
      )
      const blob = await new Promise<Blob>((resolve) =>
        outputCanvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9),
      )
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" })
      const downloadUrl = await uploadAvatar(userId, croppedFile)
      await updateDocument(COLLECTIONS.USERS, userId, { avatar: downloadUrl })
      onSaved(downloadUrl)
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to upload avatar:", err)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    imgRef.current = null
    setZoom([1])
    setRotation(0)
    setDragOffset({ x: 0, y: 0 })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentAvatar ? "Edit Profile Photo" : "Upload Profile Photo"}
          </DialogTitle>
        </DialogHeader>

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-4 py-6">
            {currentAvatar && (
              <Avatar className="h-24 w-24">
                <AvatarImage src={currentAvatar} alt="Current photo" />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
            )}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Click to choose a photo
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG, GIF, or WebP. Max 5MB.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
              className="sr-only"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className="relative cursor-move overflow-hidden rounded-full border-2 border-border"
              style={{ width: 256, height: 256 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={previewCanvasRef}
                width={256}
                height={256}
                className="h-64 w-64"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Drag to reposition
            </p>

            <div className="flex w-full items-center gap-3">
              <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Slider
                value={zoom}
                onValueChange={setZoom}
                min={0.1}
                max={3}
                step={0.05}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null)
                setPreviewUrl(null)
                imgRef.current = null
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Choose a different photo
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {selectedFile && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Photo"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Settings Page ───────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [email] = useState(user?.email ?? "")
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "")
  const [department, setDepartment] = useState(user?.department ?? "")
const [phone, setPhone] = useState(user?.phone ?? "")
const [emailNotifications, setEmailNotifications] = useState(true)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [twoFactorOpen, setTwoFactorOpen] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "")

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Profile Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your personal information and account preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="job-title">Job Title</Label>
                  <Input
                    id="job-title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Email Notifications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receive weekly scorecard updates via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  aria-label="Toggle email notifications"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="pt">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Pacific Time (PT)</SelectItem>
                      <SelectItem value="mt">Mountain Time (MT)</SelectItem>
                      <SelectItem value="ct">Central Time (CT)</SelectItem>
                      <SelectItem value="et">Eastern Time (ET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Language</Label>
                  <Select defaultValue="en-us">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-us">English (US)</SelectItem>
                      <SelectItem value="en-gb">English (UK)</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Change Password */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setPasswordOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Change Password
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Update your account password
                      </p>
                    </div>
                  </div>
                  {passwordOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {passwordOpen && (
                  <div className="flex flex-col gap-4 border-t border-border p-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => {
                          setCurrentPassword("")
                          setNewPassword("")
                          setConfirmPassword("")
                          setPasswordOpen(false)
                        }}
                      >
                        Update Password
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Two-Factor Authentication */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setTwoFactorOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Two-Factor Authentication
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {twoFactorEnabled
                          ? "Two-factor authentication is enabled"
                          : "Add extra security to your account"}
                      </p>
                    </div>
                  </div>
                  {twoFactorOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {twoFactorOpen && (
                  <div className="flex flex-col gap-4 border-t border-border p-4">
                    {!twoFactorEnabled ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Two-factor authentication adds an extra layer of security to your account.
                          You will need to enter a verification code each time you sign in.
                        </p>
                        <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-6">
                          <div className="text-center">
                            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                              <Shield className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              Scan QR Code
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Use your authenticator app to scan
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="verify-code">Verification Code</Label>
                          <Input
                            id="verify-code"
                            placeholder="Enter 6-digit code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            maxLength={6}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => {
                              setTwoFactorEnabled(true)
                              setVerificationCode("")
                            }}
                          >
                            Enable 2FA
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 rounded-lg bg-success/10 p-3">
                          <Shield className="h-5 w-5 text-success" />
                          <p className="text-sm font-medium text-success">
                            Two-factor authentication is active
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTwoFactorEnabled(false)}
                          >
                            Disable 2FA
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Profile photo" />
                ) : null}
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhotoModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                {avatarUrl ? "Change Photo" : "Upload Photo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF, or WebP. Max 5MB.
              </p>
            </CardContent>
          </Card>

          {/* Account Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Account Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Member since", value: "Jan 2024" },
                  { label: "Scorecards created", value: "12" },
                  { label: "Total responses", value: "248" },
                  { label: "Last login", value: "Today" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {stat.label}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        open={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        currentAvatar={avatarUrl || undefined}
        userId={user?.id ?? ""}
        onSaved={(url) => setAvatarUrl(url)}
      />
    </div>
  )
}
