import { ShiftLogo } from "./shift-logo"

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-card px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <ShiftLogo size="sm" />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Track and visualize your scorecard results over time with powerful
            analytics and insights.
          </p>
        </div>
        <div className="flex gap-16">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Product
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>Dashboard</li>
              <li>Templates</li>
              <li>Analytics</li>
              <li>Integrations</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Support
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>FAQ</li>
              <li>Status</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Company
            </h4>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>About</li>
              <li>Privacy</li>
              <li>Terms</li>
              <li>Security</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-border pt-6 text-center text-xs text-muted-foreground">
        2025 Shift Scorecard. All rights reserved.
      </div>
    </footer>
  )
}
