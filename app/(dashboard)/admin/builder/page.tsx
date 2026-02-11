"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreVertical,
  FileText,
  Edit,
  Copy,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  getDocuments,
  createDocument,
  deleteDocument,
  COLLECTIONS,
} from "@/lib/firestore"
import { orderBy } from "firebase/firestore"

interface Template {
  id: string
  name: string
  description: string
  questions: unknown[]
  questionCount: number
  status: "active" | "draft" | "archived"
  updatedAt?: unknown
  createdAt?: unknown
}

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
}

function formatDate(val: unknown): string {
  if (!val) return "-"
  if (typeof val === "string") return val
  if (typeof val === "object" && val !== null && "seconds" in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  return "-"
}

export default function TemplatesPage() {
  console.log("[v0] TemplatesPage rendering - latest version")
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const docs = await getDocuments(COLLECTIONS.TEMPLATES, orderBy("name"))
      setItems(
        docs.map((d) => ({
          id: d.id,
          name: (d as Record<string, unknown>).name as string ?? "",
          description: (d as Record<string, unknown>).description as string ?? "",
          questions: ((d as Record<string, unknown>).questions as unknown[]) ?? [],
          questionCount: ((d as Record<string, unknown>).questionCount as number) ?? ((d as Record<string, unknown>).questions as unknown[])?.length ?? 0,
          status: ((d as Record<string, unknown>).status as "active" | "draft" | "archived") ?? "draft",
          updatedAt: (d as Record<string, unknown>).updatedAt,
          createdAt: (d as Record<string, unknown>).createdAt,
        })),
      )
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const filtered = items.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDelete(id: string) {
    try {
      await deleteDocument(COLLECTIONS.TEMPLATES, id)
      await fetchTemplates()
    } catch (err) {
      console.error("Failed to delete template:", err)
    }
  }

  async function handleDuplicate(tmpl: Template) {
    try {
      await createDocument(COLLECTIONS.TEMPLATES, {
        name: `${tmpl.name} (Copy)`,
        description: tmpl.description,
        questions: tmpl.questions,
        questionCount: tmpl.questionCount,
        status: "draft",
      })
      await fetchTemplates()
    } catch (err) {
      console.error("Failed to duplicate template:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Scorecard Builder
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage scorecard templates for your organization
          </p>
        </div>
        <Link href="/admin/builder/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Scorecard
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Template list */}
      <div className="flex flex-col gap-3">
        {filtered.map((tmpl) => (
          <Card key={tmpl.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/builder/new?template=${tmpl.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {tmpl.name}
                  </Link>
                  <Badge
                    variant="secondary"
                    className={`text-xs capitalize ${statusColors[tmpl.status]}`}
                  >
                    {tmpl.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tmpl.description}
                </p>
                <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{tmpl.questionCount} questions</span>
                  <span>Modified {formatDate(tmpl.updatedAt)}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/admin/builder/new?template=${tmpl.id}`}>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={() => handleDuplicate(tmpl)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(tmpl.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No templates found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search or create a new template
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
