"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  BookOpen,
  MessageSquare,
  Brain,
  Zap,
  Lightbulb,
  Save,
  GripVertical,
} from "lucide-react"
import { getDocument, setDocument, COLLECTIONS } from "@/lib/firestore"

// ─── Types ────────────────────────────────────────────────────────────
interface ActionPrompt {
  id: string
  category: string
  action: string
  prompt: string
}

interface PromptPackPrompt {
  name: string
  template: string
}

interface PromptPack {
  id: string
  title: string
  icon: string
  category: string
  description: string
  prompts: PromptPackPrompt[]
}

interface PromptSettings {
  actionPrompts: ActionPrompt[]
  promptPacks: PromptPack[]
}

const ICON_OPTIONS = [
  { value: "MessageSquare", label: "Message", icon: MessageSquare },
  { value: "Brain", label: "Brain", icon: Brain },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "Lightbulb", label: "Lightbulb", icon: Lightbulb },
  { value: "BookOpen", label: "Book", icon: BookOpen },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
]

const CATEGORY_OPTIONS = [
  "Communication",
  "Research & Analysis",
  "Document Creation",
  "Data & Reporting",
  "Productivity",
  "Innovation",
  "Meeting Preparation",
  "Creative Problem Solving",
]

// ─── Default Data (for initial setup) ─────────────────────────────────
const DEFAULT_ACTION_PROMPTS: ActionPrompt[] = [
  {
    id: "doc-creation",
    category: "document creation",
    action: "Try using Claude to draft your next proposal from scratch.",
    prompt: "I need to write a [TYPE] proposal for [CLIENT/PROJECT]. The key points to cover are: [LIST KEY POINTS]. Please draft a professional proposal that emphasizes [VALUE PROPOSITION]. Include an executive summary, scope of work, timeline, and pricing structure."
  },
  {
    id: "research",
    category: "research & analysis",
    action: "Let AI help you synthesize research findings faster.",
    prompt: "I have research data on [TOPIC] from [SOURCES]. Please analyze this information and provide: 1) Key themes and patterns, 2) Contradictions or gaps, 3) Actionable recommendations, 4) Questions for further research."
  },
  {
    id: "data-reporting",
    category: "data & reporting",
    action: "Use AI to turn raw data into executive summaries.",
    prompt: "Here is my [TYPE] data: [PASTE DATA]. Please create an executive summary that includes: key metrics and trends, comparison to previous period, areas of concern, and 3 recommended actions with expected impact."
  },
  {
    id: "communication",
    category: "communication",
    action: "Draft your next important email with AI assistance.",
    prompt: "I need to write a [TONE: professional/friendly/urgent] email to [RECIPIENT ROLE] about [TOPIC]. The goal is to [DESIRED OUTCOME]. Key points to include: [LIST]. Please draft this email with a clear call-to-action."
  },
]

const DEFAULT_PROMPT_PACKS: PromptPack[] = [
  {
    id: "email",
    title: "Email Mastery",
    icon: "MessageSquare",
    category: "Communication",
    description: "Draft, refine, and automate professional emails 3x faster.",
    prompts: [
      { name: "Cold Outreach", template: "Write a compelling cold email to [PROSPECT] at [COMPANY]. My value prop: [VALUE]. Goal: [MEETING/DEMO/CALL]. Keep it under 150 words, personalized, and include a clear CTA." },
      { name: "Follow-Up Sequence", template: "Create a 3-email follow-up sequence for [CONTEXT]. Email 1: Value reminder (2 days). Email 2: Social proof (5 days). Email 3: Last chance (10 days). Each under 100 words." },
      { name: "Difficult Conversation", template: "Help me write an email addressing [SENSITIVE ISSUE] with [RECIPIENT]. Tone: professional but empathetic. I need to: [OUTCOME]. Avoid: [PITFALLS]." },
    ]
  },
  {
    id: "research",
    title: "Research Power Pack",
    icon: "Brain",
    category: "Research & Analysis",
    description: "Turn hours of research into minutes with structured analysis prompts.",
    prompts: [
      { name: "Competitive Analysis", template: "Analyze [COMPETITOR] vs our company. Compare: pricing, features, market positioning, strengths, weaknesses. Format as a strategic brief with actionable insights." },
      { name: "Market Research Synthesis", template: "I have research from [SOURCES]. Synthesize into: 1) Key market trends, 2) Customer pain points, 3) Opportunities, 4) Risks, 5) Recommended actions." },
      { name: "Literature Review", template: "Summarize the key findings from these sources on [TOPIC]: [SOURCES]. Identify consensus points, contradictions, and gaps in the research." },
    ]
  },
]

// ─── Component ────────────────────────────────────────────────────────
export default function AdminPromptsPage() {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionPrompts, setActionPrompts] = useState<ActionPrompt[]>([])
  const [promptPacks, setPromptPacks] = useState<PromptPack[]>([])
  
  // Dialog states
  const [editingAction, setEditingAction] = useState<ActionPrompt | null>(null)
  const [editingPack, setEditingPack] = useState<PromptPack | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [packDialogOpen, setPackDialogOpen] = useState(false)

  // Load settings from Firestore
  useEffect(() => {
    async function loadSettings() {
      if (!user?.organizationId) return
      try {
        const settings = await getDocument<PromptSettings>(
          COLLECTIONS.SETTINGS,
          `prompts_${user.organizationId}`
        )
        if (settings) {
          setActionPrompts(settings.actionPrompts || DEFAULT_ACTION_PROMPTS)
          setPromptPacks(settings.promptPacks || DEFAULT_PROMPT_PACKS)
        } else {
          // Use defaults if no settings exist
          setActionPrompts(DEFAULT_ACTION_PROMPTS)
          setPromptPacks(DEFAULT_PROMPT_PACKS)
        }
      } catch (err) {
        console.error("Failed to load prompt settings:", err)
        setActionPrompts(DEFAULT_ACTION_PROMPTS)
        setPromptPacks(DEFAULT_PROMPT_PACKS)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [user?.organizationId])

  // Save settings to Firestore
  async function handleSave() {
    if (!user?.organizationId) return
    setSaving(true)
    try {
      await setDocument(COLLECTIONS.SETTINGS, `prompts_${user.organizationId}`, {
        actionPrompts,
        promptPacks,
      })
    } catch (err) {
      console.error("Failed to save prompt settings:", err)
    } finally {
      setSaving(false)
    }
  }

  // Action Prompt handlers
  function handleAddAction() {
    setEditingAction({
      id: `action-${Date.now()}`,
      category: "",
      action: "",
      prompt: "",
    })
    setActionDialogOpen(true)
  }

  function handleEditAction(action: ActionPrompt) {
    setEditingAction({ ...action })
    setActionDialogOpen(true)
  }

  function handleSaveAction() {
    if (!editingAction) return
    const idx = actionPrompts.findIndex((a) => a.id === editingAction.id)
    if (idx >= 0) {
      setActionPrompts((prev) => prev.map((a, i) => (i === idx ? editingAction : a)))
    } else {
      setActionPrompts((prev) => [...prev, editingAction])
    }
    setActionDialogOpen(false)
    setEditingAction(null)
  }

  function handleDeleteAction(id: string) {
    setActionPrompts((prev) => prev.filter((a) => a.id !== id))
  }

  // Prompt Pack handlers
  function handleAddPack() {
    setEditingPack({
      id: `pack-${Date.now()}`,
      title: "",
      icon: "BookOpen",
      category: "",
      description: "",
      prompts: [{ name: "", template: "" }],
    })
    setPackDialogOpen(true)
  }

  function handleEditPack(pack: PromptPack) {
    setEditingPack({ ...pack, prompts: [...pack.prompts] })
    setPackDialogOpen(true)
  }

  function handleSavePack() {
    if (!editingPack) return
    // Filter out empty prompts
    const cleanedPack = {
      ...editingPack,
      prompts: editingPack.prompts.filter((p) => p.name.trim() && p.template.trim()),
    }
    const idx = promptPacks.findIndex((p) => p.id === cleanedPack.id)
    if (idx >= 0) {
      setPromptPacks((prev) => prev.map((p, i) => (i === idx ? cleanedPack : p)))
    } else {
      setPromptPacks((prev) => [...prev, cleanedPack])
    }
    setPackDialogOpen(false)
    setEditingPack(null)
  }

  function handleDeletePack(id: string) {
    setPromptPacks((prev) => prev.filter((p) => p.id !== id))
  }

  function addPromptToPack() {
    if (!editingPack) return
    setEditingPack({
      ...editingPack,
      prompts: [...editingPack.prompts, { name: "", template: "" }],
    })
  }

  function updatePackPrompt(index: number, field: "name" | "template", value: string) {
    if (!editingPack) return
    const newPrompts = [...editingPack.prompts]
    newPrompts[index] = { ...newPrompts[index], [field]: value }
    setEditingPack({ ...editingPack, prompts: newPrompts })
  }

  function removePackPrompt(index: number) {
    if (!editingPack) return
    setEditingPack({
      ...editingPack,
      prompts: editingPack.prompts.filter((_, i) => i !== index),
    })
  }

  const IconComponent = (iconName: string) => {
    const icon = ICON_OPTIONS.find((i) => i.value === iconName)
    return icon ? icon.icon : BookOpen
  }

  if (!isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading prompt settings...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Prompts & Packs</h1>
          <p className="mt-1 text-muted-foreground">
            Configure the AI Action Plan suggestions and Prompt Packs shown to users
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="flex flex-col gap-8">
        {/* ── AI Action Prompts ───────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Action Plan Prompts
                </CardTitle>
                <CardDescription>
                  These suggestions appear in the user's "AI Growth Plan" based on their weak scorecard categories
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleAddAction}>
                <Plus className="mr-1 h-4 w-4" />
                Add Action
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {actionPrompts.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-4"
                >
                  <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {action.category}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{action.action}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 font-mono">
                      {action.prompt}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditAction(action)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAction(action.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {actionPrompts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No action prompts configured. Add one to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Prompt Packs ─────────────────────────────────────────────── */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-cyan" />
                  Prompt Packs
                </CardTitle>
                <CardDescription>
                  Curated prompt libraries shown to users, prioritized by their weak categories
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleAddPack}>
                <Plus className="mr-1 h-4 w-4" />
                Add Pack
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {promptPacks.map((pack) => {
                const Icon = IconComponent(pack.icon)
                return (
                  <div
                    key={pack.id}
                    className="rounded-lg border border-border/50 bg-muted/30 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border/50">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{pack.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[9px]">
                              {pack.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {pack.prompts.length} prompts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditPack(pack)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePack(pack.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{pack.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {pack.prompts.slice(0, 3).map((p, i) => (
                        <Badge key={i} variant="outline" className="text-[9px]">
                          {p.name}
                        </Badge>
                      ))}
                      {pack.prompts.length > 3 && (
                        <Badge variant="outline" className="text-[9px]">
                          +{pack.prompts.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
              {promptPacks.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No prompt packs configured. Add one to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Edit Action Dialog ─────────────────────────────────────────── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAction?.id.startsWith("action-") && actionPrompts.every((a) => a.id !== editingAction.id)
                ? "Add Action Prompt"
                : "Edit Action Prompt"}
            </DialogTitle>
          </DialogHeader>
          {editingAction && (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label>Category (matches scorecard categories)</Label>
                <Input
                  value={editingAction.category}
                  onChange={(e) => setEditingAction({ ...editingAction, category: e.target.value })}
                  placeholder="e.g., document creation, research & analysis"
                />
                <p className="text-[10px] text-muted-foreground">
                  This is matched against the user's weak scorecard categories (case-insensitive)
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Action Description</Label>
                <Input
                  value={editingAction.action}
                  onChange={(e) => setEditingAction({ ...editingAction, action: e.target.value })}
                  placeholder="e.g., Try using Claude to draft your next proposal"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Prompt Template</Label>
                <Textarea
                  value={editingAction.prompt}
                  onChange={(e) => setEditingAction({ ...editingAction, prompt: e.target.value })}
                  placeholder="The full prompt template with [PLACEHOLDERS]..."
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAction}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Pack Dialog ───────────────────────────────────────────── */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPack?.id.startsWith("pack-") && promptPacks.every((p) => p.id !== editingPack.id)
                ? "Add Prompt Pack"
                : "Edit Prompt Pack"}
            </DialogTitle>
          </DialogHeader>
          {editingPack && (
            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Pack Title</Label>
                  <Input
                    value={editingPack.title}
                    onChange={(e) => setEditingPack({ ...editingPack, title: e.target.value })}
                    placeholder="e.g., Email Mastery"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Icon</Label>
                  <Select
                    value={editingPack.icon}
                    onValueChange={(val) => setEditingPack({ ...editingPack, icon: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Category</Label>
                <Select
                  value={editingPack.category}
                  onValueChange={(val) => setEditingPack({ ...editingPack, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Description</Label>
                <Textarea
                  value={editingPack.description}
                  onChange={(e) => setEditingPack({ ...editingPack, description: e.target.value })}
                  placeholder="Brief description of what this pack helps with..."
                  rows={2}
                />
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Prompts in this Pack</Label>
                  <Button size="sm" variant="outline" onClick={addPromptToPack}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Prompt
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  {editingPack.prompts.map((prompt, idx) => (
                    <div key={idx} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Input
                          value={prompt.name}
                          onChange={(e) => updatePackPrompt(idx, "name", e.target.value)}
                          placeholder="Prompt name (e.g., Cold Outreach)"
                          className="flex-1 mr-2 h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => removePackPrompt(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Textarea
                        value={prompt.template}
                        onChange={(e) => updatePackPrompt(idx, "template", e.target.value)}
                        placeholder="The prompt template with [PLACEHOLDERS]..."
                        rows={3}
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                  {editingPack.prompts.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No prompts yet. Add at least one prompt to this pack.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePack}>Save Pack</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
