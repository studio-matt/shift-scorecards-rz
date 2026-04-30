"use client"

import Link from "next/link"
import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

export default function PendingInvitesPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
        ← Back to Manage Users
      </Link>
      <UsersDirectory
        mode="pending"
        title="Pending Invites"
        description="Users who have been created in the system but have not linked a login yet (no authId)."
      />
    </div>
  )
}

