"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  ClipboardList,
  HelpCircle,
  Settings,
  FileText,
  Send,
  Users,
  Building2,
  LogOut,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  History,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  { href: "/admin/prompts", label: "AI Prompts", icon: Sparkles },
  { href: "/admin/organization", label: "Organization", icon: Building2 },
  { href: "/admin/settings", label: "Admin Settings", icon: Shield, superAdminOnly: true },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, isAdmin, isSuperAdmin, isCompanyAdmin, logout, switchRole } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isScorecardActive = pathname.startsWith("/scorecard")
  const [scorecardsOpen, setScorecardsOpen] = useState(isScorecardActive)
  
  // Collapsed state - default collapsed on scorecard page
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // Auto-collapse on scorecard page, expand on others
  useEffect(() => {
    if (pathname === "/scorecard") {
      setIsCollapsed(true)
    }
  }, [pathname])

  // Effective expanded state (collapsed but hovering = show expanded)
  const isExpanded = !isCollapsed || isHovering

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => isCollapsed && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-14"
        )}
      >
        {/* Subtle gradient overlay on sidebar */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-sidebar-border px-3 py-4">
          <div className={cn("transition-opacity duration-200", isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>
            <ShiftLogo size="sm" variant="white" />
          </div>
          {!isExpanded && (
            <div className="flex w-full justify-center">
              <ShiftLogo size="icon" variant="white" />
            </div>
          )}
          {isExpanded && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Keep open button when hovering over collapsed sidebar */}
        {isCollapsed && isHovering && (
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false)
              setIsHovering(false)
            }}
            className="absolute right-2 top-4 z-20 flex h-6 items-center justify-center gap-1 rounded-md bg-sidebar-accent/80 px-2 text-[11px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Keep sidebar open"
          >
            Keep open
          </button>
        )}

        {/* Expand hint when collapsed and not hovering */}
        {isCollapsed && !isHovering && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="absolute bottom-20 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground/70 shadow-md transition-colors hover:bg-primary/20 hover:text-primary"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}

        <nav className="relative flex-1 overflow-y-auto px-2 py-4">
          <ul className="flex flex-col gap-1">
            {/* Dashboard */}
            <li>
              <NavItem
                href="/dashboard"
                label="Dashboard"
                icon={LayoutDashboard}
                isActive={pathname === "/dashboard"}
                isExpanded={isExpanded}
              />
            </li>

            {/* Scorecards (expandable) */}
            <li>
              {isExpanded ? (
                <>
                  <button
                    type="button"
                    onClick={() => setScorecardsOpen((prev) => !prev)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isScorecardActive
                        ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-[0_0_12px_-3px_hsl(var(--primary)/0.3)]"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left">Scorecards</span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        scorecardsOpen && "rotate-90",
                      )}
                    />
                  </button>
                  {scorecardsOpen && (
                    <ul className="ml-7 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border/50 pl-3">
                      {scorecardSubItems.map((sub) => {
                        const isSubActive = pathname === sub.href
                        return (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                                isSubActive
                                  ? "font-medium text-primary"
                                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground",
                              )}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              ) : (
                <NavItem
                  href="/scorecard"
                  label="Scorecards"
                  icon={ClipboardList}
                  isActive={isScorecardActive}
                  isExpanded={false}
                />
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
                    <NavItem
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      isActive={isActive}
                      isExpanded={isExpanded}
                    />
                  </li>
                )
              })}
          </ul>

          {isAdmin && (
            <>
              <div className="my-4 border-t border-sidebar-border/50" />
              {isExpanded && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  {isCompanyAdmin ? "CEO View" : "Admin"}
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {adminNavItems
                  .filter((item) => !item.superAdminOnly || isSuperAdmin)
                  .map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                  return (
                    <li key={item.href}>
                      <NavItem
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={isActive}
                        isExpanded={isExpanded}
                      />
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </nav>

        {/* User menu */}
        <div className="relative border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-sidebar-accent",
                  !isExpanded && "justify-center px-0"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-cyan text-xs text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isExpanded && (
                  <>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-sidebar-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-sidebar-foreground/50">
                        {user.email}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-sidebar-foreground/40" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align={isExpanded ? "start" : "center"} className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <Badge
                  variant="secondary"
                  className="mt-1 text-xs"
                >
                  {user.role === "admin" ? "Super Admin" : user.role === "company_admin" ? "Company Admin" : "User"}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => switchRole("admin")}>
                Switch to Super Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchRole("company_admin")}>
                Switch to Company Admin (CEO View)
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
    </TooltipProvider>
  )
}

// NavItem component with tooltip for collapsed state
function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  isExpanded,
}: {
  href: string
  label: string
  icon: React.ElementType
  isActive: boolean
  isExpanded: boolean
}) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        isActive
          ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-[0_0_12px_-3px_hsl(var(--primary)/0.3)]"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        !isExpanded && "justify-center px-0"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {isExpanded && <span>{label}</span>}
    </Link>
  )

  if (!isExpanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
