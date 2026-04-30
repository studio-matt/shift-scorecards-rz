"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function StagingPage() {
  const { user, ready, logout } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle>Account pending assignment</CardTitle>
          <CardDescription>
            Your account is active, but an administrator still needs to assign your company
            and department before you can use the scorecard app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user?.email && (
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}
          <p className="text-sm text-foreground">
            You will receive access automatically once your organization has been linked. If this
            takes longer than expected, contact your administrator.
          </p>
          <Button variant="outline" onClick={() => void logout()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
