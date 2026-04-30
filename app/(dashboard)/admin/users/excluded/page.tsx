"use client"

import Link from "next/link"
import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

export default function ExcludedFromReportsPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
        ← Back to Manage Users
      </Link>
      <UsersDirectory
        mode="excluded"
        title="Excluded from Reports"
        description="Users excluded from completion metrics and reports."
      />
    </div>
  )
}

