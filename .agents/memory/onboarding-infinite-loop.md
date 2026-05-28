---
name: Onboarding infinite loop fix
description: Root cause and fix for the RoleRouter→/onboarding→RoleRouter infinite redirect loop.
---

## Root cause
`RoleRouter` → redirects to `/onboarding` when no Firestore membership doc is found.
`OwnerOnboarding` → on mount, `userMemberships.data.length > 0` triggers `navigate("/router")`.
This unmounts and remounts `RoleRouter`, resetting its 8s timeout on every cycle → infinite loop.

## Fix: break the cycle in RoleRouter
When Firestore doc is missing but Clerk org memberships exist (i.e. org was just created):
- Check `userMemberships.data.length` BEFORE redirecting to `/onboarding`
- Use Clerk role `org:admin` as fallback → navigate to `/dashboard/owner` with `state: { orgId }`
- Only redirect to `/onboarding` when `userMemberships.data.length === 0` (truly no org)

## Fix: guard in OwnerOnboarding
The `useEffect` that redirects existing-org users to `/router` must be guarded with `if (success) return;`
Otherwise it fires during the creation flow when `userMemberships.data` updates after org creation.

## Fix: success screen navigation
After org creation succeeds:
1. `setCreatedOrgId(org.id)` + `setSuccess(true)` 
2. `sessionStorage.setItem("fc_onboarding_org_id", orgId)` as fallback
3. `navigate("/router", { replace: true, state: { orgId } })` — NOT `/dashboard/owner` directly
4. A `setTimeout(1500)` ref for auto-redirect + "Go to dashboard now" button for manual escape
5. **Never** use `await new Promise(r => setTimeout(r, 1500)); navigate(...)` — this navigates AFTER the success
   screen renders for 1.5s then disappears immediately, not giving the user time to click the button.
