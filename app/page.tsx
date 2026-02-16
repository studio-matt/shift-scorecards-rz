"use client"

import { useEffect, useState } from "react"
import LoginForm from "@/components/login-form"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md animate-pulse rounded-lg border bg-card p-8">
          <div className="mx-auto mb-6 h-8 w-48 rounded bg-muted" />
          <div className="mb-2 h-4 w-24 rounded bg-muted" />
          <div className="mb-4 h-10 w-full rounded bg-muted" />
          <div className="mb-2 h-4 w-24 rounded bg-muted" />
          <div className="mb-6 h-10 w-full rounded bg-muted" />
          <div className="h-10 w-full rounded bg-muted" />
        </div>
      </div>
    )
  }

  return <LoginForm />
}
