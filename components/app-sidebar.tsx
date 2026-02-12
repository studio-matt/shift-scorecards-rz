"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  HelpCircle,
  Settings,
  LogOut,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  History,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { ShiftLogo } from "./shift-logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const userNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
]

const scorecardSubItems = [
  { href: "/scorecard", label: "Current Scorecard" },
  { href: "/scorecard/previous", label: "Previous Scorecards", icon: History },
]

const adminNavItems = [
  { href: "/admin/builder", label: "Templates", icon: FileText },
  { href: "/admin/schedule", label: "Schedule Release", icon: Send },
  { href: "/admin/users", label: "Manage Users", icon: Users },
  { href: "/admin/organization", label: "Organization", icon: Building2 },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, isAdmin, logout, switchRole } = useAuth()
  const isScorecardActive = pathname.startsWith("/scorecard")
  const [scorecardsOpen, setScorecardsOpen] = useState(isScorecardActive)

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
        <ShiftLogo size="sm" variant="white" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {/* Dashboard */}
          <li>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/dashboard"
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
          </li>

          {/* Scorecards (expandable) */}
          <li>
            <button
              type="button"
              onClick={() => setScorecardsOpen((prev) => !prev)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isScorecardActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1 text-left">Scorecards</span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  scorecardsOpen && "rotate-90",
                )}
              />
            </button>
            {scorecardsOpen && (
              <ul className="ml-7 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                {scorecardSubItems.map((sub) => {
                  const isSubActive = pathname === sub.href
                  return (
                    <li key={sub.href}>
                      <Link
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                          isSubActive
                            ? "font-medium text-sidebar-primary"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                        )}
                      >
                        {sub.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>

          {/* Remaining nav items */}
          {userNavItems
            .filter((item) => item.href !== "/dashboard")
            .map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
        </ul>

        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Admin
            </p>
            <ul className="flex flex-col gap-1">
              {adminNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {user.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge
                variant="secondary"
                className="mt-1 text-xs capitalize"
              >
                {user.role}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => switchRole("admin")}>
              Switch to Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchRole("user")}>
              Switch to User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
