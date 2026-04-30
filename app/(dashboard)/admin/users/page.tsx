"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Mail, CheckCircle2, Clock, Search, Upload, FileDown, Loader2, EyeOff, Users, ShieldAlert, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  getDocuments,
  getOrganizations,
  createDocument,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Organization } from "@/lib/types"
import { authHeaders, syncUserProfileMirrorAfterUserDocUpdate } from "@/lib/api-client"
import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

/** Proper-case a name: "kristen abbott" → "Kristen Abbott" */
function properCase(name: string): string {
  return name
    .split(" ")
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim()
}

interface InvitedUser {
  id: string
  name: string
  email: string
  department: string
  role: string
  orgName: string
  orgId: string
  excludeFromReporting: boolean
  /** UI badge */
  status: "accepted" | "pending" | "staging"
  /** Raw Firestore `status` field */
  fsStatus: string
  authId?: string
}

export default function ManageUsersPage() {
  const { user: authUser, isCompanyAdmin, isSuperAdmin } = useAuth()
  
  // ── Single invite fields ──
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("user")

  // ── CSV bulk fields ──
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreviewCount, setCsvPreviewCount] = useState(0)
  const [csvCompany, setCsvCompany] = useState("")
  const [csvDepartment, setCsvDepartment] = useState("")

  // ── Shared ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [users, setUsers] = useState<InvitedUser[]>([])
  const [loading, setLoading] = useState(true)
  /** Draft org / dept / role for staging assignment rows */
  const [stagingEdits, setStagingEdits] = useState<
    Record<string, { orgId: string; department: string; role: string }>
  >({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [userDocs, orgDocs] = await Promise.all([
        getDocuments(COLLECTIONS.USERS),
        getOrganizations(),
      ])
      const orgList = orgDocs.map((o) => ({
        id: o.id,
        name: (o as Record<string, unknown>).name as string,
        departments: ((o as Record<string, unknown>).departments as string[]) ?? [],
        createdAt: "",
        memberCount: 0,
      })) as Organization[]
      const orgMap = new Map(orgList.map((o) => [o.id, o.name]))
      // For company admins, only show their organization
      const filteredOrgList = isCompanyAdmin && authUser?.organizationId
        ? orgList.filter(o => o.id === authUser.organizationId)
        : orgList
      setOrgs(filteredOrgList)
      
      // Filter users by organization for company admins
      const mappedUsers = userDocs.map((d) => {
        const data = d as Record<string, unknown>
        const firstName = (data.firstName as string) ?? ""
        const lastName = (data.lastName as string) ?? ""
        const orgId = (data.organizationId as string) ?? ""
        const rawName = `${firstName} ${lastName}`.trim()
        const fsStatus = typeof data.status === "string" ? data.status : ""
        const hasAuth = Boolean(data.authId)
        let rowStatus: InvitedUser["status"]
        if (fsStatus === "staging") rowStatus = "staging"
        else if (hasAuth) rowStatus = "accepted"
        else rowStatus = "pending"
        return {
          id: d.id,
          name: rawName ? properCase(rawName) : ((data.email as string) ?? "Unknown"),
          email: (data.email as string) ?? "",
          department: (data.department as string) ?? "",
          role: (data.role as string) ?? "user",
          orgName: orgMap.get(orgId) ?? "",
          orgId,
          excludeFromReporting: (data.excludeFromReporting as boolean) ?? false,
          status: rowStatus,
          fsStatus,
          authId: (data.authId as string) ?? undefined,
        }
      })
      
      // Company admins only see users from their organization
      const filteredUsers = isCompanyAdmin && authUser?.organizationId
        ? mappedUsers.filter(u => u.orgId === authUser.organizationId)
        : mappedUsers
      setUsers(filteredUsers)
    } catch (err) {
      console.error("Failed to fetch data:", err)
    } finally {
      setLoading(false)
    }
  }, [isCompanyAdmin, authUser?.organizationId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Departments for the selected CSV company
  const selectedOrg = orgs.find((o) => o.id === csvCompany)
  const orgDepartments = selectedOrg?.departments ?? []

  function handleDownloadTemplate() {
    const csvContent = "email,firstName,lastName,department\njane@company.com,Jane,Doe,Engineering\njohn@company.com,John,Smith,Sales\nmaria@company.com,Maria,Garcia,Product"
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

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      setCsvPreviewCount(Math.max(0, lines.length - 1))
    }
    reader.readAsText(file)
  }

  const stagingQueue = isSuperAdmin ? users.filter((u) => u.fsStatus === "staging") : []
  const teamMembers = users.filter((u) => u.fsStatus !== "staging")

  async function handleAssignStaging(userId: string) {
    const draft = stagingEdits[userId]
    if (!draft?.orgId) {
      toast.error("Select a company first")
      return
    }
    const u = users.find((x) => x.id === userId)
    if (!u) return
    try {
      await updateDocument(COLLECTIONS.USERS, userId, {
        organizationId: draft.orgId,
        department: draft.department,
        role: draft.role,
        status: "active",
      })
      await syncUserProfileMirrorAfterUserDocUpdate(userId)
      toast.success("User assigned to organization")
      setStagingEdits((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      await fetchData()
    } catch (e) {
      console.error(e)
      toast.error("Could not assign user. Check permissions and try again.")
    }
  }

  async function handleInvite() {
    const orgName = orgs.find((o) => o.id === csvCompany)?.name ?? ""

    try {
      if (csvFile) {
        // Bulk CSV: parse header row to identify columns
        const text = await csvFile.text()
        const lines = text.split("\n").filter((l) => l.trim())
        const headerLine = lines[0].toLowerCase()
        const headers = headerLine.split(",").map((h) => h.trim())
        const colIdx = {
          email: headers.indexOf("email"),
          firstName: headers.indexOf("firstname"),
          lastName: headers.indexOf("lastname"),
          department: headers.indexOf("department"),
        }
        if (colIdx.email === -1) colIdx.email = 0 // Fallback: first column

        const invites: Array<{
          email: string
          firstName?: string
          lastName?: string
          department?: string
          organizationId?: string
          role?: string
        }> = []

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((s) => s.trim())
          const email = (parts[colIdx.email] ?? "").toLowerCase()
          const firstName = colIdx.firstName >= 0 ? properCase(parts[colIdx.firstName] ?? "") : ""
          const lastName = colIdx.lastName >= 0 ? properCase(parts[colIdx.lastName] ?? "") : ""
          // If a department was selected in the dropdown, override the CSV column
          const dept = csvDepartment || (colIdx.department >= 0 ? parts[colIdx.department] : "") || ""
          if (email && email.includes("@")) {
            invites.push({
              email,
              firstName,
              lastName,
              department: dept,
              organizationId: csvCompany,
              role: "user",
            })
          }
        }

        if (invites.length === 0) {
          toast.error("No valid emails found in CSV")
          return
        }

        const res = await fetch("/api/admin/invite-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await authHeaders()),
          },
          body: JSON.stringify({ invites, orgName }),
        })
        const payload = (await res.json().catch(() => null)) as
          | { recorded?: number; sent?: number; failed?: number; total?: number; error?: string; reason?: string; errors?: string[] }
          | null
        if (!res.ok) {
          toast.error(payload?.error || `Invite failed (${res.status})`)
        } else {
          toast.success(`Invites processed (sent ${payload?.sent ?? 0}/${payload?.total ?? invites.length})`)
          if (payload?.failed) {
            console.warn("Invite errors:", payload.errors)
          }
        }
      } else if (inviteEmail) {
        const invites = [
          {
            email: inviteEmail.toLowerCase(),
            department: "",
            role: inviteRole,
          },
        ]
        const res = await fetch("/api/admin/invite-users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await authHeaders()),
          },
          body: JSON.stringify({ invites, orgName }),
        })
        const payload = (await res.json().catch(() => null)) as
          | { recorded?: number; sent?: number; failed?: number; total?: number; error?: string; reason?: string; errors?: string[] }
          | null
        if (!res.ok) {
          toast.error(payload?.error || payload?.reason || `Invite failed (${res.status})`)
        } else {
          toast.success(`Invitation processed (sent ${payload?.sent ?? 0}/${payload?.total ?? invites.length})`)
          if (payload?.failed) {
            console.warn("Invite errors:", payload.errors)
          }
        }
      }
    } catch (err) {
      console.error("Failed to send invite:", err)
      toast.error("Failed to send invite. Check your permissions and try again.")
    }
    setDialogOpen(false)
    setInviteEmail("")
    setInviteRole("user")
    setCsvFile(null)
    setCsvPreviewCount(0)
    setCsvCompany("")
    setCsvDepartment("")
    await fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeCount = teamMembers.filter((u) => u.status === "accepted").length
  const pendingCount = teamMembers.filter((u) => u.status === "pending").length
  const excludedCount = teamMembers.filter((u) => u.excludeFromReporting).length
  const participantCount = teamMembers.length - excludedCount

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isCompanyAdmin ? "CEO View: Manage Users" : "Manage Users"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isCompanyAdmin
              ? "View team members within your organization"
              : "Invite and manage team members for your organization"}
          </p>
        </div>
        {/* Only super admins can invite users */}
        {isSuperAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization. They will receive a
                registration link via email.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              {/* ── Single Invite Section ── */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!!csvFile}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={setInviteRole}
                  disabled={!!csvFile}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="company_admin">Company Admin (CEO View)</SelectItem>
                    {isSuperAdmin && (
                      <SelectItem value="admin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {csvFile && (
                  <p className="text-xs text-muted-foreground">
                    Bulk CSV imports are automatically assigned Role = User
                  </p>
                )}
              </div>

              {/* ── CSV Bulk Upload Section ── */}
              <div className="flex flex-col gap-3">
                <div className="relative flex items-center">
                  <div className="flex-1 border-t border-border" />
                  <span className="px-3 text-xs text-muted-foreground">
                    or bulk invite via CSV
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <label
                  htmlFor="csv-upload"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Upload className="h-4 w-4" />
                  {csvFile ? (
                    <span className="font-medium text-foreground">
                      {csvFile.name}{" "}
                      <span className="text-muted-foreground">
                        ({csvPreviewCount} user{csvPreviewCount !== 1 ? "s" : ""})
                      </span>
                    </span>
                  ) : (
                    "Upload CSV file"
                  )}
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleCsvUpload}
                />
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 self-start text-xs font-medium text-primary hover:underline"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Download CSV template
                </button>

                {/* Company dropdown (for CSV) */}
                <div className="flex flex-col gap-2">
                  <Label>Company</Label>
                  <Select
                    value={csvCompany}
                    onValueChange={(val) => {
                      setCsvCompany(val)
                      setCsvDepartment("") // Reset department when company changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department dropdown (populated from selected company) */}
                <div className="flex flex-col gap-1.5">
                  <Label>Department</Label>
                  <Select
                    value={csvDepartment}
                    onValueChange={setCsvDepartment}
                    disabled={!csvCompany || orgDepartments.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !csvCompany
                            ? "Select a company first"
                            : orgDepartments.length === 0
                              ? "No departments configured"
                              : "Select department (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {orgDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If a department is selected, all users in the CSV will get the same department assigned.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite}>
                <Mail className="mr-2 h-4 w-4" />
                {csvFile
                  ? `Send ${csvPreviewCount} Invitation${csvPreviewCount !== 1 ? "s" : ""}`
                  : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Staging: self-signup users waiting for org assignment (super admin only) */}
      {isSuperAdmin && stagingQueue.length > 0 && (
        <Card className="mb-6 border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Staging customers</CardTitle>
            <CardDescription>
              Assign a company, department, and role. This removes them from staging and grants app access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {stagingQueue.map((su) => {
              const draft =
                stagingEdits[su.id] ?? {
                  orgId: "",
                  department: "",
                  role: su.role || "user",
                }
              const orgForRow = orgs.find((o) => o.id === draft.orgId)
              const depts = orgForRow?.departments ?? []
              return (
                <div
                  key={su.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:flex-wrap md:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{su.name}</p>
                    <p className="text-xs text-muted-foreground">{su.email}</p>
                  </div>
                  <Select
                    value={draft.orgId}
                    onValueChange={(orgId) =>
                      setStagingEdits((prev) => ({
                        ...prev,
                        [su.id]: { ...draft, orgId, department: "" },
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 w-full md:w-[200px]">
                      <SelectValue placeholder="Company" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={draft.department}
                    onValueChange={(department) =>
                      setStagingEdits((prev) => ({
                        ...prev,
                        [su.id]: { ...draft, department },
                      }))
                    }
                    disabled={!draft.orgId || depts.length === 0}
                  >
                    <SelectTrigger className="h-9 w-full md:w-[180px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {depts.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={draft.role}
                    onValueChange={(role) =>
                      setStagingEdits((prev) => ({
                        ...prev,
                        [su.id]: { ...draft, role },
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 w-full md:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="company_admin">Company Admin</SelectItem>
                      <SelectItem value="admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleAssignStaging(su.id)}
                      disabled={!draft.orgId}
                    >
                      Save assignment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(su)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Stats (clickable) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users/participants" className="block">
          <Card className="transition-colors hover:bg-muted/20">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="text-2xl font-bold text-foreground">{participantCount}</p>
                <p className="text-[11px] text-muted-foreground">Counted in reports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users/active" className="block">
          <Card className="transition-colors hover:bg-muted/20">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users/pending" className="block">
          <Card className="transition-colors hover:bg-muted/20">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users/excluded" className="block">
          <Card className="transition-colors hover:bg-muted/20">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Excluded from Reports</p>
                <p className="text-2xl font-bold text-foreground">{excludedCount}</p>
                <p className="text-[11px] text-muted-foreground">Admins / non-participants</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <UsersDirectory
        mode="all"
        title="Team Members"
        description="View and manage all users. Use the filtered pages for quick lists of Pending/Active/Participants/Excluded."
      />

      {/* legacy delete dialog removed (handled via row actions in directory) */}
    </div>
  )
}
