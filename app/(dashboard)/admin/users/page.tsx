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
import { Plus, Mail, CheckCircle2, Clock, Search, Upload, FileDown, Loader2, EyeOff, Users, ShieldAlert, Pencil } from "lucide-react"
import {
  getDocuments,
  getOrganizations,
  createDocument,
  updateDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Organization } from "@/lib/types"

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
  status: "accepted" | "pending"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [users, setUsers] = useState<InvitedUser[]>([])
  const [loading, setLoading] = useState(true)

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
        return {
          id: d.id,
          name: rawName ? properCase(rawName) : ((data.email as string) ?? "Unknown"),
          email: (data.email as string) ?? "",
          department: (data.department as string) ?? "",
          role: (data.role as string) ?? "user",
          orgName: orgMap.get(orgId) ?? "",
          orgId,
          excludeFromReporting: (data.excludeFromReporting as boolean) ?? false,
          status: data.authId ? ("accepted" as const) : ("pending" as const),
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

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      // When promoting to admin, auto-exclude from reporting if they have no org
      const user = users.find((u) => u.id === userId)
      const autoExclude = newRole === "admin" && !user?.orgId
      const updates: Record<string, unknown> = { role: newRole }
      if (autoExclude) updates.excludeFromReporting = true
      await updateDocument(COLLECTIONS.USERS, userId, updates)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole, excludeFromReporting: autoExclude ? true : u.excludeFromReporting } : u)),
      )
    } catch (err) {
      console.error("Failed to update role:", err)
    }
  }

  async function handleExcludeToggle(userId: string, exclude: boolean) {
    try {
      await updateDocument(COLLECTIONS.USERS, userId, { excludeFromReporting: exclude })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, excludeFromReporting: exclude } : u)),
      )
    } catch (err) {
      console.error("Failed to update exclude flag:", err)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  async function handleInvite() {
    const emailsToSend: string[] = []
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

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((s) => s.trim())
          const email = parts[colIdx.email] ?? ""
          const firstName = colIdx.firstName >= 0 ? properCase(parts[colIdx.firstName] ?? "") : ""
          const lastName = colIdx.lastName >= 0 ? properCase(parts[colIdx.lastName] ?? "") : ""
          // If a department was selected in the dropdown, override the CSV column
          const dept = csvDepartment || (colIdx.department >= 0 ? parts[colIdx.department] : "") || ""
          if (email && email.includes("@")) {
            await createDocument(COLLECTIONS.INVITES, {
              email,
              firstName,
              lastName,
              department: dept,
              organizationId: csvCompany,
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
          department: "",
          role: inviteRole,
          status: "pending",
          createdAt: new Date().toISOString(),
        })
        emailsToSend.push(inviteEmail)
      }

      // Send invite emails via API
      if (emailsToSend.length > 0) {
        try {
          await fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: emailsToSend, orgName }),
          })
        } catch (emailErr) {
          console.warn("Email delivery failed, but invites were recorded:", emailErr)
        }
      }
    } catch (err) {
      console.error("Failed to send invite:", err)
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

  const activeCount = users.filter((u) => u.status === "accepted").length
  const pendingCount = users.filter((u) => u.status === "pending").length
  const excludedCount = users.filter((u) => u.excludeFromReporting).length
  const participantCount = users.length - excludedCount

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
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
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Team Members
          </CardTitle>
          <CardDescription>
            View and manage all invited users. Uncheck the checkbox to exclude a user from completion metrics and reports (e.g. admin-only accounts).
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <TooltipProvider delayDuration={300}>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                  user.excludeFromReporting
                    ? "border-border bg-muted/30 opacity-75"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                    user.excludeFromReporting ? "bg-muted text-muted-foreground" : "bg-muted text-foreground"
                  }`}>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {user.name}
                      </p>
                      {user.excludeFromReporting && (
                        <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700 text-[10px] dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                          <EyeOff className="h-2.5 w-2.5" />
                          Excluded
                        </Badge>
                      )}
                      {user.role === "admin" && !user.orgId && !user.department && (
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Admin with no org/department assigned
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.orgName && (
                    <Badge variant="outline" className="text-xs">
                      {user.orgName}
                    </Badge>
                  )}
                  {user.department && (
                    <Badge variant="secondary" className="text-xs">
                      {user.department}
                    </Badge>
                  )}
                  {/* Role dropdown - super admin only */}
                  {isSuperAdmin ? (
                    <Select
                      value={user.role}
                      onValueChange={(val) => handleRoleChange(user.id, val)}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="company_admin">Company Admin</SelectItem>
                        <SelectItem value="admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="text-xs capitalize">
                      {user.role === "company_admin" ? "Company Admin" : user.role === "admin" ? "Super Admin" : "User"}
                    </Badge>
                  )}
                  {/* Exclude from reporting toggle - super admin only */}
                  {isSuperAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <Checkbox
                            checked={!user.excludeFromReporting}
                            onCheckedChange={(checked) => handleExcludeToggle(user.id, !checked)}
                            aria-label={`Include ${user.name} in reports`}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {user.excludeFromReporting ? "Excluded from reports. Check to include." : "Included in reports. Uncheck to exclude."}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      user.status === "accepted"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {user.status}
                  </span>
                  {/* Edit button - super admin only can edit */}
                  {isSuperAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/profile/${user.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Edit user profile
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
            </TooltipProvider>
            {filteredUsers.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No users match your search"
                  : "No users yet. Invite your first team member."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
