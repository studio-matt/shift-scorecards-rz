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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Mail, CheckCircle2, Clock, Search, Upload, FileDown, Loader2 } from "lucide-react"
import { KNOWN_DEPARTMENTS } from "@/lib/mock-data"
import {
  getDocuments,
  createDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { orderBy } from "firebase/firestore"

interface InvitedUser {
  id: string
  name: string
  email: string
  department: string
  role: string
  status: "accepted" | "pending"
}

export default function ManageUsersPage() {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteDepartment, setInviteDepartment] = useState("")
  const [inviteRole, setInviteRole] = useState("user")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreviewCount, setCsvPreviewCount] = useState(0)
  const [users, setUsers] = useState<InvitedUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const docs = await getDocuments(COLLECTIONS.USERS, orderBy("lastName"))
      setUsers(
        docs.map((d) => {
          const data = d as Record<string, unknown>
          const firstName = (data.firstName as string) ?? ""
          const lastName = (data.lastName as string) ?? ""
          return {
            id: d.id,
            name: `${firstName} ${lastName}`.trim() || ((data.email as string) ?? "Unknown"),
            email: (data.email as string) ?? "",
            department: (data.department as string) ?? "",
            role: (data.role as string) ?? "user",
            status: data.authId ? "accepted" as const : "pending" as const,
          }
        }),
      )
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function handleDownloadTemplate() {
    const csvContent =
      "email,department,role\njane@company.com,Engineering,user\njohn@company.com,Sales,admin"
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

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  async function handleInvite() {
    try {
      if (csvFile) {
        // Parse CSV and create invite docs for each row
        const text = await csvFile.text()
        const lines = text.split("\n").filter((l) => l.trim())
        for (let i = 1; i < lines.length; i++) {
          const [email, dept, role] = lines[i].split(",").map((s) => s.trim())
          if (email) {
            await createDocument(COLLECTIONS.INVITES, {
              email,
              department: dept ?? inviteDepartment,
              role: role ?? inviteRole,
              status: "pending",
            })
          }
        }
      } else if (inviteEmail) {
        await createDocument(COLLECTIONS.INVITES, {
          email: inviteEmail,
          department: inviteDepartment,
          role: inviteRole,
          status: "pending",
        })
      }
    } catch (err) {
      console.error("Failed to send invite:", err)
    }
    setDialogOpen(false)
    setInviteEmail("")
    setInviteDepartment("")
    setInviteRole("user")
    setCsvFile(null)
    setCsvPreviewCount(0)
    await fetchUsers()
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

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Users</h1>
          <p className="mt-1 text-muted-foreground">
            Invite and manage team members for your organization
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization. They will receive a
                registration link via email.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              {/* CSV Upload */}
              <div className="flex flex-col gap-2">
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
                        ({csvPreviewCount} user
                        {csvPreviewCount !== 1 ? "s" : ""})
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
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-dept">Department</Label>
                <Select
                  value={inviteDepartment}
                  onValueChange={setInviteDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept.toLowerCase()}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
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
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
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
            View and manage all invited users
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
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {user.role}
                  </Badge>
                  <Badge
                    variant={
                      user.status === "accepted" ? "default" : "secondary"
                    }
                    className="capitalize"
                  >
                    {user.status}
                  </Badge>
                  {user.status === "pending" && (
                    <Button variant="ghost" size="sm">
                      Resend
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? "No users match your search" : "No users yet. Invite your first team member."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
