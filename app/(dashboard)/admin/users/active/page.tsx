"use client"

import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

export default function ActiveMembersPage() {
  return (
    <UsersDirectory
      mode="active"
      title="Active Members"
      description="Users who have linked a login (authId present)."
    />
  )
}

