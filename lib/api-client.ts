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
