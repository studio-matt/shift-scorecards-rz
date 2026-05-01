"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileDown, Loader2 } from "lucide-react"
import {
  COLLECTIONS,
  getDocumentsByIds,
  getResponsesForOrgCompletedBetween,
} from "@/lib/firestore"
import {
  buildScorecardResponsesCsv,
  completedAtUtcRangeInclusiveDates,
  docToExportResponseRow,
  downloadScorecardResponsesCsvFile,
  type ExportTemplateQuestion,
  type RespondentContact,
} from "@/lib/export-scorecard-responses-csv"

/** Minimal bucket shape from Previous Scorecards aggregation. */
export interface ScorecardExportBucket {
  key: string
  organizationId: string
  organizationName: string
  weekOf: string
  latestCompletedAt: string
  responseIds: string[]
  responseCount: number
  templateName: string
}

export interface ExportScorecardsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSuperAdmin: boolean
  companyAdminOrgId: string | null | undefined
  companyAdminOrgName?: string
  orgs: Array<{ id: string; name: string }>
  scorecards: ScorecardExportBucket[]
  templates: Array<{ id: string; name: string; questions: ExportTemplateQuestion[] }>
  respondentByUserId: Record<string, RespondentContact>
}

const RANGE_QUERY_MAX = 25000

export function ExportScorecardsDialog({
  open,
  onOpenChange,
  isSuperAdmin,
  companyAdminOrgId,
  companyAdminOrgName,
  orgs,
  scorecards,
  templates,
  respondentByUserId,
}: ExportScorecardsDialogProps) {
  const [exportOrgId, setExportOrgId] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lockedOrgId = !isSuperAdmin && companyAdminOrgId ? companyAdminOrgId : null

  useEffect(() => {
    if (!open) return
    setError(null)
    if (lockedOrgId) setExportOrgId(lockedOrgId)
  }, [open, lockedOrgId])

  useEffect(() => {
    if (!open) {
      setSelectedKeys(new Set())
      setDateStart("")
      setDateEnd("")
    }
  }, [open])

  const orgBuckets = useMemo(() => {
    if (!exportOrgId) return []
    return scorecards
      .filter((sc) => sc.organizationId === exportOrgId)
      .sort(
        (a, b) =>
          new Date(b.latestCompletedAt).getTime() - new Date(a.latestCompletedAt).getTime(),
      )
  }, [scorecards, exportOrgId])

  const weekUniqueCount = useMemo(() => {
    if (selectedKeys.size === 0) return 0
    const idSet = new Set<string>()
    for (const sc of orgBuckets) {
      if (!selectedKeys.has(sc.key)) continue
      for (const id of sc.responseIds) idSet.add(id)
    }
    return idSet.size
  }, [orgBuckets, selectedKeys])

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const templateQuestionsByTemplateId = useMemo(() => {
    const m = new Map<string, ExportTemplateQuestion[]>()
    for (const t of templates) {
      m.set(
        t.id,
        [...t.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      )
    }
    return m
  }, [templates])

  const organizationNameByOrgId = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of orgs) m.set(o.id, o.name)
    for (const sc of scorecards) {
      if (sc.organizationId && sc.organizationName) {
        m.set(sc.organizationId, sc.organizationName)
      }
    }
    return m
  }, [orgs, scorecards])

  const handleExport = async () => {
    setError(null)
    if (!exportOrgId) {
      setError("Select an organization.")
      return
    }

    const hasWeeks = selectedKeys.size > 0
    const hasStart = Boolean(dateStart.trim())
    const hasEnd = Boolean(dateEnd.trim())
    if (hasStart !== hasEnd) {
      setError("Use both start and end dates for a completion range, or leave both empty.")
      return
    }
    const range =
      hasStart && hasEnd ? completedAtUtcRangeInclusiveDates(dateStart.trim(), dateEnd.trim()) : null
    if (hasStart && hasEnd && !range) {
      setError("Invalid date range (check that start is before end).")
      return
    }
    if (!hasWeeks && !range) {
      setError("Select at least one scorecard week, or enter a completion date range.")
      return
    }

    setBusy(true)
    try {
      const byId = new Map<string, ReturnType<typeof docToExportResponseRow>>()

      if (hasWeeks) {
        const ids: string[] = []
        for (const sc of orgBuckets) {
          if (!selectedKeys.has(sc.key)) continue
          ids.push(...sc.responseIds)
        }
        const uniqueIds = [...new Set(ids)]
        if (uniqueIds.length > 0) {
          const docs = await getDocumentsByIds(COLLECTIONS.RESPONSES, uniqueIds)
          for (const d of docs) {
            const row = docToExportResponseRow(d as { id: string } & Record<string, unknown>)
            if (row && row.organizationId === exportOrgId) byId.set(row.id, row)
          }
        }
      }

      if (range) {
        const docs = await getResponsesForOrgCompletedBetween(
          exportOrgId,
          range.minInclusive,
          range.maxExclusive,
          RANGE_QUERY_MAX,
        )
        for (const d of docs) {
          const row = docToExportResponseRow(d as { id: string } & Record<string, unknown>)
          if (row) byId.set(row.id, row)
        }
      }

      const responses = [...byId.values()].filter(Boolean) as NonNullable<
        ReturnType<typeof docToExportResponseRow>
      >[]

      if (responses.length === 0) {
        setError("No completed responses matched your filters.")
        setBusy(false)
        return
      }

      const csv = buildScorecardResponsesCsv({
        responses,
        templateQuestionsByTemplateId,
        respondentByUserId,
        organizationNameByOrgId,
      })

      const orgSlug =
        (organizationNameByOrgId.get(exportOrgId) || "export").replace(/[^a-zA-Z0-9]/g, "_") ||
        "export"
      const rangePart =
        range && dateStart && dateEnd ? `_${dateStart}_to_${dateEnd}` : "_custom"
      downloadScorecardResponsesCsvFile(csv, `${orgSlug}_responses${rangePart}.csv`)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : "Export failed.")
    } finally {
      setBusy(false)
    }
  }

  const orgDisplayName = organizationNameByOrgId.get(exportOrgId) || companyAdminOrgName || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Export scorecard responses</DialogTitle>
          <DialogDescription>
            Choose an organization, optionally select specific weeks, and/or a completion date range
            (UTC, inclusive). Results are merged (union) and deduplicated. Only completed submissions are
            included. Date filtering uses each response&apos;s <code className="text-xs">completedAt</code>,
            not the week label.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="flex flex-col gap-4 pb-4 pr-3">
            {lockedOrgId ? (
              <div className="space-y-1">
                <Label>Organization</Label>
                <p className="text-sm text-foreground">{companyAdminOrgName || orgDisplayName || lockedOrgId}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={exportOrgId || undefined} onValueChange={setExportOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
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
            )}

            <div className="space-y-2">
              <Label>Completion date range (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    disabled={!exportOrgId}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Start (UTC)</p>
                </div>
                <div>
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    disabled={!exportOrgId}
                  />
                  <p className="text-xs text-muted-foreground mt-1">End (UTC)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scorecard weeks (optional)</Label>
              {!exportOrgId ? (
                <p className="text-sm text-muted-foreground">Select an organization first.</p>
              ) : orgBuckets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scorecard weeks loaded for this org.</p>
              ) : (
                <div className="rounded-md border border-border max-h-48 overflow-y-auto">
                  {orgBuckets.map((sc) => (
                    <label
                      key={sc.key}
                      className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedKeys.has(sc.key)}
                        onCheckedChange={() => toggleKey(sc.key)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-medium text-foreground">Week of {sc.weekOf}</div>
                        <div className="text-xs text-muted-foreground">
                          {sc.templateName} · {sc.responseCount} response
                          {sc.responseCount !== 1 ? "s" : ""} ·{" "}
                          {new Date(sc.latestCompletedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">Week selection:</span>{" "}
                {selectedKeys.size === 0
                  ? "none"
                  : `${weekUniqueCount} unique response${weekUniqueCount !== 1 ? "s" : ""}`}
              </p>
              <p>
                <span className="font-medium text-foreground">Date range query:</span>{" "}
                {dateStart && dateEnd
                  ? `up to ${RANGE_QUERY_MAX.toLocaleString()} docs (union with week selection)`
                  : "not used"}
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleExport()} disabled={busy || !exportOrgId}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Download CSV
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
