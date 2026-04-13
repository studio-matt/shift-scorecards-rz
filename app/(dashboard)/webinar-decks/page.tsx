"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  FileText,
  Plus,
  Upload,
  X,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/auth-context"
import {
  getOrganizations,
  getDocuments,
  createDocument,
  deleteDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { uploadWebinarPdf } from "@/lib/storage"
import type { Organization } from "@/lib/types"

interface WebinarDeck {
  id: string
  title: string
  date: string
  organizationId: string
  organizationName: string
  pdfUrl: string
  createdAt: string
  createdBy: string
}

export default function WebinarDecksPage() {
  const { user, isSuperAdmin } = useAuth()
  const [webinars, setWebinars] = useState<WebinarDeck[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [webinarToDelete, setWebinarToDelete] = useState<WebinarDeck | null>(null)

  // Form state
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [webinarDate, setWebinarDate] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [orgDocs, webinarDocs] = await Promise.all([
        getOrganizations(),
        getDocuments(COLLECTIONS.WEBINARS),
      ])
      setOrganizations(orgDocs as unknown as Organization[])
      
      // Filter webinars based on user's organization (unless super admin)
      let filteredWebinars = webinarDocs as unknown as WebinarDeck[]
      if (!isSuperAdmin && user?.organizationId) {
        filteredWebinars = filteredWebinars.filter(
          (w) => w.organizationId === user.organizationId
        )
      }
      
      // Sort by date descending (newest first)
      filteredWebinars.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      
      setWebinars(filteredWebinars)
    } catch (err) {
      console.error("Failed to load webinars:", err)
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin, user?.organizationId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCreate() {
    if (!pdfFile || !selectedOrgId || !webinarDate) return
    
    setUploading(true)
    try {
      // Upload PDF to Firebase Storage
      const pdfUrl = await uploadWebinarPdf(selectedOrgId, pdfFile)
      
      // Get organization name
      const org = organizations.find((o) => o.id === selectedOrgId)
      
      // Create webinar document
      await createDocument(COLLECTIONS.WEBINARS, {
        title: pdfFile.name.replace(/\.pdf$/i, ""),
        date: webinarDate,
        organizationId: selectedOrgId,
        organizationName: org?.name ?? "Unknown",
        pdfUrl,
        createdBy: user?.id ?? "",
      })
      
      // Refresh list
      await loadData()
      
      // Reset form
      setCreateDialogOpen(false)
      setSelectedOrgId("")
      setWebinarDate("")
      setPdfFile(null)
    } catch (err) {
      console.error("Failed to create webinar:", err)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!webinarToDelete) return
    
    setDeleting(true)
    try {
      await deleteDocument(COLLECTIONS.WEBINARS, webinarToDelete.id)
      await loadData()
      setDeleteDialogOpen(false)
      setWebinarToDelete(null)
    } catch (err) {
      console.error("Failed to delete webinar:", err)
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Webinar Decks
          </h1>
          <p className="mt-2 text-muted-foreground">
            Access presentation materials from SHIFT webinars
          </p>
        </div>
        
        {/* Create button - Super Admin only */}
        {isSuperAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Entry
          </Button>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Webinar recordings and decks.</span>{" "}
          Click on any deck to open the PDF in a new tab.
        </p>
      </div>

      {/* Webinar Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {webinars.map((webinar) => (
          <div
            key={webinar.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          >
            {/* Header Image with Date Overlay */}
            <a
              href={webinar.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-36 w-full cursor-pointer"
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Building%20the%20Limitless%20Org-cgbiPsyabIOZ6ganlKUuPo5caB4Zg1.png"
                alt={webinar.title}
                fill
                className="object-cover"
              />
              {/* Date overlay on image */}
              <div className="absolute inset-0 flex items-center justify-start bg-gradient-to-r from-black/40 to-transparent p-4">
                <h3 className="text-lg font-extrabold uppercase tracking-wide text-white drop-shadow-lg" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {formatDate(webinar.date)}
                </h3>
              </div>
              {/* SHIFT Logo */}
              <div className="absolute bottom-2 right-2">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2020_Shift_Logo_PNG_White-oHuVe5im3yqRlmCF8NxkQK11YY4Xrj.png"
                  alt="SHIFT"
                  width={24}
                  height={24}
                />
              </div>
            </a>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
              {/* Company Badge */}
              <Badge 
                variant="outline" 
                className="mb-2 w-fit bg-blue-500/10 text-blue-400 border-blue-500/20"
              >
                {webinar.organizationName}
              </Badge>

              {/* Title */}
              <p className="mb-2 text-sm font-medium text-foreground line-clamp-2">
                {webinar.title}
              </p>

              {/* Footer */}
              <div className="mt-auto flex items-center justify-between pt-2">
                <a
                  href={webinar.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" />
                  Open PDF
                  <ExternalLink className="h-3 w-3" />
                </a>
                
                {/* Delete button - Super Admin only */}
                {isSuperAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault()
                      setWebinarToDelete(webinar)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {webinars.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No webinar decks available yet</p>
          {isSuperAdmin && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Entry
            </Button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Webinar Entry</DialogTitle>
            <DialogDescription>
              Upload a PDF and assign it to a company
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Webinar Date</Label>
              <Input
                id="date"
                type="date"
                value={webinarDate}
                onChange={(e) => setWebinarDate(e.target.value)}
              />
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label>PDF File</Label>
              {pdfFile ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="flex-1 truncate text-sm">{pdfFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setPdfFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label 
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                    isDragging 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(true)
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDragging(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file && file.type === "application/pdf") {
                      setPdfFile(file)
                    }
                  }}
                >
                  <Upload className={cn(
                    "mb-2 h-8 w-8 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm transition-colors",
                    isDragging ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {isDragging ? "Drop PDF here" : "Drag & drop or click to upload PDF"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setPdfFile(file)
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!pdfFile || !selectedOrgId || !webinarDate || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Create Entry"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webinar Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webinar entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
