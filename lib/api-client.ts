import { auth } from "@/lib/firebase"

/** Attach Firebase ID token for authenticated API routes. */
export async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : null
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Sync another user's `userProfiles` mirror via Admin SDK (after updating `users/{userDocId}`). */
export async function syncUserProfileMirrorAfterUserDocUpdate(userDocId: string): Promise<void> {
  const res = await fetch("/api/admin/sync-user-profile-mirror", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify({ userDocId }),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(body.error || "Failed to sync profile mirror")
  }
}

/** Sync the signed-in user's own `userProfiles` mirror via Admin SDK. */
export async function syncCurrentUserProfileMirror(userDocId?: string): Promise<void> {
  const res = await fetch("/api/auth/sync-profile-mirror", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify({ userDocId }),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(body.error || "Failed to sync current user profile mirror")
  }
}
