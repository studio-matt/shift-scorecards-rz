"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
} from "lucide-react"

interface Template {
  id: string
  name: string
  description: string
  questions: number
  author: string
  lastModified: string
  status: "active" | "draft" | "archived"
  usedCount: number
}

const templates: Template[] = [
  {
    id: "t1",
    name: "AI Productivity Scorecard",
    description: "Track AI productivity gains across email, meetings, documents, and research",
    questions: 14,
    author: "John Smith",
    lastModified: "Jan 24, 2025",
    status: "active",
    usedCount: 12,
  },
  {
    id: "t2",
    name: "Weekly Check-in",
    description: "Quick weekly pulse check for team satisfaction and workload",
    questions: 5,
    author: "John Smith",
    lastModified: "Jan 20, 2025",
    status: "active",
    usedCount: 8,
  },
  {
    id: "t3",
    name: "Monthly Review",
    description: "Comprehensive monthly performance and goal review",
    questions: 8,
    author: "John Smith",
    lastModified: "Jan 15, 2025",
    status: "draft",
    usedCount: 3,
  },
  {
    id: "t4",
    name: "Onboarding Feedback",
    description: "Collect feedback from new hires about the onboarding experience",
    questions: 10,
    author: "John Smith",
    lastModified: "Dec 10, 2024",
    status: "archived",
    usedCount: 6,
  },
]

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
}

export default function TemplatesPage() {
  const [search, setSearch] = useState("")
  const [items, setItems] = useState(templates)

  const filtered = items.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  )

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Scorecard Templates
          </h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage scorecard templates for your organization
          </p>
        </div>
        <Link href="/admin/builder/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
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
                  <span>{tmpl.questions} questions</span>
                  <span>Used {tmpl.usedCount} times</span>
                  <span>Last modified {tmpl.lastModified}</span>
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
                  <DropdownMenuItem>
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
