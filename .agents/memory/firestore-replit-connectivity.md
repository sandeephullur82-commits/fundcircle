---
name: Firestore connectivity in Replit sandbox
description: Firestore WebSocket/gRPC transport fails in Replit dev environment; fixes and fallback patterns.
---

## The problem
Firestore's default WebChannel (gRPC over WebSocket) transport throws `FirebaseError: unavailable` + `WebChannelConnection RPC 'Listen' stream transport errored` in Replit's dev sandbox. This causes all realtime listeners to never resolve (`loading` stays `true` forever) and all writes to fail.

## Fixes applied

### 1. `experimentalForceLongPolling: true` in `lib/firebase.ts`
Forces Firestore to use HTTP long-polling instead of WebSockets — works in restricted sandbox environments.

### 2. HMR guard in `lib/firebase.ts`
`initializeFirestore` throws `failed-precondition` if called a second time on the same app instance (happens on every Vite HMR hot update). Use `getApp()`/`getApps()` guard for the app AND a try/catch for Firestore:
```ts
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
function getDb() {
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache(), experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app); // already initialized
  }
}
export const db = getDb();
```

## Routing fallback when Firestore is unavailable
`RoleProtectedRoute` and `RoleRouter` both have a 5-second timeout. When Firestore is still unavailable after timeout:
- `RoleRouter`: if Clerk org membership exists with `clerkRole === "org:admin"` → navigate to `/dashboard/owner` passing `state: { orgId }`
- `RoleProtectedRoute`: if `clerkRole === "org:admin"` and allowedRoles includes `organization_owner` → grant access without Firestore doc

**Why:** Prevents infinite loading loops when Firestore is unreachable. Works in dev (Replit sandbox) and degrades gracefully in production if Firestore is slow.

## navOrgId pattern
After fresh org creation, Clerk hooks take time to reflect the new org. Pass `orgId` via `navigate(..., { state: { orgId } })` and also store in `sessionStorage("fc_onboarding_org_id")` as fallback. Both `RoleRouter` and `RoleProtectedRoute` read it to compute `membershipDocId` immediately.
