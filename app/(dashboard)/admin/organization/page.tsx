"use client"

import { useState, useEffect, useCallback } from "react"
import { useBackground } from "@/lib/background-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2,
  Plus,
  Trash2,
  Users,
  Globe,
  Mail,
  ArrowLeft,
  MoreVertical,
  Pencil,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Save,
  Upload,
  FileDown,
  UserPlus,
  Palette,
  Image,
  Settings2,
  Eye,
  EyeOff,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import type { Organization } from "@/lib/types"
import {
  getOrganizations,
  getUsersByOrg,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  setDocument,
  COLLECTIONS,
} from "@/lib/firestore"

/** Proper-case a name: "kristen abbott" → "Kristen Abbott" */
function properCase(name: string): string {
  return name
    .split(" ")
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim()
}

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

const KNOWN_DEPARTMENTS = [
  "Engineering", "Design", "Product", "Marketing", "Sales",
  "Operations", "HR", "Finance", "Customer Success", "IT",
  "Legal", "Executive",
]

const INDUSTRIES = [
  "Consulting",
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Other",
]

export default function OrganizationPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [scrollToMembers, setScrollToMembers] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchOrgs = useCallback(async () => {
    try {
      setLoading(true)
      const [orgs, allUsers] = await Promise.all([
        getOrganizations(),
        getDocuments(COLLECTIONS.USERS),
      ])
      // Build a real member count per org from the users collection
      const countMap = new Map<string, number>()
      for (const u of allUsers) {
        const orgId = (u as Record<string, unknown>).organizationId as string
        if (orgId) countMap.set(orgId, (countMap.get(orgId) ?? 0) + 1)
      }
      setOrganizations(
        orgs.map((o) => ({
          id: o.id,
          name: o.name ?? "",
          departments: o.departments ?? [],
          createdAt: o.createdAt
            ? typeof o.createdAt === "string"
              ? o.createdAt
              : new Date((o.createdAt as { seconds: number }).seconds * 1000)
                  .toISOString()
                  .split("T")[0]
            : "",
          website: o.website,
          contactEmail: o.contactEmail,
          industry: o.industry,
          memberCount: countMap.get(o.id) ?? 0,
          accentColor: o.accentColor,
          backgroundColor: o.backgroundColor,
          buttonColor: o.buttonColor,
          logoUrl: o.logoUrl,
          reportingPreferences: o.reportingPreferences,
        })) as Organization[],
      )
    } catch (err) {
      console.error("Failed to fetch organizations:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.industry ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Create form state
  const [newName, setNewName] = useState("")
  const [newWebsite, setNewWebsite] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newIndustry, setNewIndustry] = useState("")

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId)

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const docId = await createDocument(COLLECTIONS.ORGANIZATIONS, {
        name: newName.trim(),
        departments: [],
        website: newWebsite.trim() || undefined,
        contactEmail: newEmail.trim() || undefined,
        industry: newIndustry || undefined,
        memberCount: 0,
      })
      setNewName("")
      setNewWebsite("")
      setNewEmail("")
      setNewIndustry("")
      setCreateDialogOpen(false)
      await fetchOrgs()
      setSelectedOrgId(docId)
    } catch (err) {
      console.error("Failed to create organization:", err)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(COLLECTIONS.ORGANIZATIONS, id)
      if (selectedOrgId === id) setSelectedOrgId(null)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      await fetchOrgs()
    } catch (err) {
      console.error("Failed to delete organization:", err)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If no org selected, show the list view
  if (!selectedOrg) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Organizations
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage all organizations in the system
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Organization
          </Button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center rounded-l-md px-3 py-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center justify-center rounded-r-md px-3 py-2 transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredOrgs.length} organization
            {filteredOrgs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrgs.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedOrgId(org.id)}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="flex items-center gap-3">
                    {org.logoUrl ? (
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                        <img src={org.logoUrl} alt="" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
                      </div>
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: org.accentColor ? `${org.accentColor}20` : 'hsl(var(--primary) / 0.1)' }}
                      >
                        <Building2 className="h-5 w-5" style={{ color: org.accentColor || 'hsl(var(--primary))' }} />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{org.name}</CardTitle>
                      {org.industry && (
                        <CardDescription className="text-xs">
                          {org.industry}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrgId(org.id)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(org.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 text-sm transition-colors hover:bg-primary/5"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrgId(org.id)
                        setScrollToMembers(true)
                      }}
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        Members
                      </span>
                      <span className="font-medium text-primary">
                        {org.memberCount ?? 0}
                      </span>
                    </button>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Departments</span>
                      <span className="font-medium text-foreground">
                        {org.departments.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium text-foreground">
                        {org.createdAt}
                      </span>
                    </div>
                  </div>
                  {org.departments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {org.departments.slice(0, 4).map((dept) => (
                        <Badge key={dept} variant="secondary" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                      {org.departments.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{org.departments.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="hidden items-center gap-4 rounded-md bg-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:flex">
              <span className="flex-1">Organization</span>
              <span className="w-24 text-center">Industry</span>
              <span className="w-20 text-center">Members</span>
              <span className="w-20 text-center">Depts</span>
              <span className="w-24 text-center">Created</span>
              <span className="w-16" />
            </div>
            {filteredOrgs.map((org) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrgId(org.id)}
                className="flex cursor-pointer items-center gap-4 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted"
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {org.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {org.departments.slice(0, 3).map((dept) => (
                        <Badge
                          key={dept}
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {dept}
                        </Badge>
                      ))}
                      {org.departments.length > 3 && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          +{org.departments.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <span className="hidden w-24 text-center text-sm text-muted-foreground md:block">
                  {org.industry ?? "-"}
                </span>
                <button
                  type="button"
                  className="hidden w-20 rounded px-1 py-0.5 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/5 md:block"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedOrgId(org.id)
                    setScrollToMembers(true)
                  }}
                >
                  {org.memberCount ?? 0}
                </button>
                <span className="hidden w-20 text-center text-sm font-medium text-foreground md:block">
                  {org.departments.length}
                </span>
                <span className="hidden w-24 text-center text-sm text-muted-foreground md:block">
                  {org.createdAt}
                </span>
                <div className="flex w-16 justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrgId(org.id)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(org.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOrgs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              No organizations found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery
                ? "Try a different search term"
                : "Create your first organization to get started"}
            </p>
          </div>
        )}

        {/* Create Dialog */}
        <CreateOrgDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          name={newName}
          setName={setNewName}
          website={newWebsite}
          setWebsite={setNewWebsite}
          email={newEmail}
          setEmail={setNewEmail}
          industry={newIndustry}
          setIndustry={setNewIndustry}
          onCreate={handleCreate}
        />

        {/* Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Organization</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this organization? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Detail / landing page for selected org
  return (
    <OrgDetailView
      key={selectedOrg.id}
      org={selectedOrg}
      scrollToMembers={scrollToMembers}
      onScrollToMembersDone={() => setScrollToMembers(false)}
      onBack={() => setSelectedOrgId(null)}
      onUpdate={async (updated) => {
        try {
  await updateDocument(COLLECTIONS.ORGANIZATIONS, updated.id, {
  name: updated.name,
  departments: updated.departments,
  website: updated.website ?? null,
  contactEmail: updated.contactEmail ?? null,
  industry: updated.industry ?? null,
  accentColor: updated.accentColor ?? null,
  backgroundColor: updated.backgroundColor ?? null,
  buttonColor: updated.buttonColor ?? null,
  logoUrl: updated.logoUrl ?? null,
  reportingPreferences: updated.reportingPreferences ?? null,
  })
          await fetchOrgs()
        } catch (err) {
          console.error("Failed to update organization:", err)
        }
      }}
    />
  )
}

// ------------------------------------------------------------------
// Create Organization Dialog
// ------------------------------------------------------------------
function CreateOrgDialog({
  open,
  onOpenChange,
  name,
  setName,
  website,
  setWebsite,
  email,
  setEmail,
  industry,
  setIndustry,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  setName: (v: string) => void
  website: string
  setWebsite: (v: string) => void
  email: string
  setEmail: (v: string) => void
  industry: string
  setIndustry: (v: string) => void
  onCreate: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Set up a new organization to manage a separate team or company.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-org-name">Organization Name</Label>
            <Input
              id="new-org-name"
              placeholder="Enter organization name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-org-website">Website</Label>
            <Input
              id="new-org-website"
              placeholder="https://company.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-org-email">Contact Email</Label>
            <Input
              id="new-org-email"
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-org-industry">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!name.trim()}>
            Create Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ------------------------------------------------------------------
// Organization Detail / Landing Page
// ------------------------------------------------------------------
function OrgDetailView({
  org,
  scrollToMembers: shouldScrollToMembers,
  onScrollToMembersDone,
  onBack,
  onUpdate,
  }: {
  org: Organization
  scrollToMembers?: boolean
  onScrollToMembersDone?: () => void
  onBack: () => void
  onUpdate: (updated: Organization) => Promise<void> | void
  }) {
  const [orgName, setOrgName] = useState(org.name)
  const [website, setWebsite] = useState(org.website ?? "")
  const [contactEmail, setContactEmail] = useState(org.contactEmail ?? "")
  const [industry, setIndustry] = useState(org.industry ?? "")
  const [departments, setDepartments] = useState(org.departments)
  const [newDepartment, setNewDepartment] = useState("")
  const [selectedKnownDept, setSelectedKnownDept] = useState("")
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<{ id: string; firstName: string; lastName: string; name: string; email: string; department: string; role: string }[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [memberSearch, setMemberSearch] = useState("")
  const [editingMember, setEditingMember] = useState<{ id: string; firstName: string; lastName: string; email: string; department: string; role: string } | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Branding & Settings state
  const [accentColor, setAccentColor] = useState(org.accentColor ?? "#3b82f6")
  const [backgroundColor, setBackgroundColor] = useState(org.backgroundColor ?? "#09090b")
  const [buttonColor, setButtonColor] = useState(org.buttonColor ?? "#3b82f6")
  const [logoUrl, setLogoUrl] = useState(org.logoUrl ?? "")
  const [logoUploading, setLogoUploading] = useState(false)

  // Import and use branding context for live preview
  const { setPreviewColor, setPreviewButtonColor } = useBackground()

  // Live preview of branding colors via context
  useEffect(() => {
    setPreviewColor(backgroundColor)
    setPreviewButtonColor(buttonColor)
    // Clear preview when leaving the page
    return () => {
      setPreviewColor(null)
      setPreviewButtonColor(null)
    }
  }, [backgroundColor, buttonColor, setPreviewColor, setPreviewButtonColor])
  const [anonymizeByDefault, setAnonymizeByDefault] = useState(org.reportingPreferences?.anonymizeByDefault ?? true)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("orgId", org.id)
      if (logoUrl) formData.append("previousUrl", logoUrl)
      const res = await fetch("/api/upload/logo", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const { url } = await res.json()
      setLogoUrl(url)
      // Save to Firestore without triggering a full re-fetch/re-mount
      await updateDocument(COLLECTIONS.ORGANIZATIONS, org.id, { logoUrl: url })
    } catch (err) {
      console.error("Logo upload error:", err)
    }
    setLogoUploading(false)
    // Reset the input so the same file can be re-selected
    e.target.value = ""
  }
  const [includeInBenchmarking, setIncludeInBenchmarking] = useState(org.reportingPreferences?.includeInBenchmarking ?? true)
  const [scorecardCadence, setScorecardCadence] = useState<"weekly" | "biweekly" | "monthly">(org.reportingPreferences?.scorecardCadence ?? "monthly")
  const [autoReminders, setAutoReminders] = useState(org.reportingPreferences?.autoReminders ?? true)
  const [settingsExpanded, setSettingsExpanded] = useState(true)

  // Invite members state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("user")
  const [inviteDepartment, setInviteDepartment] = useState("")
  const [inviteCsvFile, setInviteCsvFile] = useState<File | null>(null)
  const [inviteCsvCount, setInviteCsvCount] = useState(0)
  const [inviteCsvDepartment, setInviteCsvDepartment] = useState("")
  const [inviteSending, setInviteSending] = useState(false)

  function handleInviteCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setInviteCsvFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      setInviteCsvCount(Math.max(0, lines.length - 1))
    }
    reader.readAsText(file)
  }

  function handleDownloadTemplate() {
    const csvContent = "email,firstName,lastName,department\njane@company.com,Jane,Doe,Engineering\njohn@company.com,John,Smith,Sales"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "shift-invite-template.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleInvite() {
    setInviteSending(true)
    const emailsToSend: string[] = []
    try {
      if (inviteCsvFile) {
        const text = await inviteCsvFile.text()
        const lines = text.split("\n").filter((l) => l.trim())
        const headers = lines[0].toLowerCase().split(",").map((h) => h.trim())
        const colIdx = {
          email: Math.max(headers.indexOf("email"), 0),
          firstName: headers.indexOf("firstname"),
          lastName: headers.indexOf("lastname"),
          department: headers.indexOf("department"),
        }
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((s) => s.trim())
          const email = parts[colIdx.email] ?? ""
          const firstName = colIdx.firstName >= 0 ? properCase(parts[colIdx.firstName] ?? "") : ""
          const lastName = colIdx.lastName >= 0 ? properCase(parts[colIdx.lastName] ?? "") : ""
          const dept = inviteCsvDepartment || (colIdx.department >= 0 ? parts[colIdx.department] : "") || ""
          if (email && email.includes("@")) {
            await createDocument(COLLECTIONS.INVITES, {
              email,
              firstName,
              lastName,
              department: dept,
              organizationId: org.id,
              role: "user",
              status: "pending",
              createdAt: new Date().toISOString(),
            })
            emailsToSend.push(email)
          }
        }
      } else if (inviteEmail) {
        await createDocument(COLLECTIONS.INVITES, {
          email: inviteEmail,
          department: inviteDepartment,
          organizationId: org.id,
          role: inviteRole,
          status: "pending",
          createdAt: new Date().toISOString(),
        })
        emailsToSend.push(inviteEmail)
      }
      if (emailsToSend.length > 0) {
        try {
          await fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: emailsToSend, orgName: org.name }),
          })
        } catch { /* email delivery is best-effort */ }
      }
    } catch (err) {
      console.error("Failed to send invite:", err)
    }
    setInviteDialogOpen(false)
    setInviteEmail("")
    setInviteRole("user")
    setInviteDepartment("")
    setInviteCsvFile(null)
    setInviteCsvCount(0)
    setInviteCsvDepartment("")
    setInviteSending(false)
    // Re-fetch members to show newly invited users
    try {
      const docs = await getUsersByOrg(org.id)
      setMembers(
        docs.map((d) => {
          const data = d as Record<string, unknown>
          const first = (data.firstName as string) ?? ""
          const last = (data.lastName as string) ?? ""
          return {
            id: d.id,
            firstName: first,
            lastName: last,
            name: `${first} ${last}`.trim() || ((data.email as string) ?? "Unknown"),
            email: (data.email as string) ?? "",
            department: (data.department as string) ?? "",
            role: (data.role as string) ?? "user",
          }
        }),
      )
    } catch { /* ignore */ }
  }

  useEffect(() => {
    async function fetchMembers() {
      try {
        setMembersLoading(true)
        const docs = await getUsersByOrg(org.id)
        setMembers(
          docs.map((d) => {
            const data = d as Record<string, unknown>
            const first = (data.firstName as string) ?? ""
            const last = (data.lastName as string) ?? ""
            return {
              id: d.id,
              firstName: first,
              lastName: last,
              name: `${first} ${last}`.trim() || ((data.email as string) ?? "Unknown"),
              email: (data.email as string) ?? "",
              department: (data.department as string) ?? "",
              role: (data.role as string) ?? "user",
            }
          }),
        )
      } catch (err) {
        console.error("Failed to fetch members:", err)
      } finally {
        setMembersLoading(false)
      }
    }
    fetchMembers()
  }, [org.id])

  useEffect(() => {
    if (shouldScrollToMembers && !membersLoading) {
      const el = document.getElementById("members-section")
      if (el) {
        el.scrollIntoView({ behavior: "smooth" })
      }
      onScrollToMembersDone?.()
    }
  }, [shouldScrollToMembers, membersLoading, onScrollToMembersDone])

  const availableKnownDepts = KNOWN_DEPARTMENTS.filter(
    (d) => !departments.includes(d),
  )

  function addKnownDepartment() {
    if (selectedKnownDept && !departments.includes(selectedKnownDept)) {
      setDepartments((prev) => [...prev, selectedKnownDept])
      setSelectedKnownDept("")
    }
  }

  function addCustomDepartment() {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      setDepartments((prev) => [...prev, newDepartment.trim()])
      setNewDepartment("")
    }
  }

  function removeDepartment(dept: string) {
    setDepartments((prev) => prev.filter((d) => d !== dept))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onUpdate({
        ...org,
        name: orgName,
        website: website || undefined,
        contactEmail: contactEmail || undefined,
        industry: industry || undefined,
        departments,
        accentColor,
        backgroundColor,
        buttonColor,
        logoUrl: logoUrl || undefined,
        reportingPreferences: {
          anonymizeByDefault,
          includeInBenchmarking,
          scorecardCadence,
          autoReminders,
        },
      })
    } catch (err) {
      console.error("Failed to save organization settings:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveMember() {
    if (!editingMember) return
    setEditSaving(true)
    try {
      await updateDocument(COLLECTIONS.USERS, editingMember.id, {
        firstName: editingMember.firstName,
        lastName: editingMember.lastName,
        email: editingMember.email,
        department: editingMember.department,
        role: editingMember.role,
      })
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                firstName: editingMember.firstName,
                lastName: editingMember.lastName,
                name: `${editingMember.firstName} ${editingMember.lastName}`.trim() || editingMember.email,
                email: editingMember.email,
                department: editingMember.department,
                role: editingMember.role,
              }
            : m,
        ),
      )
      setEditingMember(null)
    } catch (err) {
      console.error("Failed to update member:", err)
    } finally {
      setEditSaving(false)
    }
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.department.toLowerCase().includes(memberSearch.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </button>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              <img
                src={logoUrl}
                alt={`${orgName} logo`}
                className="h-full w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
              />
            </div>
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Building2 className="h-6 w-6" style={{ color: accentColor }} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{orgName}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Created {org.createdAt}
              </p>
              {org.industry && (
                <Badge variant="outline" className="text-[10px]">
                  {org.industry}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Company Information
              </CardTitle>
              <CardDescription>
                Basic information about this organization
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-website">Website</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      id="org-website"
                      placeholder="https://company.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-email">Contact Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      id="org-email"
                      type="email"
                      placeholder="admin@company.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-industry">Industry</Label>
                <Select
                  value={industry.toLowerCase()}
                  onValueChange={setIndustry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind.toLowerCase()}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Departments */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-base font-semibold">
                  Departments
                </CardTitle>
                <CardDescription>
                  Manage departments within this organization
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Add from known list */}
              <div className="flex gap-2">
                <Select
                  value={selectedKnownDept}
                  onValueChange={setSelectedKnownDept}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select from common departments..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKnownDepts.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={addKnownDepartment}
                  disabled={!selectedKnownDept}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* Add custom */}
              <div className="flex gap-2">
                <Input
                  placeholder="Or add a custom department..."
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomDepartment()
                  }}
                />
                <Button variant="outline" onClick={addCustomDepartment}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Custom
                </Button>
              </div>

              {/* Department list */}
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <Badge
                    key={dept}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5 text-sm"
                  >
                    {dept}
                    <button
                      type="button"
                      onClick={() => removeDepartment(dept)}
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      aria-label={`Remove ${dept}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {departments.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">
                    No departments added yet. Select from the list above or add
                    a custom one.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organization Settings */}
          <Card id="org-settings-card">
            <CardHeader>
              <button
                type="button"
                className="flex w-full items-center justify-between"
                onClick={() => setSettingsExpanded(!settingsExpanded)}
              >
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Organization Settings
                  </CardTitle>
                  <CardDescription className="text-left mt-1">
                    Branding, department taxonomy, and reporting preferences
                  </CardDescription>
                </div>
                {settingsExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {settingsExpanded && (
              <CardContent className="flex flex-col gap-6">
                {/* Branding */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Palette className="h-4 w-4" />
                    Custom Branding
                  </h3>
                  <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex flex-col gap-2">
                      <Label>Accent Color</Label>
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
                            <div
                              className="absolute inset-0"
                              style={{ backgroundColor: accentColor }}
                            />
                            <input
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                          </label>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Used for headers, buttons, and accents in org-specific reports.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Page Background</Label>
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
                            <div
                              className="absolute inset-0"
                              style={{ backgroundColor: backgroundColor }}
                            />
                            <input
                              type="color"
                              value={backgroundColor}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                          </label>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Sets the page background color for all users in this organization.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Button Color</Label>
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
                            <div
                              className="absolute inset-0"
                              style={{ backgroundColor: buttonColor }}
                            />
                            <input
                              type="color"
                              value={buttonColor}
                              onChange={(e) => setButtonColor(e.target.value)}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                          </label>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Sets the primary button color for all users in this organization.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Organization Logo</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-card overflow-hidden">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt="Org logo"
                              className="h-full w-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <Image className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="org-logo-file"
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted ${logoUploading ? "pointer-events-none opacity-60" : ""}`}
                          >
                            {logoUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {logoUploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                          </label>
                          <input
                            id="org-logo-file"
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="sr-only"
                            onChange={handleLogoUpload}
                            disabled={logoUploading}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            PNG, JPG, SVG, or WebP. Max 2MB.
                          </p>
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={async () => {
                                setLogoUrl("")
                                await updateDocument(COLLECTIONS.ORGANIZATIONS, org.id, { logoUrl: null })
                              }}
                              className="self-start text-[11px] text-destructive hover:underline"
                            >
                              Remove logo
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Displayed on scorecards, reports, and the org header.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reporting Preferences */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Reporting Preferences
                  </h3>
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          <Label className="text-sm">Anonymize by Default</Label>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground ml-5">
                          Hide individual names in leaderboards and reports unless users opt in.
                        </p>
                      </div>
                      <Switch checked={anonymizeByDefault} onCheckedChange={setAnonymizeByDefault} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                          <Label className="text-sm">Include in Cross-Org Benchmarking</Label>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground ml-5">
                          Allow anonymized data to be included in industry-wide benchmarks across SHIFT clients.
                        </p>
                      </div>
                      <Switch checked={includeInBenchmarking} onCheckedChange={setIncludeInBenchmarking} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                          <Label className="text-sm">Automated Reminders</Label>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground ml-5">
                          Send email reminders to non-responders before the scorecard window closes.
                        </p>
                      </div>
                      <Switch checked={autoReminders} onCheckedChange={setAutoReminders} />
                    </div>
                    <div className="border-t border-border" />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-sm">Preferred Scorecard Cadence</Label>
                      </div>
                      <Select value={scorecardCadence} onValueChange={(v) => setScorecardCadence(v as "weekly" | "biweekly" | "monthly")}>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly (recommended)</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Default cadence when scheduling scorecards for this organization.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Members */}
          <Card id="members-section">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Members ({members.length})
                  </CardTitle>
                  <CardDescription>
                    Users assigned to this organization
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Members
                </Button>
              </div>
              {members.length > 0 && (
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search members by name, email, or department..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No members assigned to this organization yet.
                </p>
              ) : filteredMembers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No members matching &ldquo;{memberSearch}&rdquo;
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                          {m.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.department && (
                          <Badge variant="secondary" className="text-xs">
                            {m.department}
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize text-xs">
                          {m.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setEditingMember({
                              id: m.id,
                              firstName: m.firstName,
                              lastName: m.lastName,
                              email: m.email,
                              department: m.department,
                              role: m.role,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit {m.name}</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Member Dialog */}
          <Dialog
            open={!!editingMember}
            onOpenChange={(open) => !open && setEditingMember(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
                <DialogDescription>
                  Update this user&apos;s information.
                </DialogDescription>
              </DialogHeader>
              {editingMember && (
                <div className="flex flex-col gap-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>First Name</Label>
                      <Input
                        value={editingMember.firstName}
                        onChange={(e) =>
                          setEditingMember({ ...editingMember, firstName: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Last Name</Label>
                      <Input
                        value={editingMember.lastName}
                        onChange={(e) =>
                          setEditingMember({ ...editingMember, lastName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingMember.email}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Department</Label>
                    <Select
                      value={editingMember.department}
                      onValueChange={(val) =>
                        setEditingMember({ ...editingMember, department: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Role</Label>
                    <Select
                      value={editingMember.role}
                      onValueChange={(val) =>
                        setEditingMember({ ...editingMember, role: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMember} disabled={editSaving}>
                  {editSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Invite Members Dialog */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Invite Members to {org.name}</DialogTitle>
                <DialogDescription>
                  Invite users to join this organization. They will receive a registration link via email.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                {/* Single invite */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-invite-email">Email Address</Label>
                  <Input
                    id="org-invite-email"
                    type="email"
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={!!inviteCsvFile}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole} disabled={!!inviteCsvFile}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Department</Label>
                    <Select
                      value={inviteDepartment}
                      onValueChange={setInviteDepartment}
                      disabled={!!inviteCsvFile || departments.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={departments.length === 0 ? "No departments" : "Select department"} />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CSV bulk section */}
                <div className="flex flex-col gap-3">
                  <div className="relative flex items-center">
                    <div className="flex-1 border-t border-border" />
                    <span className="px-3 text-xs text-muted-foreground">or bulk invite via CSV</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <label
                    htmlFor="org-csv-upload"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    <Upload className="h-4 w-4" />
                    {inviteCsvFile ? (
                      <span className="font-medium text-foreground">
                        {inviteCsvFile.name}{" "}
                        <span className="text-muted-foreground">
                          ({inviteCsvCount} user{inviteCsvCount !== 1 ? "s" : ""})
                        </span>
                      </span>
                    ) : (
                      "Upload CSV file"
                    )}
                  </label>
                  <input
                    id="org-csv-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleInviteCsvUpload}
                  />
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 self-start text-xs font-medium text-primary hover:underline"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Download CSV template
                  </button>

                  {inviteCsvFile && (
                    <div className="flex flex-col gap-2">
                      <Label>Department (override CSV column)</Label>
                      <Select
                        value={inviteCsvDepartment}
                        onValueChange={setInviteCsvDepartment}
                        disabled={departments.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={departments.length === 0 ? "No departments" : "Select department (optional)"} />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        If set, overrides the department column from the CSV for all rows.
                      </p>
                    </div>
                  )}

                  {inviteCsvFile && (
                    <button
                      type="button"
                      onClick={() => { setInviteCsvFile(null); setInviteCsvCount(0) }}
                      className="self-start text-xs text-destructive hover:underline"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteSending || (!inviteEmail && !inviteCsvFile)}
                >
                  {inviteSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Mail className="mr-2 h-4 w-4" />
                  {inviteCsvFile ? `Invite ${inviteCsvCount} Users` : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Organization Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-primary/5"
                    onClick={() =>
                      document
                        .getElementById("members-section")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Total Members
                      </span>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {members.length}
                    </span>
                  </button>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Departments
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {departments.length}
                    </span>
                  </div>
                </div>
                {org.website && (
                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {org.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {org.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${org.contactEmail}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {org.contactEmail}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Settings Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Accent Color</span>
                    <div className="flex items-center gap-1.5">
                      <label className="relative h-4 w-4 cursor-pointer rounded-full border border-border overflow-hidden" title="Pick color">
                        <div className="absolute inset-0 rounded-full" style={{ backgroundColor: accentColor }} />
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </label>
                      <span className="font-mono text-[10px] text-muted-foreground">{accentColor}</span>
                    </div>
                  </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Cadence</span>
                  <span className="text-xs font-medium capitalize text-foreground">{scorecardCadence}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Anonymize</span>
                  <Badge variant={anonymizeByDefault ? "default" : "secondary"} className="text-[10px] h-5">
                    {anonymizeByDefault ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Benchmarking</span>
                  <Badge variant={includeInBenchmarking ? "default" : "secondary"} className="text-[10px] h-5">
                    {includeInBenchmarking ? "Included" : "Excluded"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Reminders</span>
                  <Badge variant={autoReminders ? "default" : "secondary"} className="text-[10px] h-5">
                    {autoReminders ? "On" : "Off"}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsExpanded(true)
                    setTimeout(() => document.getElementById('org-settings-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
                  }}
                  className="mt-1 text-xs text-primary hover:underline text-left"
                >
                  Edit settings
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
