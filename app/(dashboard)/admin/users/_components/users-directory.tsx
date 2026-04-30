"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, MoreHorizontal, Send, Ban, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authHeaders } from "@/lib/api-client"
import { getDocuments, getOrganizations, COLLECTIONS } from "@/lib/firestore"
import type { Organization } from "@/lib/types"

type DirectoryMode = "pending" | "active" | "participants" | "excluded" | "all"
type SortKey = "name" | "email" | "org" | "dept" | "role" | "status"
type SortDir = "asc" | "desc"

type RowStatus = "pending" | "active" | "excluded" | "cancelled" | "staging"

type UserRow = {
  id: string
  name: string
  email: string
  department: string
  role: string
  organizationId: string
  organizationName: string
  excludeFromReporting: boolean
  authId?: string
  fsStatus: string
  rowStatus: RowStatus
}

function properCase(name: string): string {
  return name
    .split(" ")
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim()
}

function deriveRowStatus(u: { fsStatus: string; authId?: string; excludeFromReporting?: boolean }): RowStatus {
  if (u.fsStatus === "staging") return "staging"
  if (u.fsStatus === "cancelled") return "cancelled"
  if (u.authId) return "active"
  if (u.excludeFromReporting) return "excluded"
  return "pending"
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" })
}

export function UsersDirectory({
  mode,
  title,
  description,
}: {
  mode: DirectoryMode
  title: string
  description?: string
}) {
  const { user: authUser, isSuperAdmin, isCompanyAdmin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [rows, setRows] = useState<UserRow[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [filterOrgId, setFilterOrgId] = useState<string>("all")
  const [filterDept, setFilterDept] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<RowStatus | "all">("all")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Selection + bulk action
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<"invite_again" | "cancel_invite" | "delete_user" | "none">("none")
  const [bulkWorking, setBulkWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
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

      const visibleOrgs =
        isCompanyAdmin && authUser?.organizationId
          ? orgList.filter((o) => o.id === authUser.organizationId)
          : orgList
      setOrgs(visibleOrgs)

      const orgNameById = new Map(orgList.map((o) => [o.id, o.name]))

      const mapped = userDocs.map((d) => {
        const data = d as Record<string, unknown>
        const firstName = (data.firstName as string) ?? ""
        const lastName = (data.lastName as string) ?? ""
        const organizationId = (data.organizationId as string) ?? ""
        const rawName = `${firstName} ${lastName}`.trim()
        const email = ((data.email as string) ?? "").toLowerCase()
        const fsStatus = typeof data.status === "string" ? data.status : ""
        const authId = (data.authId as string) ?? undefined
        const excludeFromReporting = (data.excludeFromReporting as boolean) ?? false
        const rowStatus = deriveRowStatus({ fsStatus, authId, excludeFromReporting })

        return {
          id: d.id,
          name: rawName ? properCase(rawName) : (email || "Unknown"),
          email,
          department: (data.department as string) ?? "",
          role: (data.role as string) ?? "user",
          organizationId,
          organizationName: orgNameById.get(organizationId) ?? "",
          excludeFromReporting,
          authId,
          fsStatus,
          rowStatus,
        } satisfies UserRow
      })

      const filteredByScope =
        isCompanyAdmin && authUser?.organizationId
          ? mapped.filter((u) => u.organizationId === authUser.organizationId)
          : mapped

      setRows(filteredByScope)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [authUser?.organizationId, isCompanyAdmin])

  useEffect(() => {
    load()
  }, [load])

  const departmentsForOrg = useMemo(() => {
    const org = orgs.find((o) => o.id === filterOrgId)
    return org?.departments ?? []
  }, [orgs, filterOrgId])

  const modeFiltered = useMemo(() => {
    const base = rows.filter((r) => r.rowStatus !== "staging")
    switch (mode) {
      case "pending":
        return base.filter((r) => r.rowStatus === "pending")
      case "active":
        return base.filter((r) => r.rowStatus === "active")
      case "excluded":
        return base.filter((r) => r.excludeFromReporting)
      case "participants":
        return base.filter((r) => !r.excludeFromReporting)
      case "all":
      default:
        return base
    }
  }, [rows, mode])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return modeFiltered.filter((r) => {
      if (filterOrgId !== "all" && r.organizationId !== filterOrgId) return false
      if (filterDept !== "all" && (r.department || "") !== filterDept) return false
      if (filterStatus !== "all" && r.rowStatus !== filterStatus) return false
      if (q) {
        const hay = `${r.name} ${r.email} ${r.department} ${r.organizationName} ${r.role}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [modeFiltered, search, filterOrgId, filterDept, filterStatus])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    const dir = sortDir === "asc" ? 1 : -1
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "email":
          cmp = compareStrings(a.email, b.email)
          break
        case "org":
          cmp = compareStrings(a.organizationName, b.organizationName)
          break
        case "dept":
          cmp = compareStrings(a.department, b.department)
          break
        case "role":
          cmp = compareStrings(a.role, b.role)
          break
        case "status":
          cmp = compareStrings(a.rowStatus, b.rowStatus)
          break
        case "name":
        default:
          cmp = compareStrings(a.name, b.name)
      }
      return cmp * dir
    })
    return copy
  }, [filtered, sortKey, sortDir])

  const allOnPageSelected = sorted.length > 0 && sorted.every((r) => selectedIds.has(r.id))
  const someOnPageSelected = sorted.some((r) => selectedIds.has(r.id))

  function toggleAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const r of sorted) {
        if (checked) next.add(r.id)
        else next.delete(r.id)
      }
      return next
    })
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function applyBulk() {
    if (!isSuperAdmin) {
      toast.error("Only super admins can perform bulk actions.")
      return
    }
    if (bulkAction === "none") return

    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error("Select at least one row.")
      return
    }

    setBulkWorking(true)
    try {
      if (bulkAction === "invite_again") {
        const res = await fetch("/api/admin/resend-user-invites", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ userIds: ids }),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string; sent?: number; failed?: number }
        if (!res.ok) throw new Error(body.error || "Invite resend failed")
        toast.success(`Invite resend queued (${body.sent ?? 0} sent, ${body.failed ?? 0} failed)`)
      } else if (bulkAction === "cancel_invite") {
        const res = await fetch("/api/admin/cancel-invites", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ userIds: ids }),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string; updated?: number }
        if (!res.ok) throw new Error(body.error || "Cancel failed")
        toast.success(`Cancelled ${body.updated ?? 0} invite(s)`)
      } else if (bulkAction === "delete_user") {
        // Call delete-user per row so we preserve existing behavior and checks.
        let ok = 0
        let failed = 0
        for (const id of ids) {
          const res = await fetch("/api/admin/delete-user", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await authHeaders()) },
            body: JSON.stringify({ userId: id }),
          })
          if (res.ok) ok++
          else failed++
        }
        toast.success(`Deleted ${ok} user(s)${failed ? ` (${failed} failed)` : ""}`)
      }

      setSelectedIds(new Set())
      setBulkAction("none")
      await load()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Bulk action failed")
    } finally {
      setBulkWorking(false)
    }
  }

  async function rowResendInvite(userId: string) {
    setSelectedIds(new Set([userId]))
    setBulkAction("invite_again")
    await applyBulk()
  }

  async function rowCancelInvite(userId: string) {
    setSelectedIds(new Set([userId]))
    setBulkAction("cancel_invite")
    await applyBulk()
  }

  async function rowDelete(userId: string) {
    setSelectedIds(new Set([userId]))
    setBulkAction("delete_user")
    await applyBulk()
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
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/10 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            <Label>Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, org, dept…" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Org</Label>
              <Select value={filterOrgId} onValueChange={(v) => { setFilterOrgId(v); setFilterDept("all") }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dept</Label>
              <Select value={filterDept} onValueChange={setFilterDept} disabled={filterOrgId === "all" || departmentsForOrg.length === 0}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {departmentsForOrg.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as RowStatus | "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="excluded">Excluded</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort</Label>
              <Select value={`${sortKey}:${sortDir}`} onValueChange={(v) => {
                const [k, d] = v.split(":") as [SortKey, SortDir]
                setSortKey(k)
                setSortDir(d)
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name:asc">Name (A→Z)</SelectItem>
                  <SelectItem value="name:desc">Name (Z→A)</SelectItem>
                  <SelectItem value="email:asc">Email (A→Z)</SelectItem>
                  <SelectItem value="email:desc">Email (Z→A)</SelectItem>
                  <SelectItem value="org:asc">Org (A→Z)</SelectItem>
                  <SelectItem value="org:desc">Org (Z→A)</SelectItem>
                  <SelectItem value="dept:asc">Dept (A→Z)</SelectItem>
                  <SelectItem value="dept:desc">Dept (Z→A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isSuperAdmin ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3 md:flex-row md:items-end md:justify-between">
            <div className="text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedIds.size}</span>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={bulkAction} onValueChange={(v) => setBulkAction(v as typeof bulkAction)}>
                  <SelectTrigger className="w-full md:w-56">
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="invite_again">Invite again</SelectItem>
                    <SelectItem value="cancel_invite">Cancel invite</SelectItem>
                    <SelectItem value="delete_user">Delete user</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={applyBulk} disabled={bulkWorking || bulkAction === "none" || selectedIds.size === 0}>
                {bulkWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAllOnPage(Boolean(v))}
                  aria-label="Select all on page"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Org</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={(v) => toggleOne(r.id, Boolean(v))} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <Link href={`/admin/users/${r.id}`} className="font-medium text-foreground hover:underline">
                      {r.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{r.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {r.organizationName ? <Badge variant="outline">{r.organizationName}</Badge> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{r.department || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="capitalize">{r.role}</TableCell>
                <TableCell>
                  <Badge variant={r.rowStatus === "active" ? "default" : r.rowStatus === "pending" ? "secondary" : "outline"}>
                    {r.rowStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isSuperAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Row actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => void rowResendInvite(r.id)}>
                          <Send className="h-4 w-4" />
                          Invite again
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void rowCancelInvite(r.id)}>
                          <Ban className="h-4 w-4" />
                          Cancel invite
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void rowDelete(r.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}

            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No matching users.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

