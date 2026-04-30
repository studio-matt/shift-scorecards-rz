"use client"

import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

export default function ExcludedFromReportsPage() {
  return (
    <UsersDirectory
      mode="excluded"
      title="Excluded from Reports"
      description="Users excluded from completion metrics and reports."
    />
  )
}

