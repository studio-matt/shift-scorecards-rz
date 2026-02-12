"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import type { Organization } from "@/lib/types"
import {
  getOrganizations,
  getUsersByOrg,
  createDocument,
  updateDocument,
  deleteDocument,
  setDocument,
  COLLECTIONS,
} from "@/lib/firestore"

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchOrgs = useCallback(async () => {
    try {
      setLoading(true)
      const orgs = await getOrganizations()
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
          memberCount: o.memberCount ?? 0,
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-medium text-foreground">
                        {org.memberCount ?? 0}
                      </span>
                    </div>
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
                <span className="hidden w-20 text-center text-sm font-medium text-foreground md:block">
                  {org.memberCount ?? 0}
                </span>
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
      onBack={() => setSelectedOrgId(null)}
      onUpdate={async (updated) => {
        try {
          await updateDocument(COLLECTIONS.ORGANIZATIONS, updated.id, {
            name: updated.name,
            departments: updated.departments,
            website: updated.website ?? null,
            contactEmail: updated.contactEmail ?? null,
            industry: updated.industry ?? null,
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
  onBack,
  onUpdate,
}: {
  org: Organization
  onBack: () => void
  onUpdate: (updated: Organization) => void
}) {
  const [orgName, setOrgName] = useState(org.name)
  const [website, setWebsite] = useState(org.website ?? "")
  const [contactEmail, setContactEmail] = useState(org.contactEmail ?? "")
  const [industry, setIndustry] = useState(org.industry ?? "")
  const [departments, setDepartments] = useState(org.departments)
  const [newDepartment, setNewDepartment] = useState("")
  const [selectedKnownDept, setSelectedKnownDept] = useState("")
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<{ id: string; name: string; email: string; department: string; role: string }[]>([])
  const [membersLoading, setMembersLoading] = useState(true)

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
    onUpdate({
      ...org,
      name: orgName,
      website: website || undefined,
      contactEmail: contactEmail || undefined,
      industry: industry || undefined,
      departments,
    })
    setSaving(false)
  }

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
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{orgName}</h1>
            <p className="text-sm text-muted-foreground">
              Created {org.createdAt}
            </p>
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

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Members ({members.length})
              </CardTitle>
              <CardDescription>
                Users assigned to this organization
              </CardDescription>
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
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                  {[
                    {
                      label: "Total Members",
                      value: (org.memberCount ?? 0).toString(),
                      icon: Users,
                    },
                    {
                      label: "Departments",
                      value: departments.length.toString(),
                      icon: Building2,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {stat.label}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {stat.value}
                      </span>
                    </div>
                  ))}
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
        </div>
      </div>
    </div>
  )
}
