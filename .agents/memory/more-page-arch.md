---
name: More page architecture
description: How the More tab, sub-pages, and cross-component navigation work in the owner dashboard
---

## Rule
"More" is a full `<TabsContent value="more">` tab (not a Sheet/drawer). `MorePage.tsx` manages its own internal navigation via `page` state (`list | profile | organization | notifications | support | about`).

## Cross-component navigation
- **Tab switching from anywhere:** `window.dispatchEvent(new CustomEvent("fundcircle:switchTab", { detail: tabId }))` — OrgDashboard listens and calls `setActiveTab`.
- **Sub-page navigation from outside MorePage:** fire `fundcircle:morePage` CustomEvent with `detail = subPageId`, AND set `sessionStorage.setItem("fc_more_subpage", subPageId)` before the tab switch (sessionStorage is read on mount as fallback). OrgDashboard uses `setActiveTab("more")` + `setTimeout(() => dispatchEvent("fundcircle:morePage", sub), 80)` — the 80 ms delay lets the tab render before the event fires.

## Header (mobile, 3-part)
- Left: `<BrandMark size="sm" />` + "FundCircle" wordmark
- Center: `OrgName ▼` chip → opens Org Actions Sheet (bottom)
- Right: avatar → opens Profile Sheet (right slide-in)

## Sheets
- **Org Actions Sheet** — Organization Profile (→ More/organization sub-page), Billing, Invite Collector, Invite Customer
- **Profile Sheet** — avatar hero, My Profile / Notifications / Support quick-nav rows, Sign Out; each row fires `setActiveTab("more")` + morePage event

## OrgSettings (desktop sidebar)
Kept for desktop sidebar path. Cleaned: no UI Prefs, no Security, no Org ID on main view. Notifications section uses **auto-save** — each toggle calls `setDoc` immediately with `{ merge: true }`, no Save button.

## Notification keys (Firestore organizations.settings)
`notifNewCollection`, `notifNewMember`, `notifLoanApproval`, `notifMissedCollection`, `notifSystemAlerts`

**Why:** Sheets-as-drawers pattern was unmaintainable as More grew; a full tab gives proper scroll, back-navigation, and sub-page routing without z-index/portal conflicts.

**How to apply:** Any new More sub-page goes into `MorePage.tsx` as a new `function XSubPage` + a new `MoreSubPage` union type member + a row in `MORE_ITEMS`. External navigation uses the `fundcircle:morePage` event pattern.
