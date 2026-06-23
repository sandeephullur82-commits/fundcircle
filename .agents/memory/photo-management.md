---
name: Profile and Logo Photo Management
description: How Clerk photos are uploaded/removed and synced to Firestore for list display
---

## The pattern

Clerk CDN is the single source of truth for all user and org photos. Firestore only caches the URL (`imageUrl` field) for fast list rendering — the image binary never goes to Firestore.

## Components

- `components/ui/ProfileAvatarEditor.tsx` — reusable avatar editor for any role; handles upload (`user.setProfileImage({file})`), remove (`user.setProfileImage(null as any)`), compression (WebP→JPEG fallback), Firestore sync
- `components/ui/OrgLogoEditor.tsx` — org logo editor; upload via `organization.setLogo({file})`; remove via `POST /api/remove-org-logo` (Clerk Admin SDK)

## Firestore sync after upload/remove

After every Clerk photo change, sync `imageUrl` to:
1. `organizationMembers/{membershipId}` — so all member lists pick it up immediately
2. `users/{userId}` — for any user-level queries

Always call `user.reload()` before reading `user.imageUrl` (fresh URL not available until after reload).

## Org logo removal

Frontend Clerk SDK does NOT expose a logo delete method. Must use:
```
POST /api/remove-org-logo  { organizationId }
→ server calls clerkClient.organizations.deleteOrganizationLogo(organizationId)
```
Protected by `authMiddleware` + `verifyIsOrgAdmin`.

## Where lists read photos

OrgCustomers, OrgAgents (desktop + mobile), AgentCustomers — all read `(member as any).imageUrl` from the Firestore doc. If empty/null, fall back to initials. No extra Clerk API calls needed.

**Why:** Clerk's user list API does not push imageUrls in real-time to Firestore listeners. Caching the URL in the membership doc lets all lists stay in sync without per-row Clerk fetches.
