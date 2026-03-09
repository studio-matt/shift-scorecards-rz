"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getDocument, updateDocument, getOrganizations, COLLECTIONS } from "@/lib/firestore"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Loader2, Save, Building2, Mail, Briefcase, Phone, User } from "lucide-react"
import type { User as UserType, Organization } from "@/lib/types"

export default function EditUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const router = useRouter()
  const { isAdmin, isCompanyAdmin, isSuperAdmin, user: authUser } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<UserType | null>(null)
  const [orgs, setOrgs] = useState<Organization[]>([])
  
  // Form fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<string>("user")
  const [organizationId, setOrganizationId] = useState("")

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true)
        const [userDoc, orgDocs] = await Promise.all([
          getDocument<UserType>(COLLECTIONS.USERS, userId),
          getOrganizations(),
        ])
        
        if (userDoc) {
          setUserData(userDoc)
          setFirstName(userDoc.firstName || "")
          setLastName(userDoc.lastName || "")
          setEmail(userDoc.email || "")
          setJobTitle(userDoc.jobTitle || "")
          setDepartment(userDoc.department || "")
          setPhone(userDoc.phone || "")
          setRole(userDoc.role || "user")
          setOrganizationId(userDoc.organizationId || "")
        }
        
        // Company admins only see their organization
        if (isCompanyAdmin && authUser?.organizationId) {
          setOrgs(orgDocs.filter(o => o.id === authUser.organizationId))
        } else {
          setOrgs(orgDocs)
        }
      } catch (err) {
        console.error("Failed to load user:", err)
      } finally {
        setLoading(false)
      }
    }
    
    if (userId) {
      loadUser()
    }
  }, [userId, isCompanyAdmin, authUser?.organizationId])

  // Access control: must be admin, and company admins can only edit users in their org
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">You don't have permission to edit user profiles.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  // Company admins can only edit users in their organization
  if (isCompanyAdmin && userData.organizationId !== authUser?.organizationId) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">You can only edit users in your organization.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateDocument(COLLECTIONS.USERS, userId, {
        firstName,
        lastName,
        jobTitle,
        department,
        phone,
        role,
        organizationId,
      })
      router.push("/admin/users")
    } catch (err) {
      console.error("Failed to save user:", err)
    } finally {
      setSaving(false)
    }
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
  const selectedOrg = orgs.find(o => o.id === organizationId)
  const departments = selectedOrg?.departments || []

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Edit User Profile
            </h1>
            <p className="mt-1 text-muted-foreground">
              Update profile information for {firstName} {lastName}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Work Information
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="job-title">Job Title</Label>
                <Input
                  id="job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Product Manager"
                />
              </div>
              
              {/* Organization (only super admins can change) */}
              <div className="flex flex-col gap-2">
                <Label>Organization</Label>
                {isSuperAdmin ? (
                  <Select value={organizationId} onValueChange={setOrganizationId}>
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
                ) : (
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
                    {selectedOrg?.name || "No organization"}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Department</Label>
                {departments.length > 0 ? (
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role & Permissions</CardTitle>
              <CardDescription>
                Control what this user can access in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Label>User Role</Label>
                <Select value={role} onValueChange={setRole}>
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
                <p className="text-xs text-muted-foreground mt-1">
                  {role === "admin" && "Full access to all companies and settings"}
                  {role === "company_admin" && "Admin access limited to their organization"}
                  {role === "user" && "Standard user with access to their own data"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Profile Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={userData.avatar} alt={`${firstName} ${lastName}`} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {firstName} {lastName}
                </p>
                <p className="text-sm text-muted-foreground">{jobTitle || "No title"}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="secondary">
                  {role === "admin" ? "Super Admin" : role === "company_admin" ? "Company Admin" : "User"}
                </Badge>
                {department && <Badge variant="outline">{department}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{email}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{selectedOrg?.name || "No organization"}</span>
              </div>
              <div className="border-t border-border pt-3 mt-2">
                <p className="text-xs text-muted-foreground">
                  Created: {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last login: {userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : "Never"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
