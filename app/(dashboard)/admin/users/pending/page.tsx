"use client"

import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

export default function PendingInvitesPage() {
  return (
    <UsersDirectory
      mode="pending"
      title="Pending Invites"
      description="Users who have been created in the system but have not linked a login yet (no authId)."
    />
  )
}

