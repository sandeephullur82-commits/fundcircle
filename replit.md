# FundCircle

Digital Pigmy Collection Management Platform for operators, agents, and customers.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4
- **Auth**: Clerk (custom auth UI at `/auth/sign-in`, `/auth/sign-up`, etc.)
- **Database**: Firebase Firestore
- **Backend**: Express.js API server (`server/index.ts`)
- **Path alias**: `@` maps to the project root (not `src/`)

## How to Run

The workflow `Start application` runs `npm run dev`, which starts:
- Vite dev server on port **5000** (frontend)
- Express API server on port **3002** (backend)

## Required Secrets

Set these in Replit Secrets:

| Secret | Source |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `VITE_FIREBASE_API_KEY` | [Firebase Console](https://console.firebase.google.com) → Project Settings → Your Apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console |
| `VITE_FIREBASE_APP_ID` | Firebase Console |
| `SESSION_SECRET` | Any random string |

## Project Structure

```
components/        # Shared UI components (root — importable as @/components/...)
lib/               # Firebase, Clerk, services, validation helpers
server/            # Express API (member creation, org logo, etc.)
src/
  pages/           # Route-level page components
  pages/customer/  # Customer portal tab components
firestore.rules    # Firestore security rules
firestore.indexes.json  # Composite index definitions
```

## User Preferences

<!-- Add user preferences here -->
