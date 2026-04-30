"use client"

import { UsersDirectory } from "@/app/(dashboard)/admin/users/_components/users-directory"

export default function ParticipantsPage() {
  return (
    <UsersDirectory
      mode="participants"
      title="Participants"
      description="Users included in completion metrics and reports (not excluded)."
    />
  )
}

