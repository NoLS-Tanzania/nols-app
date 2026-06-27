# NoLSAF Native Partners App Plan

This file is the single plan for building the **NoLSAF Partners** native app. It mirrors
the proven NoLSAF Owner web experience at `apps/web/app/(owner)/owner/**` and the
proven Operator (agent) web experience at `apps/web/app/account/agent/**`, ported to
Expo React Native, following the same path the customer app (`apps/mobile`) and the
driver app (`apps/driver`, `NATIVE_DRIVER_APP.md`) already took.

## Governance

This document is managed and controlled by `NATIVE_APP_SETUP.md`. It inherits every
rule in that file and does not override any of them. In particular:

* This is Phase 5 of `NATIVE_APP_SETUP.md` ("NoLSAF Partners (Owner and Operator)"). It
  starts only after the customer and driver experiences are satisfactory.
* No admin scope. No admin dashboard, no admin only API, no admin actions on mobile.
  Owner and Operator are business roles, not platform administration. Suspension,
  payout approval, vetting, platform settings, and the impact center stay on the
  secured web admin portal only.
* Server authoritative numbers. Revenue, invoices, payouts, commission, ratings, and
  level are read only from the API. The Partners app never computes or edits these
  values.
* No dashes in user facing copy or in this document. Use commas, parentheses, or
  separate sentences. Write compound ideas as words, for example "check in", "check
  out", "group stays", "login history". API paths and code identifiers keep their
  literal hyphens (for example `mark-read`, `tour-bookings`, `claim-by-tour-code`),
  since they are not prose.
* Every screen ships loading, empty, error, offline, and success states.
* Reuse the NoLSAF theme tokens, the shared component set, the existing API client, and
  the secure auth storage pattern. Where a component is generic across roles, it lives
  in `packages/native-ui` and both the existing apps and `apps/partners` consume one
  copy. "Reuse the pattern" must not mean copy the file into `apps/partners`.

If a Partners app decision conflicts with `NATIVE_APP_SETUP.md`, the setup file wins and
this file must be updated to match.

## Why this file exists

`NATIVE_APP_SETUP.md` Phase 5 names the Partners scope at a high level: one app,
`com.nolsaf.partners`, with Owner and Operator dashboards gated by the account role
after login, the same way `apps/driver` gates on `kycStatus` and `suspendedAt`. The web
already implements both roles in full. This file turns that high level scope into a
concrete screen by screen plan, states what is ported directly, what is rebuilt for
mobile, and what is deferred.

## App shape decision

The Partners app is a **new Expo workspace**, `apps/partners`, not a new tab inside
`apps/mobile` or `apps/driver`. Reasons:

* `NATIVE_APP_SETUP.md` keeps the customer app a focused traveler product and the
  driver app a focused operational product. Owner and Operator have heavier business,
  inventory, and financial workflows that belong in their own binary with their own
  store listing and release cadence.
* Owner and Operator are both business partners of NoLSAF (one supplies stays, one
  supplies tours), so they share one app, separated by role inside it, rather than two
  separate installs. This is the deliberate native departure from web noted in
  `NATIVE_APP_SETUP.md`: on web Owner is a full portal with its own login and Operator
  lives inside the normal account area, but on native both become role gated dashboards
  in one app.
* `apps/partners` reuses the same theme tokens, shared UI components, API client
  pattern, and secure storage approach proven in `apps/mobile` and `apps/driver`. Any
  component that is generic across roles (account, security, document upload, policy
  pages, the Wallet style proof of payment receipt, `AmountCard`, `StatusBadge`, the
  overflow protection set) is consumed from `packages/native-ui`, not forked. The only
  things that stay app specific are the data and the role specific copy: which fields an
  owner profile has versus an operator profile, and which API endpoints each dashboard
  calls.

Workspace addition, same shape as `apps/mobile` and `apps/driver`:

```text
apps/partners/
  src/
  assets/
  package.json
  app.json
  eas.json
  tsconfig.json
```

```json
"workspaces": [
  "apps/api",
  "apps/web",
  "apps/mobile",
  "apps/driver",
  "apps/partners",
  "packages/*"
]
```

Store identity (proposed, confirm before first submission):

```text
iOS bundle identifier: com.nolsaf.partners
Android package name: com.nolsaf.partners
App name: NoLSAF Partners
```

## Shared code contract (how the apps share without contradictions)

This section is the binding answer to "how do the native apps share code without
drifting". It applies to `apps/mobile`, `apps/driver`, and `apps/partners`, and it
overrides any looser "reuse the pattern" wording elsewhere in this file.

### Current reality (the gap this contract closes)

As of this plan, sharing is declared but not wired:

* `packages/native-ui` (`@nolsaf/native-ui`) exists and holds the theme tokens, the UI
  primitives (`AppButton`, `AppCard`, `AppInput`, `AppText`, `StatusBadge`,
  `ConfirmSheet`, `BottomActionBar`, the overflow set, `SafeScreen`), and the `lib`
  helpers (`apiClient`, `secureSession`).
* `apps/mobile` does **not** depend on it. It has its own forked copies under
  `src/components`, `src/theme`, and `src/lib`. The components are still byte identical
  because the package was seeded by copying them, but `apiClient.ts` has **already
  diverged**: the package version is decoupled (`configureApiClient({ apiUrl })`) while
  the mobile copy is coupled to its own `./env`. The better version is in the package
  and is not the one in use.
* `apps/mobile/metro.config.js` is not configured for the monorepo (no `watchFolders`,
  no `resolver.nodeModulesPaths`), so it cannot resolve `@nolsaf/native-ui` yet.
* The real package manager is **npm**: root `package.json` pins
  `"packageManager": "npm@11.6.1"` with npm workspaces `apps/*` and `packages/*`, the
  tracked lockfile is `package-lock.json`, and pnpm refuses to run. npm workspaces
  already hoist to one root `node_modules`, and `@nolsaf/native-ui` is **already
  symlinked** there (`node_modules/@nolsaf/native-ui -> packages/native-ui`), so the
  shared package is already resolvable. The `pnpm-lock.yaml` (gitignored),
  `pnpm-workspace.yaml`, the `"pnpm"` key in `package.json`, and the README's "pnpm
  workspaces" wording are stale debris from a prior pnpm era and do not reflect reality.
  The fork in `apps/mobile` is therefore not a package manager problem at all: mobile
  can depend on `@nolsaf/native-ui` today. It simply was never wired to.

If `apps/partners` is scaffolded against `@nolsaf/native-ui` while `apps/mobile` keeps
its forks, the result is three way drift (package, mobile, partners). Finishing the
extraction is therefore a **prerequisite to Partners**, not a step inside it. See the
prerequisite milestone below.

### The four rules

1. **One source of truth.** Canonical shared code lives only in `@nolsaf/native-ui`.
   No app keeps its own copy of anything the package owns. Before Partners starts, the
   diverged `apiClient` is reconciled in favor of the package's decoupled
   `configureApiClient({ apiUrl })` design, each app calls `configureApiClient` once at
   startup with its own `EXPO_PUBLIC_API_URL`, and the `apps/mobile` fork is deleted.
2. **Real dependency and resolution, no build step.** Each native app declares
   `"@nolsaf/native-ui": "*"` in its `package.json` and consumes it as raw TypeScript
   (the package `main` and `types` are `src/index.ts`, transpiled by Metro). Each app's
   `metro.config.js` sets `watchFolders` to the workspace root and adds
   `resolver.nodeModulesPaths` for both the app and the root `node_modules`, alongside
   the existing single React resolution guard.
3. **A clear layer boundary.** What is shared versus app local is fixed:
   * Shared (in `@nolsaf/native-ui`): theme tokens, UI primitives, the overflow
     protection set, `apiClient` and `secureSession`, and the cross role flows that all
     three apps need identically (account editor, document upload, 2FA, password, login
     history, the policy page renderer, the Wallet style receipt proof, `AmountCard`).
   * App local: screens, navigation shells, and role or product specific data, types,
     and domain modules (for example the customer app's `transport`, `bookings`, and
     `groupStays` modules stay in `apps/mobile`; Owner property and booking modules and
     Operator tour booking modules stay in `apps/partners`).
   * "Reuse the pattern" always means consume the package. It never means copy a file
     into another app.
4. **A drift guard.** A change to any shared component is a workspace wide change. CI
   runs `typecheck` across `apps/mobile`, `apps/driver`, and `apps/partners` on every
   change to `packages/native-ui`, so a breaking edit cannot land for one app and rot
   the others. Versioning stays simple: the package is `private`, consumed by `*`
   (always the local source), and is never published.

### Prerequisite milestone (before Phase 1 of this plan)

This is shared foundation work, owned jointly with `NATIVE_DRIVER_APP.md`, and it must
land before `apps/partners` is scaffolded:

* Reconcile the diverged `apiClient` in `@nolsaf/native-ui` and confirm the package
  surface (`src/index.ts`) exports everything the three apps need.
* Add monorepo Metro resolution and the `@nolsaf/native-ui` dependency to `apps/mobile`,
  switch every `apps/mobile` import to the package, and delete the `apps/mobile` forks
  under `src/components`, `src/theme`, and `src/lib` that the package now owns.
* No package manager migration is needed. The repo is already unified on **npm**
  workspaces (pinned `npm@11.6.1`), already hoists to one root `node_modules`, and
  already symlinks `@nolsaf/native-ui` there. The native apps inherit this for free
  because the npm `workspaces` glob is `apps/*`. The only manifest work is hygiene:
  remove the stale pnpm debris (`pnpm-lock.yaml`, `pnpm-workspace.yaml`, the `"pnpm"`
  key in `package.json`) and update the README, which still says "pnpm workspaces", so
  the npm reality is not misread again. This is optional cleanup, not a blocker.
* Confirm `apps/mobile` still builds and runs against staging after the migration, with
  no behavior change. Only then scaffold `apps/partners` against the same package.

## Auth and the role gate

### One account system, one login

Partners auth uses the **same account, JWT, and role system as the rest of NoLSAF**.
There is no separate Partners login system to build, and there is no separate Owner
login to port. From `apps/api/src/middleware/auth.ts`:

* One account system. The JWT is carried as `Authorization: Bearer` (the mobile path)
  or as an httpOnly cookie (the web path). The token is stored in Expo SecureStore,
  never in plain AsyncStorage, exactly as `apps/mobile` and `apps/driver` do it.
* `Role` is already `ADMIN | OWNER | USER | DRIVER | AGENT`. Owner routes are gated by
  `requireRole("OWNER")`, Operator routes by `requireRole("AGENT")`.
* The middleware already enforces per role session TTL and returns `403`
  `ACCOUNT_SUSPENDED` when `suspendedAt` is set, so suspended partners are blocked at
  the API regardless of the client.

On web, Owner has its own login page (`apps/web/app/(auth)/owner/login`) while an
Operator logs in as a normal account holder. On native we collapse that into **one
login screen**. The role on the returned session decides which dashboard renders. One
login, one install, no role picker before login.

### One role per account (decision)

The backend `user.role` is a **single value**, and the two route trees require mutually
exclusive roles (`requireRole("OWNER")` versus `requireRole("AGENT")`). A single token
is therefore either Owner or Operator, never both at once.

For v1 the Partners app follows that backend reality directly:

* After login the app reads the single role from `GET /api/account/me` and renders that
  one dashboard. An Owner role account sees the Owner dashboard. An Operator (`AGENT`)
  role account sees the Operator dashboard.
* A person who is genuinely both keeps the existing web behavior (two accounts). A
  single account holding both roles, and an in app role switcher, are explicitly out of
  scope for v1. They would require a backend multi role capability and its own security
  review, which `NATIVE_APP_SETUP.md` already says owner and operator mobile scope must
  go through separately.
* The role gate is written so that adding a second role later is additive (a switcher in
  the shell), not a rewrite. The gate reads role from one place and the navigation shell
  keys off it.

### The role gate screen

Port the gate as the first screen after login, before either dashboard shell renders.
It mirrors the driver gate (`NATIVE_DRIVER_APP.md`, "Auth and the approval gate") and
the Operator home preflight in `apps/web/app/account/agent/page.tsx`. It calls
`GET /api/account/me`, then for an Operator also reads `GET /api/agent/me`, and branches:

* No session, or `401`, route to Login.
* `403 ACCOUNT_SUSPENDED` (global) or `403 AGENT_SUSPENDED` (operator specific from
  `GET /api/agent/me`), show a suspended state with the support contacts
  (`security@nolsaf.com`, `hr@nolsaf.com`), no further access. This matches the web
  Operator suspended panel.
* Role is `OWNER`, render the Owner shell.
* Role is `AGENT`, render the Operator shell.
* Role is anything else (`USER`, `DRIVER`, `ADMIN`), show a "this app is for NoLSAF
  property owners and tour operators" state with a way to reach support, and no
  dashboard. Admin and customer and driver accounts must not see partner data here.
* Incomplete onboarding (an operator who has not submitted the operator profile, or an
  owner with required fields missing), route to the screen that needs completion, the
  same way the web operator profile submit flow gates.

This screen needs loading, error (network or 401), and the states above. No dashes in
copy.

### Authorization is enforced server side

The app never decides what a partner may see by hiding buttons alone. Every Owner call
hits an `/api/owner/**` route behind `requireRole("OWNER")`, and every Operator call
hits an `/api/agent/**` route behind `requireRole("AGENT")`. A token for the wrong role
gets `403 Forbidden` from the API. The role gate is a user experience layer over an
authorization boundary the server already enforces, not the boundary itself. This
satisfies the Security Policy in `NATIVE_APP_SETUP.md`.

## The web flow we mirror

Read these pages as the blueprint. Each native screen maps to one of them, unless marked
deferred or rebuilt.

### Owner (`apps/web/app/(owner)/owner/**`)

```text
Shell and chrome       layout.tsx, OwnerSidebar, MobileOwnerNav
Dashboard              owner/page.tsx
Properties             owner/properties/** (approved, pending, add, [id], availability, layout)
Availability           owner/properties/[id]/availability/manage
Bookings               owner/bookings/** (recent, checked-in, check-out, checked-out, validate)
Group stays            owner/group-stays/** (list, [id], claims, claims/my-claims)
Revenue                owner/revenue/** (requested, paid, rejected, invoices, receipts)
Reports                owner/reports/** (overview, bookings, revenue, occupancy, stays, customers)
Invoices               owner/invoices/** (list, new, [id])
Messages               owner/messages/** (unread, viewed)
Notifications          owner/notifications/** (unread, read)
Profile                owner/profile
Security               owner/settings/** (2fa, password, login-history, passkeys, sessions)
Policies               owner/{terms,privacy,cookies-policy,cancellation-policy,
                       verification-policy,driver-disbursement-policy,
                       property-owner-disbursement-policy}
Support                owner/support
```

### Operator / agent (`apps/web/app/account/agent/**`)

```text
Dashboard              agent/page.tsx
Tour bookings          agent/tour-bookings/** (list, [id], completed)
Assignments            agent/assignments/** (list, [id])
Revenues               agent/revenues
Contract               agent/contract
Documents              agent/documents
Profile                agent/profile (+ profile/preview)
Operator card          agent/card
Reports                agent/reports
Notifications          agent/notifications
Security               agent/security/** (2fa, password, login-history, passkeys)
```

## The partner journey (the spine)

Two spines, one per role, sharing the same shell, account, security, and policy
foundation.

Owner spine:

1. Log in, pass the role and account status gate, land on the Owner dashboard.
2. Manage properties: see approved and pending, add a property, manage availability.
3. Work bookings: see recent and checked in, confirm check in, confirm check out,
   validate a booking code.
4. Respond to group stay requests and claims.
5. Track money: revenue (requested, paid, rejected), invoices, and receipts.
6. Read reports, manage profile, security, notifications, messages, and policy pages.

Operator spine:

1. Log in, pass the role and account status gate (including operator profile
   completeness and suspension), land on the Operator dashboard.
2. Work tour bookings: see assigned bookings, open a booking, validate pickup, run the
   activity checks, complete with a rating.
3. Track assignments and their status.
4. Track money: revenues, and claim revenue (by tour code where applicable).
5. Manage operator profile, operator card, contract, documents, security,
   notifications, and reports.

## Phases

### Phase 1: Foundation

* The Shared code contract prerequisite milestone above is **done first**:
  `@nolsaf/native-ui` is the single source of truth, `apps/mobile` consumes it with no
  remaining forks, Metro monorepo resolution is wired, and the workspace manifests
  agree. `apps/partners` is only scaffolded against the package after that. If a generic
  component the Partners app needs is still app specific in `apps/mobile` or
  `apps/driver` (account, security, document upload, policy renderer, the receipt proof
  component), extract it into the shared package and migrate the existing consumers in
  the same change, never copy it.
* Scaffold `apps/partners` (Expo, NoLSAF theme, Inter font), wired to the shared
  package, with staging and production environment switching.
* Login and the role and account status gate described above.
* Navigation shell: a bottom tab bar whose tabs depend on the gated role. Owner tabs
  (proposed): Home, Properties, Bookings, Money, Account. Operator tabs (proposed):
  Home, Tours, Revenue, Account. Exact labels confirmed when the shell is built; they
  mirror the web groupings without copying the web sidebar density.
* Notifications, reusing the customer and driver notification list pattern. Owner reads
  `GET /api/owner/notifications?tab=unread|read`; Operator reads
  `GET /api/agent/notifications` with `?tab` and `POST /api/agent/notifications/:id/mark-read`.

Exit criteria:

* Partners app launches on Android and iOS build targets, independent of the customer
  and driver apps.
* An Owner can log in against staging, pass the gate, and see the Owner dashboard. An
  Operator can do the same and see the Operator dashboard. A wrong role account is
  refused with a clear state.
* The shared component package is consumed by `apps/partners` for the foundation set.

### Phase 2: Owner core

* **Dashboard** (`owner/page.tsx` data sources): summary cards and quick links into
  properties, bookings, and money. Server authoritative numbers only.
* **Properties** (`GET /api/owner/properties/mine`, `GET /api/owner/properties/:id`,
  `POST /api/owner/properties`, `PUT /api/owner/properties/:id`,
  `POST /api/owner/properties/:id/submit`, `GET /api/owner/properties/:id/audit-history`).
  On web this is dense management tables. On native, rebuild as a list of property cards
  (status badge approved or pending, photo, title, location), with a detail screen and
  an add or edit form built on the shared document upload and form components. Heavy add
  flows (the multi step property add wizard) can ship as a later milestone inside this
  phase if needed.
* **Availability** (`GET /api/owner/availability/calendar`,
  `GET /api/owner/availability/summary`, `GET /api/owner/availability/blocks`,
  `POST /api/owner/availability/blocks`, `POST /api/owner/availability/blocks/bulk`,
  `PUT /api/owner/availability/blocks/:id`, `DELETE /api/owner/availability/blocks/:id`,
  `GET /api/owner/availability/check-conflicts`). Reuse the customer app calendar range
  component as a base, extended for block management.
* **Bookings** (`GET /api/owner/bookings/recent`,
  `GET /api/owner/bookings/checked-in`, `GET /api/owner/bookings/checked-out`,
  `GET /api/owner/bookings/for-checkout`, `GET /api/owner/bookings/sidebar-counts`,
  `GET /api/owner/bookings/:id`, `POST /api/owner/bookings/confirm-checkin`,
  `POST /api/owner/bookings/:id/confirm-checkout`,
  `POST /api/owner/bookings/validate`, `POST /api/owner/bookings/:id/send-invoice`).
  Rebuild the web booking tables as a single booking card list with filter chips
  (recent, checked in, ready for check out, checked out). Check in, check out, and code
  validation become confirm sheets, since they change booking state. Booking code
  validation can use the camera (QR) later, with a manual entry fallback first.
* **Group stays** (`GET /api/owner/group-stays`, `GET /api/owner/group-stays/:id`,
  `POST /api/owner/group-stays/:id/accept`, `POST /api/owner/group-stays/:id/check-in`,
  `POST /api/owner/group-stays/:id/message`, plus the claims router). Port the request
  and claim response flow as cards with a confirm sheet for accept and check in.

Exit criteria:

* An Owner can see properties and their approval status, add or edit a property, and
  manage availability blocks.
* An Owner can work the booking lifecycle (recent through checked out), validate a
  booking code, confirm check in and check out, and send an invoice.
* An Owner can respond to group stay requests and claims.

### Phase 3: Operator core

* **Dashboard** (`agent/page.tsx` data sources, `GET /api/agent/me`,
  `GET /api/agent/tour-bookings`): the booking stats (total, completed, in progress),
  the level and rating panel, and recent bookings, ported to mobile cards. Level and
  rating are read only.
* **Tour bookings** (`GET /api/agent/tour-bookings`, `GET /api/agent/tour-bookings/:id`,
  `POST /api/agent/tour-bookings/:id/validate-pickup`,
  `POST /api/agent/tour-bookings/:id/activity-checks`,
  `POST /api/agent/tour-bookings/:id/completion-rating`). This is the operator daily
  spine: a booking list with filter chips, a booking detail, validate pickup, run the
  activity checks, and complete with a rating. Validate pickup and completion become
  confirm sheets. Activity checks reuse the planned activities model the web uses.
* **Assignments** (`GET /api/agent/assignments`, `GET /api/agent/assignments/:id`):
  assignment list and detail, reusing the tour booking card pattern.
* **Operator profile and submission** (`GET /api/agent/me`,
  `PATCH /api/agent/operator-profile`, `POST /api/agent/operator-profile/submit`,
  `POST /api/agent/notify-admin`): the operator profile editor and the submit for
  review flow, built on the shared profile and document upload components with operator
  specific fields. Submission gating ties back to the role gate (an operator who has not
  submitted is routed here).
* **Operator card** (`agent/card`): the public operator card preview, rendered natively.

Exit criteria:

* An Operator can see their dashboard stats, level, and rating.
* An Operator can work a tour booking end to end: open it, validate pickup, run activity
  checks, and complete with a rating.
* An Operator can edit and submit the operator profile and view the operator card.

### Phase 4: Money (both roles)

Money is read mostly, with the few write actions the web already exposes, all server
authoritative.

* **Owner revenue** (`GET /api/owner/revenue/stats`,
  `GET /api/owner/revenue/invoices`, `GET /api/owner/revenue/invoices/:id`,
  `GET /api/owner/revenue/invoices/:id/receipt`,
  `GET /api/owner/revenue/invoices/:id/receipt/qr.png`, and the requested, paid,
  rejected views). Build receipt style screens using the shared Wallet style proof
  component, with a share action (`expo-sharing`) instead of the web print and CSV
  export. The `.csv` export does not port; offer share or a "view on web" link for bulk
  export.
* **Owner invoices** (`GET /api/owner/invoices/:id`,
  `GET /api/owner/invoices/for-booking/:bookingId`,
  `POST /api/owner/invoices/from-booking`, `POST /api/owner/invoices/:id/submit`):
  invoice list, invoice from a booking, and submit, as native forms and receipt views.
* **Owner reports** (`GET /api/owner/reports/overview`,
  `GET /api/owner/reports/bookings`, `GET /api/owner/reports/revenue`,
  `GET /api/owner/reports/occupancy`, `GET /api/owner/reports/stays`,
  `GET /api/owner/reports/customers`): port the report summaries as mobile friendly
  cards and simple charts, reusing the chart approach from the customer and operator
  dashboards. Dense desktop tables become summarized cards plus a "view full report on
  web" link where a table truly does not fit a phone.
* **Operator revenues** (`GET /api/agent/revenues`, `POST /api/agent/revenues/claim`,
  `POST /api/agent/revenues/claim-by-tour-code`): the revenues list and the claim
  actions, with a confirm sheet on claim since it is a money action.

Exit criteria:

* An Owner can see revenue (requested, paid, rejected), open an invoice and a receipt as
  a native proof screen, and create or submit an invoice from a booking.
* An Operator can see revenues and claim revenue, including by tour code.
* No screen depends on browser print, PDF rendering, or CSV download for correctness.

### Phase 5: Profile, security, policies, messages, and support (both roles)

* **Profile** (`GET`/`PUT /api/account/me`, plus role specific:
  `PATCH /api/agent/operator-profile` for operators, the owner profile fields for
  owners; Cloudinary signed uploads via `/api/uploads/cloudinary/sign`; logout via
  `/api/auth/logout`; `DELETE /api/account`). Reuse the shared account and document
  upload components, with role specific fields layered on top.
* **Security**: 2FA, password, and login history for both roles, reusing the shared
  security components extracted for the driver app. Owner uses `owner/settings/**`
  endpoints, Operator uses `agent/security/**` endpoints, pointed at the shared screens.
* **Passkeys**: WebAuthn based and browser only on web. Per the Security Policy in
  `NATIVE_APP_SETUP.md`, this needs its own native review (platform passkeys or device
  biometrics). Until that review, hide the passkeys entry on native and keep 2FA and
  password as the supported methods, exactly as the driver app does.
* **Messages** (Owner only, `owner/messages/**`, unread and viewed): the owner message
  list, reusing the notification list pattern.
* **Policies and support**: terms, privacy, cookies policy, cancellation policy,
  verification policy, the owner disbursement policies, and support, as static native
  screens through the shared policy renderer. Operator contract
  (`GET /api/agent/contract`, `POST /api/agent/contract/sign`) is a richer screen: show
  the structured contract fields plus a sign action with a confirm sheet, and a "view
  document" action that opens the stored file rather than rendering print HTML.

Exit criteria:

* Both roles can manage profile and documents, and run 2FA and password security flows
  natively. Passkeys are hidden or have a reviewed native equivalent.
* An Owner can read messages. Both roles can read all policy and support pages.
* An Operator can read and sign the contract.

## API readiness checklist for the Partners app

All of these already exist. Owner routes are mounted under `/api/owner/**` behind
`requireRole("OWNER")`; Operator routes under `/api/agent/**` behind
`requireRole("AGENT")`; shared account and auth under `/api/account/**` and
`/api/auth/**`.

```text
Shared (both roles)
GET    /api/account/me                              gate, profile
PUT    /api/account/me                              profile edits
POST   /api/auth/logout                             logout
POST   /api/uploads/cloudinary/sign                 document and photo uploads
DELETE /api/account                                 account deletion

Owner
GET    /api/owner/properties/mine                   properties list
GET    /api/owner/properties/:id                    property detail
POST   /api/owner/properties                        add property
PUT    /api/owner/properties/:id                    edit property
POST   /api/owner/properties/:id/submit             submit for review
GET    /api/owner/properties/:id/audit-history      property history
GET    /api/owner/availability/calendar             availability
GET    /api/owner/availability/summary              availability
GET    /api/owner/availability/blocks               availability
POST   /api/owner/availability/blocks               availability
POST   /api/owner/availability/blocks/bulk          availability
PUT    /api/owner/availability/blocks/:id           availability
DELETE /api/owner/availability/blocks/:id           availability
GET    /api/owner/availability/check-conflicts      availability
GET    /api/owner/bookings/recent                   bookings
GET    /api/owner/bookings/checked-in               bookings
GET    /api/owner/bookings/checked-out              bookings
GET    /api/owner/bookings/for-checkout             bookings
GET    /api/owner/bookings/sidebar-counts           bookings
GET    /api/owner/bookings/:id                       booking detail
POST   /api/owner/bookings/confirm-checkin          bookings
POST   /api/owner/bookings/:id/confirm-checkout     bookings
POST   /api/owner/bookings/validate                 bookings (code validation)
POST   /api/owner/bookings/:id/send-invoice         bookings
GET    /api/owner/group-stays                       group stays
GET    /api/owner/group-stays/:id                   group stays
POST   /api/owner/group-stays/:id/accept            group stays
POST   /api/owner/group-stays/:id/check-in          group stays
POST   /api/owner/group-stays/:id/message           group stays
GET    /api/owner/revenue/stats                     money
GET    /api/owner/revenue/invoices                  money
GET    /api/owner/revenue/invoices/:id              money
GET    /api/owner/revenue/invoices/:id/receipt      money
GET    /api/owner/revenue/invoices/:id/receipt/qr.png money
GET    /api/owner/invoices/:id                       invoices
GET    /api/owner/invoices/for-booking/:bookingId   invoices
POST   /api/owner/invoices/from-booking             invoices
POST   /api/owner/invoices/:id/submit               invoices
GET    /api/owner/reports/overview                  reports
GET    /api/owner/reports/bookings                  reports
GET    /api/owner/reports/revenue                   reports
GET    /api/owner/reports/occupancy                 reports
GET    /api/owner/reports/stays                     reports
GET    /api/owner/reports/customers                 reports
GET    /api/owner/notifications?tab=unread|read     notifications

Operator (agent)
GET    /api/agent/me                                gate, level, rating, suspension
PATCH  /api/agent/operator-profile                  profile
POST   /api/agent/operator-profile/submit           profile submit
POST   /api/agent/notify-admin                      profile
GET    /api/agent/tour-bookings                     tour bookings
GET    /api/agent/tour-bookings/:id                 tour booking detail
POST   /api/agent/tour-bookings/:id/validate-pickup tour bookings
POST   /api/agent/tour-bookings/:id/activity-checks tour bookings
POST   /api/agent/tour-bookings/:id/completion-rating tour bookings
GET    /api/agent/assignments                       assignments
GET    /api/agent/assignments/:id                   assignment detail
GET    /api/agent/revenues                          money
POST   /api/agent/revenues/claim                    money
POST   /api/agent/revenues/claim-by-tour-code       money
GET    /api/agent/contract                          contract
POST   /api/agent/contract/sign                     contract
GET    /api/agent/notifications (+ ?tab)            notifications
POST   /api/agent/notifications/:id/mark-read       notifications

Needs native review (both roles)
GET/POST /api/.../security/passkeys (+ sub routes)  WebAuthn, browser only
```

Nothing in the table above requires API changes to start Phase 1. If a gap is found
during implementation (for example a report that only renders as a desktop table, or a
mobile friendly shape that web does not return), follow the API Contract Policy in
`NATIVE_APP_SETUP.md`: extend the response, do not fork a parallel endpoint, and keep it
backward compatible with web.

## Open items to confirm before scaffolding `apps/partners`

1. Confirm `com.nolsaf.partners` identifiers for iOS and Android, and the app name
   "NoLSAF Partners".
2. Confirm the staging API base URL for the Partners app (likely the same as
   `apps/mobile` and `apps/driver`).
3. Confirm the one role per account decision for v1 (no in app role switcher, no backend
   multi role), so the role gate and shell are built against it. A future dual role
   capability stays a separate backend change plus security review.
4. Confirm the two bottom tab structures: Owner (Home, Properties, Bookings, Money,
   Account) and Operator (Home, Tours, Revenue, Account), with the team before building
   the shell.
5. Confirm how far the Owner property add wizard and the Owner reports tables go on
   mobile versus a "view on web" link, since those are the densest web surfaces.
6. Confirm the branch name for this work, for example `native/partners-foundation`,
   following the Branching Policy in `NATIVE_APP_SETUP.md`.
7. Confirm the Shared code contract prerequisite is scheduled before Partners
   scaffolding: reconcile the diverged `apiClient`, migrate `apps/mobile` to consume
   `@nolsaf/native-ui` (already symlinked by npm workspaces) and delete its forks, and
   wire Metro monorepo resolution (`watchFolders` to the workspace root plus
   `resolver.nodeModulesPaths`). No package manager change is needed; the repo is
   already unified on npm. Optionally remove the stale pnpm debris and fix the README.
   Without the consume and delete step, Partners would institutionalize a three way fork.

## Implementation progress

This section records what is actually built, so the plan stays a living reference.
Every new addition is logged here as it lands, the same convention the customer app
uses in `NATIVE_APP_SETUP.md`.

### Shared dashboard kit in `packages/native-ui` (built)

The first real code is the shared, role neutral dashboard primitives, added to
`@nolsaf/native-ui` so both the Owner and Operator homes (and the driver app) compose
the same components instead of forking. This follows the Shared code contract: generic
UI lives in the package, screens live in the app. All use the existing theme tokens
(`colors`, `radius`, `spacing`, `shadows`, `fonts`) and the overflow protection rules
(`numberOfLines`, `minWidth: 0`, `flexShrink`). The chart and hero use
`react-native-svg`, already a package dependency, so no new dependency was added.

Components added under `packages/native-ui/src/components/` and exported from the
package index:

* `PartnerHero`, the premium dark teal hero reused from the web portal look: an svg
  gradient plus a faint trend backdrop, an eyebrow, an optional Live pill, the title and
  subtitle, and a children slot for the in hero stat cards. `align="center"` matches the
  Owner home, `align="left"` the Operator home.
* `HeroStat`, the translucent glass stat card that sits inside `PartnerHero` (for
  example BOOKINGS and NET REVENUE), with a role accent color, optional icon, optional
  currency prefix, and footer.
* `StatCard`, the white home stat card: tinted icon, label, large value, optional
  `DeltaBadge`, and optional caption or `Sparkline`. Read only; it renders the values it
  is given and never computes them.
* `DeltaBadge`, the up, down, or steady trend pill (green, red, neutral), icon library
  agnostic (uses a glyph arrow).
* `Sparkline`, the fading discrete bars, ported from the web `Sparkline`.
* `MiniTrendChart`, the dark 14 day line chart card (multiple series, faint grid,
  optional legend), built on `react-native-svg`.
* `SnapshotTile`, the compact color coded tile (Requested, Paid, Awaiting action, and so
  on) used in the 2x2 grids under the trend chart.

State: `npm run typecheck` on `@nolsaf/native-ui` passes against the real
`react-native` and `react-native-svg` types. These live on `native/integration` per the
Commit Routing in `BRANCHING.md` (shared native UI belongs on the native trunk). Built
but not yet consumed by a screen; the next step scaffolds `apps/partners` and composes
the Owner and Operator home screens from these primitives.

### App scaffold, single login, and the role gate (built)

`apps/partners` is scaffolded as an Expo workspace that consumes `@nolsaf/native-ui`
from day one (no forks), and the gateway that controls which dashboard renders is
built end to end:

* App config: `package.json` (`@nolsaf/partners`, `com.nolsaf.partners`), `app.json`,
  `tsconfig.json`, `babel.config.js`, `index.js`, and `metro.config.js` with the
  monorepo resolution the Shared code contract requires (`watchFolders` to the
  workspace root, `resolver.nodeModulesPaths` for the app and root `node_modules`, and
  the single React resolution guard).
* `App.tsx` loads the Inter fonts, calls `configureApiClient({ apiUrl })` once at
  startup from `EXPO_PUBLIC_API_URL` (the decoupled client, so the package stays free
  of any app's env module), and renders a boot screen, then the login, then the gate.
* Auth (`src/auth/`): `AuthProvider` (bootstrap from secure storage, password login,
  logout), `authApi` (`POST /api/auth/login-password`, `GET /api/account/me`,
  `GET /api/agent/me`, `POST /api/auth/logout`), `types`, and `secureSession` bound to
  the `nolsaf_partners_token` key via the shared `createSecureSession`. Mirrors the
  customer app pattern, trimmed (no registration or OTP, partners already hold
  accounts).
* `LoginScreen`: the single Partners login, built from the shared `AppInput`,
  `AppButton`, and `SafeScreen`. One login for both roles.
* `RoleGateScreen`: the gateway. After the `authenticated` state it reads the single
  account role and branches, the same boundary the API enforces with
  `requireRole("OWNER")` and `requireRole("AGENT")`: `OWNER` renders the Owner home;
  `AGENT` calls `/api/agent/me` and renders the Operator home, or a suspended state on
  `403 AGENT_SUSPENDED`; any other role (customer, driver, admin) is refused with a
  clear message. v1 is one role per account, with no in app switcher. Loading, error,
  suspended, and refused states are all present.
* `OwnerHomeScreen` and `OperatorHomeScreen`: composed entirely from the dashboard kit
  (`PartnerHero`, `HeroStat`, `StatCard`, `MiniTrendChart`, `SnapshotTile`,
  `StatusBadge`, `AppBottomNav`), matching the agreed phone design. `PartnerHero` gained
  an optional `headerRight` slot (used here for sign out).

State: `@nolsaf/native-ui` typecheck still passes (exit 0). A standalone
`apps/partners` typecheck is blocked only on the workspace install, plus the known
single `@types/react` dedup that `NATIVE_DRIVER_APP.md` already resolved with a tsconfig
react types pin (the errors are duplicate `@types/react` resolution in native-ui, not
defects in the Partners code). The Partners code mirrors the proven customer app
structure.

### Owner bookings tab and validation (built)

The Owner Bookings tile and bottom tab are now wired to the same backend routes the web
Owner portal uses. This is the first Owner core workflow beyond the dashboard shell.

Built in `apps/partners`:

* `src/ownerBookings/` contains the Owner booking API client, types, and formatting
  helpers. It calls the existing web backed routes, not mobile specific forks:
  `/api/owner/reports/bookings`, `/api/owner/bookings/recent`,
  `/api/owner/bookings/checked-in`, `/api/owner/bookings/for-checkout`,
  `/api/owner/bookings/checked-out`, `/api/owner/bookings/validate`,
  `/api/owner/bookings/confirm-checkin`, and
  `/api/owner/bookings/:id/confirm-checkout`.
* `OwnerBookingsScreen` renders the mobile segments from the Partners plan: All,
  Recent, Checked in, Check out, and History. The dense web tables are rebuilt as
  booking cards with property, guest, code, room, dates, status, owner amount, search,
  counts, refresh, and a check out confirm flow.
* `OwnerBookingValidationScreen` is the single validator for both receipt QR payloads
  and typed booking codes. It uses `expo-camera` and `CameraView` to scan QR codes,
  normalizes the result the same way the web page does (JSON receipt payloads pass
  through, URL query codes are extracted, plain text becomes the booking code), then
  sends the value to `/api/owner/bookings/validate`. It displays the backend
  eligibility result and confirms check in through `/api/owner/bookings/confirm-checkin`
  with the same consent snapshot shape the web flow records.
* `OwnerHomeScreen` now routes the Bookings tab to the real bookings screen and the
  center QR action to validation. Camera permission is declared in `app.json`, and the
  manual fallback stays available when camera access is denied.

State: `npm --workspace=@nolsaf/partners run typecheck` passes, and
`npx expo export --platform web` from `apps/partners` bundles successfully against the
new screens.

### Owner revenue and payouts (built)

The Owner Account sheet `Revenue & Payouts` item is now wired to a native revenue
screen using the same backend routes as the web Owner portal.

Built in `apps/partners`:

* `src/ownerRevenue/` contains the Owner revenue API client, types, and formatting
  helpers. It calls `/api/owner/revenue/stats`,
  `/api/owner/revenue/invoices`, `/api/owner/revenue/invoices/:id`, and
  `/api/owner/revenue/invoices/:id/receipt`.
* `OwnerRevenueScreen` renders mobile segments for All, Requested, Paid, and Rejected.
  Requested uses the same canonical plus legacy status query as web,
  `REQUESTED,SUBMITTED`. Paid and Rejected use `PAID` and `REJECTED`.
* The screen shows server authoritative totals, paid revenue, pending revenue,
  invoice counts, search, load more, refresh, invoice cards, invoice detail, and paid
  receipt QR payload data. Commission and payout math stay server supplied through
  `netPayable` and `total`.
* `OwnerHomeScreen` routes the Account sheet revenue item and the dashboard money
  snapshot tiles into the matching revenue segment.

State: `npm --workspace=@nolsaf/partners run typecheck` passes against the new revenue
screen. The Expo web export should remain the final smoke test after each native money
increment.

Still to build:

* Wire the remaining Owner dashboard cards to live data
  (`/api/owner/properties/mine`, `/api/owner/reports/*`); the Owner Bookings and
  Revenue screens are live, but some dashboard hero and stat cards still use sample
  values.
* Wire `OperatorHomeScreen` to live data (`/api/agent/me`,
  `/api/agent/tour-bookings`); it uses sample values today.
* Expand the navigation shell beyond the home tab (Properties, Bookings, Money, Account
  for Owner; Tours, Revenue, Account for Operator) using the bottom tabs already shown.
