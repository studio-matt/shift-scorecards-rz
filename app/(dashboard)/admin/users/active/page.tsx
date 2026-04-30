"use client"

import Link from "next/link"
import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

export default function ActiveMembersPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">
        ← Back to Manage Users
      </Link>
      <UsersDirectory
        mode="active"
        title="Active Members"
        description="Users who have linked a login (authId present)."
      />
    </div>
  )
}

