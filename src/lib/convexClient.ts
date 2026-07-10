import { ConvexClient } from 'convex/browser'

// Shared imperative Convex client used by the local-first store bridge
// (store.ts) and the auth module (auth.ts). The React tree separately uses
// ConvexReactClient via ConvexProvider for hook-based components.
export const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL as string)
