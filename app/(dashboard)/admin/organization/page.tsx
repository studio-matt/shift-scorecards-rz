"use client"

import { useState } from "react"
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
import { Building2, Plus, Trash2, Users, Globe, Mail } from "lucide-react"
import { mockOrganization, KNOWN_DEPARTMENTS } from "@/lib/mock-data"

export default function OrganizationPage() {
  const [orgName, setOrgName] = useState(mockOrganization.name)
  const [departments, setDepartments] = useState(mockOrganization.departments)
  const [newDepartment, setNewDepartment] = useState("")
  const [selectedKnownDept, setSelectedKnownDept] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Organization</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your organization settings and departments
        </p>
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
                Basic information about your organization
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
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="org-website"
                      placeholder="https://company.com"
                      defaultValue="https://www.shiftthework.com"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-email">Contact Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="org-email"
                      type="email"
                      placeholder="admin@company.com"
                      defaultValue="team@shiftthework.com"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="org-industry">Industry</Label>
                <Select defaultValue="consulting">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          {/* Departments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Departments
                </CardTitle>
                <CardDescription>
                  Manage departments within your organization
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
              </div>
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
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{orgName}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {mockOrganization.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  {[
                    {
                      label: "Total Members",
                      value: "42",
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
              </div>
            </CardContent>
          </Card>

          {/* Multi-org switcher (admin) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Switch Organization
              </CardTitle>
              <CardDescription>
                View reports for different companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select defaultValue="org-1">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org-1">Acme Corp</SelectItem>
                  <SelectItem value="org-2">TechStart Inc</SelectItem>
                  <SelectItem value="org-3">Global Solutions</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-3 w-full bg-transparent">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Organization</DialogTitle>
                    <DialogDescription>
                      Set up a new organization to manage a separate team or
                      company.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-org-name">Organization Name</Label>
                      <Input
                        id="new-org-name"
                        placeholder="Enter organization name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-org-website">Website</Label>
                      <Input
                        id="new-org-website"
                        placeholder="https://company.com"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-org-industry">Industry</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setDialogOpen(false)}>
                      Create Organization
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
