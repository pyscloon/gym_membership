# Flex Republic Gym Membership System

A full-stack gym membership platform for Flex Republic, built around member self-service, admin-controlled payments, QR-based attendance, membership freeze handling, crowd insights, and analytics.

The app is designed as a polished React experience backed by Supabase for authentication, database access, storage, realtime updates, row-level security, and edge functions.

## What It Does

Flex Republic helps gym staff and members manage the complete membership lifecycle:

- Members can register, log in, choose a plan, pay, view their dashboard, generate QR check-in/check-out codes, track sessions, update their profile, and review transaction history.
- Admins can scan QR codes, approve or reject payments, verify online payment proof, monitor daily attendance, view crowd status, manage freeze/unfreeze requests, inspect customers, and review analytics.
- The backend stores memberships, transactions, walk-ins, profiles, audit logs, crowd data, uploads, and security policies through Supabase migrations.

## Core Features

### Member Portal

- Landing page with Flex Republic branding, locations, features, testimonials, and membership calls to action.
- Supabase email/password authentication for registration and login.
- Protected member dashboard with session counts, streaks, weekly goal progress, live crowd percentage, and membership renewal state.
- Membership plans for `monthly`, `semi-yearly`, `yearly`, and `walk-in` access.
- QR generation for check-in and check-out flows.
- Profile page with digital membership card, avatar upload support, account details, membership dates, and recent receipts.
- Transaction history for member payments.
- Membership freeze and unfreeze request flow for eligible plans.

### Admin Portal

- Separate admin login and protected admin dashboard.
- QR scanner using `html5-qrcode` for member and walk-in validation.
- Pending payment panel for cash confirmations and online transfer proof verification.
- Freeze request queue and frozen member list.
- Today activity feed for check-ins, check-outs, and walk-ins.
- Customer and transaction views grouped by membership tier.
- Crowd estimation panel with active user counts, crowd status, and best/worst time suggestions.
- Analytics dashboard powered by transaction data and Recharts.

### Payments

- Payment methods: `cash`, `card`, and `online`.
- Cash and card payments enter admin confirmation.
- Online payments require proof upload and admin verification.
- Discount ID proof upload support.
- Admin actions can confirm cash, verify online proof, reject online proof, or fail a payment.
- Successful membership payments create or update memberships.
- Successful walk-in payments create walk-in attendance records.

### Attendance And Crowd Tracking

- QR payloads support `checkin`, `checkout`, and `walk_in`.
- Admin validation records completed entries in `walk_ins`.
- Crowd stats are derived from check-in/check-out activity.
- Best time recommendations are calculated from recent attendance snapshots.
- Attendance and membership rules are modeled with explicit state pattern classes.

### Stability And Security

- Error boundaries and safe async utilities protect key dashboards.
- Retry, timeout, validation, debounce, throttle, circuit-breaker, and audit helpers are included.
- Supabase row-level security policies guard profiles, memberships, transactions, walk-ins, check-ins, crowd tables, audit logs, and storage objects.
- Audit logs capture transaction changes through database triggers.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Styling | Tailwind CSS, custom CSS tokens, Framer Motion |
| Charts | Recharts |
| QR | `qrcode.react`, `html5-qrcode` |
| Backend | Supabase, Supabase Edge Functions, Express |
| Data | PostgreSQL through Supabase migrations and RLS |
| Testing | Jest, ts-jest, Supertest, Playwright, Vitest Storybook tests |
| UI Docs | Storybook |
| CI | GitHub Actions on the `development` branch |

## Project Structure

```text
.
|-- server/                    # Express server for API health/auth checks and built app hosting
|-- src/
|   |-- components/            # Feature components and dashboard panels
|   |-- components/ui/         # Shared app shell, top bar, cards, buttons, transitions
|   |-- context/               # App UI context
|   |-- design-patterns/       # State, factory, decorator, and compound-component examples
|   |-- hooks/                 # Auth, payment, safe async, and walk-in hooks
|   |-- lib/                   # Supabase clients, services, utilities, analytics, crowd logic
|   |-- pages/                 # Routed pages for landing, auth, portals, profile, admin, etc.
|   |-- styles/                # Animation and design token helpers
|   |-- types/                 # Membership and payment domain types
|   |-- routes.tsx             # App route map
|   `-- main.tsx               # React entry point
|-- supabase/
|   |-- functions/             # Edge functions for payments and membership expiration
|   `-- migrations/            # Database schema, storage, RLS, audit, and test baseline
|-- tests/                     # Jest unit and integration tests
|-- e2e/                       # Playwright browser flows
|-- .storybook/                # Storybook config
`-- .github/workflows/         # CI workflow
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/register` | Member registration |
| `/login` | Member login |
| `/dashboard` | Protected member dashboard |
| `/subscription-tier` | Plan selection and subscription entry |
| `/profile` | Protected member profile and digital card |
| `/transaction-history` | Member transaction history |
| `/walk-in` | Walk-in access flow |
| `/payment-panel` | Payment flow entry |
| `/about-us` | Public about page |
| `/admin/login` | Admin login |
| `/admin/dashboard` | Protected admin operations dashboard |
| `/admin/analytics` | Admin analytics view |

## Environment Variables

Create `.env` for local development. Do not commit real keys.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ADMIN_EMAIL=
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

The Playwright/Jest test setup may also use:

```env
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
```

Supabase Edge Functions require server-side secrets in the Supabase project:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=
```

## Getting Started

1. Install dependencies.

   ```bash
   npm install
   ```

2. Add the environment variables above to `.env`.

3. Run the Vite development server.

   ```bash
   npm run dev
   ```

4. Open the app at `http://localhost:5173`.

5. Run the Express server when testing the production server path.

   ```bash
   npm run build
   npm start
   ```

   By default, Express serves `dist/` and listens on `http://localhost:4000`.

## Supabase Setup

The database schema lives in `supabase/migrations`.

Important tables and policies include:

- `memberships`: member plans, status, renewal dates, cancellation flags, freeze dates.
- `transactions`: payment records, payment proof status, uploaded evidence URLs, confirmation fields.
- `walk_ins` and `check_ins`: attendance and QR validation records.
- `profiles`: member profile data and admin flags.
- `crowd_settings`, `crowd_sessions`, `crowd_snapshots`: crowd estimation data.
- `audit_logs`: transaction and sensitive action audit trail.
- `membership_expiration_logs`: optional logs for expiration jobs.
- `edge_function_registry`: expected function metadata for test/security baselines.
- Storage buckets: `uploads` for payment/discount proof and `flex-republic-assets` for member assets.

The project includes two Supabase Edge Functions:

- `payment-transactions`: handles payment submission, pending lists, admin confirmation, online verification/rejection, membership updates, walk-in record creation, and proof uploads.
- `expire-memberships`: expires active memberships that are past renewal and marked for cancellation.

Deploy functions with the Supabase CLI from the project root:

```bash
supabase functions deploy payment-transactions
supabase functions deploy expire-memberships
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build production assets |
| `npm run preview` | Preview the production build with Vite |
| `npm start` | Start the Express server |
| `npm run start:server` | Same as `npm start` |
| `npm run lint` | Run ESLint |
| `npm test` | Run all Jest unit and integration tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:storybook` | Run Storybook/Vitest browser tests |
| `npm run storybook` | Start Storybook on port 6006 |
| `npm run build-storybook` | Build static Storybook |

Run Playwright directly for browser flows:

```bash
npx playwright test
npx playwright test e2e/member-admin-qr-flow.spec.ts --project=chromium
npx playwright test e2e/member-admin-freeze-unfreeze-flow.spec.ts --project=chromium
```

## Testing Coverage

The repository includes:

- Unit tests for stability utilities, production hardening, profile helpers, landing content, debounce behavior, interactions, payment tier selection, and stress scenarios.
- Integration tests for health, login, registration, dashboard, admin login, admin dashboard, and profile behavior.
- Playwright E2E tests for member/admin QR flows and freeze/unfreeze flows.
- Storybook stories for payment, admin payment, analytics, landing, and top bar components.
- GitHub Actions CI that installs dependencies and runs unit/integration tests on `development`.

## Design Patterns In Use

The `src/design-patterns` directory documents and implements several patterns used by the app:

- State pattern for membership lifecycle, attendance sessions, and payment lifecycle.
- Factory pattern for access tier pricing and duration.
- Decorator pattern examples for extending behavior.
- Compound components for membership, payment, admin payment, and analytics UI flows.

The key idea is that workflow rules live in explicit state objects instead of being scattered across button handlers.

## Operational Notes

- Member routes use `ProtectedRoute`; admin routes use `AdminProtectedRoute`.
- Admin access can come from profile flags/roles or the configured admin email.
- The Vite config injects Supabase environment values into the client build.
- Playwright sets `PLAYWRIGHT_USE_TEST_SUPABASE=true` and uses `.env.test` values.
- Express includes lightweight API endpoints for health, login/register validation, admin login validation, dashboard mock data, crowd best-time mock data, and static `dist/` hosting.
- Some older docs mention localStorage-only payment simulation; the current payment path is integrated with Supabase transactions and the `payment-transactions` Edge Function.

## Documentation

Additional project notes live in:

- `PAYMENT_SYSTEM.md`
- `STABILITY_GUIDE.md`
- `attendance_workflow.md`
- `membership_workflow.md`
- `src/design-patterns/compound-component/CompoundPatternGuide.md`
- `src/design-patterns/state/STATE_PATTERN_GUIDE.md`

## Status

This is a feature-rich final project codebase with working app flows, database migrations, admin/member separation, test coverage, and documented workflow patterns. The README is intended to be the fast onboarding guide; the linked docs go deeper into specific payment, stability, attendance, and membership internals.
