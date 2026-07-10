import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { client } from './convexClient'
import { api } from '../../convex/_generated/api'

// Session token stored locally; every Convex data call passes it so the backend
// scopes to this user. See convex/auth.ts + convex/model.ts requireUser.
const KEY = 'vb_token'
let token = localStorage.getItem(KEY) || ''
const listeners = new Set<() => void>()

export const getToken = (): string | null => token || null

export function subscribeAuth(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function setToken(next: string) {
  token = next
  if (next) localStorage.setItem(KEY, next)
  else localStorage.removeItem(KEY)
  listeners.forEach((l) => l())
}

export async function requestOtp(phone: string): Promise<{ ok: boolean; devHint?: string }> {
  return client.action(api.auth.requestOtp, { phone })
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ token: string; name?: string } | null> {
  const res = await client.mutation(api.auth.verifyOtp, { phone, code })
  if (res?.token) setToken(res.token)
  return res
}

export function signOut() {
  const t = token
  setToken('')
  if (t) client.mutation(api.auth.signOut, { token: t }).catch(() => {})
}

// React hook: `me` is undefined while loading, null when signed out, or the
// user object when authenticated. Re-renders on login/logout.
export function useAuth() {
  const [tok, setTok] = useState<string | null>(getToken())
  useEffect(() => subscribeAuth(() => setTok(getToken())), [])
  const me = useQuery(api.auth.me, { token: tok ?? undefined })
  return { token: tok, me }
}
