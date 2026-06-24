# NoLSAF Native Driver App Plan

This file is the single plan for building the Driver native app. It mirrors the
proven NoLSAF driver web experience at `apps/web/app/(driver)/driver/**`, ported to
Expo React Native, following the same path the customer app already took.

## Governance

This document is managed and controlled by `NATIVE_APP_SETUP.md`. It inherits every
rule in that file and does not override any of them. In particular:

* This phase starts only after the customer app foundation is stable and reviewed
  (Phase 4 of `NATIVE_APP_SETUP.md`, "Driver app second").
* No admin scope. No admin dashboard, no admin only API, no admin actions on mobile.
* Server authoritative numbers. Earnings, payouts, bonus, level, and trip pricing are
  read only from the API. The driver app never computes or edits these values.
* No dashes in user facing copy or in this document. Use commas, parentheses, or
  separate sentences. Write compound ideas as words, for example "pick up", "drop
  off", "on demand". API paths and code identifiers keep their literal hyphens (for
  example `referral-earnings`), since they are not prose.
* Every screen ships loading, empty, error, offline, and success states.
* Reuse the NoLSAF theme tokens, the shared component set (`AppScreen`, `AppHeader`,
  `AppText`, `AppButton`, `AppInput`, `AppCard`, `StatusBadge`, `EmptyState`,
  `ErrorState`, `LoadingState`, `ConfirmSheet`, and the overflow protection
  components), and the existing API client and secure auth storage pattern built for
  `apps/mobile`.
* Follow the Overflow Prevention Policy and the Security Policy from
  `NATIVE_APP_SETUP.md` for every screen below, including the active trip screen.

If a driver app decision conflicts with `NATIVE_APP_SETUP.md`, the setup file wins and
this file must be updated to match.

## Why this file exists

`NATIVE_APP_SETUP.md` Phase 4 ("Driver App Foundation") names the driver scope at a
high level: assigned trips, scheduled trips, dispatch status, payout visibility,
ratings, and safe operational flows. The web already implements all of this. This file
turns that high level scope into a concrete screen by screen plan, states what is
ported directly, what is rebuilt for mobile, and what is deferred.

## App shape decision

The driver app is a **new Expo workspace**, `apps/driver`, not a new tab inside
`apps/mobile`. Reasons:

* `NATIVE_APP_SETUP.md` keeps the first app a focused traveler product. Mixing a
  driver mode into the same binary would mean shipping driver only permissions
  (background location, "always" location for active trips) to every traveler who
  installs the app.
* Drivers and travelers are different audiences with different store listings,
  permission justifications, and release cadences.
* `apps/driver` reuses the same theme tokens, shared UI components, API client
  pattern, and secure storage approach already proven in `apps/mobile`. Where a
  component is generic (`AppButton`, `AppCard`, `StatusBadge`, `AmountCard`,
  `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmSheet`, the overflow protection
  set), move it to a shared package (for example `packages/native-ui`) so both apps
  consume one copy instead of duplicating files. This refactor happens at the start
  of Phase 1 below, before driver screens are built, so neither app forks the
  component set.

This is not a one time Phase 1 event. Phase 1 only moves what the foundation needs
immediately. Later phases (3 and 4 below) build account, security, document upload,
and policy page components that are just as generic across roles as the Phase 1 set,
since the customer app already has its own profile, 2FA, password, login history, and
document upload screens. When a Phase 3 or 4 screen below says "reuse the customer
app's pattern", the rule is the same as Phase 1: extract the component or flow into
the shared package at that point, and have both `apps/mobile` and `apps/driver`
consume the shared version. "Reuse the pattern" must not mean copy the file into
`apps/driver`. The only things that stay app specific are the data: which fields a
driver profile has versus a customer profile, which API endpoints are called, and any
role specific copy or validation.

Workspace addition, same shape as `apps/mobile`:

```text
apps/driver/
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
  "packages/*"
]
```

Store identity (proposed, confirm before first submission):

```text
iOS bundle identifier: com.nolsaf.driver
Android package name: com.nolsaf.driver
App name: NoLSAF Driver
```

## The web flow we mirror

Read these pages as the blueprint. Each native screen maps to one of them, unless
marked deferred or rebuilt.

```text
Shell and KYC gate     apps/web/app/(driver)/driver/layout.tsx
Dashboard              apps/web/app/(driver)/driver/page.tsx
Trips (on demand)      apps/web/app/(driver)/driver/trips/page.tsx
Trip detail            apps/web/app/(driver)/driver/trips/[id]/page.tsx
Scheduled trips        apps/web/app/(driver)/driver/trips/scheduled/page.tsx
History                apps/web/app/(driver)/driver/history/page.tsx
Reminders              apps/web/app/(driver)/driver/reminders/page.tsx
Notifications          apps/web/app/(driver)/driver/notifications/page.tsx (+ unread/read)
Rating                 apps/web/app/(driver)/driver/rating/page.tsx
Payouts                apps/web/app/(driver)/driver/payouts/page.tsx
Bonus                  apps/web/app/(driver)/driver/bonus/page.tsx
Level                  apps/web/app/(driver)/driver/level/page.tsx
Referral               apps/web/app/(driver)/driver/referral/page.tsx
Invoices               apps/web/app/(driver)/driver/invoices/** (list, detail)
Profile                apps/web/app/(driver)/driver/profile/page.tsx
Management             apps/web/app/(driver)/driver/management/** (contract, license, insurance)
Security               apps/web/app/(driver)/driver/security/** (2fa, password, logins, passkeys)
Policies               apps/web/app/(driver)/driver/{terms,privacy,cookies-policy,cancellation-policy,
                       verification-policy,driver-disbursement-policy}/page.tsx
Support                apps/web/app/(driver)/driver/support/page.tsx

Deferred (Phase 5):
Live map and dispatch  apps/web/app/(driver)/driver/map/page.tsx, DriverLiveMapPageClient.tsx
```

## Auth and the approval gate

Driver auth uses the **same cookie session and role system as customer web**
(`requireRole("DRIVER")` plus `requireApprovedDriver` in `apps/api/src/routes/driver.ts`).
There is no separate driver login system to build. The native app extends the
customer app's Bearer token plus secure storage approach to the `DRIVER` role.

Port the gate from `apps/web/app/(driver)/driver/layout.tsx` as the first screen after
login, before the driver shell renders. It calls `GET /api/account/me` and branches on:

* `kycStatus = PENDING_KYC`, show a "verification in review" state, no further access.
* `kycStatus = REJECTED_KYC`, show an "action required" state with the rejection
  reason and a way to reach support.
* `suspendedAt` set or `isDisabled`, show a suspended state, no further access.
* Incomplete onboarding (missing required profile or document fields), route to the
  profile or management screen that needs completion.
* Otherwise, render the driver shell.

This screen needs loading, error (network or 401), and the four states above. No
dashes in copy, per the writing convention.

## Online and offline, and the active trip model without a map

The driver app needs an online and offline concept from Phase 2, even before the live
map (Phase 5) exists, because trip offers and the active trip screen depend on it.

* `GET /api/driver/availability` reads the current state. `POST /api/driver/availability`
  toggles it. Show this as a clear switch on the dashboard, with a short label
  explaining that going online makes the driver eligible for on demand trips.
* While a trip is active (`POST /api/driver/trips/:id/accept` succeeded and the trip is
  not yet completed), the app sends `POST /api/driver/location` on an interval (mirror
  the web's 10 second throttle) using `expo-location` foreground tracking. Background
  location is a Phase 5 decision once the live map and navigation are in scope, and
  must go through the Permissions section of `NATIVE_APP_SETUP.md` (clear wording for
  why location is needed, App Store review).
* Trip stage changes (for example arrived at pickup, passenger onboard, completed) use
  `POST /api/driver/trips/:id/stage` with a stage name. In v1 these are buttons in a
  fixed order, not a map controlled flow.
* Realtime trip offers normally arrive over Socket.IO on web
  (`nols:driver:trip:request`). Until the native Socket.IO client is in scope (Phase
  5), the active trip screen polls `GET /api/driver/trips` while online, on a short
  interval, to discover newly assigned on demand trips. This keeps v1 honest: slightly
  less instant than web, but fully functional, and the polling code becomes the
  fallback path once sockets are added.

## The driver journey (the spine)

1. Log in, pass the KYC and account status gate, land on the dashboard.
2. Go online. While online, the app polls for an assigned on demand trip.
3. When a trip is assigned, accept or decline it from the active trip screen.
4. Work the trip through its stages (arrived, picked up, completed), with the
   location ping running.
5. Separately, browse and claim scheduled trips ahead of time from the scheduled
   trips screen.
6. Track earnings: payouts, bonus, level, and referral.
7. Manage account: profile, documents, contract, license, insurance, security,
   notifications, ratings, history, reminders, and policy pages.

## Phases

### Phase 1: Foundation

* Extract the shared, generic components used by `apps/mobile` (`AppScreen`,
  `AppHeader`, `AppText`, `AppButton`, `AppInput`, `AppCard`, `StatusBadge`,
  `AmountCard`, `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmSheet`, the
  overflow protection set, the theme tokens, the API client base, and the secure auth
  storage helpers) into a shared package so `apps/driver` does not fork them.
* Scaffold `apps/driver` (Expo, NoLSAF theme, Inter font), wired to the shared
  package.
* Login and the KYC and account status gate described above.
* Navigation shell: a bottom tab bar with Home, Trips, Earnings, Account (exact
  labels confirmed when the shell is built; mirrors the web sidebar groupings without
  copying its density).
* Dashboard screen (`GET /api/driver/dashboard`, `GET /api/driver/stats`): today's
  summary, online and offline switch (`GET`/`POST /api/driver/availability`), and
  quick links into trips and earnings.
* Notifications (`GET /api/driver/notifications`, with `?tab=unread`/`?tab=viewed`,
  and `POST /api/driver/notifications/:id/mark-read`), reusing the customer app's
  notification list pattern.

Exit criteria:

* Driver app launches on Android and iOS build targets, independent of the customer
  app.
* A driver can log in against staging, pass the gate, and see the dashboard.
* Shared component package exists and both `apps/mobile` and `apps/driver` use it for
  at least the components listed above.

### Phase 2: Trips core

* **Trip list** (`GET /api/driver/trips`). On web this is a dense desktop table split
  into admin assigned and on demand sections. On native, rebuild as a single list of
  trip cards (status badge, route summary, scheduled time, vehicle type icon), with
  filter chips instead of separate tables. Tapping a card opens trip detail.
* **Trip detail** (`GET /api/driver/trips/:id`). This screen on web already matches
  the native design language closely (route summary, countdown to pickup, arrival
  info, passenger contact, claim status). Port it close to as is: hero card, route
  from and to, countdown, passenger card, and trip code.
* **Active trip screen** (new for native, no direct web equivalent at this fidelity).
  Shown when a trip is `ACCEPTED` or in progress. Contains:
  * Route summary (from and to, addresses, no map in v1).
  * Passenger contact (name, phone, call action).
  * Stage buttons in order (`POST /api/driver/trips/:id/stage`), each disabled until
    the previous stage is done, per the Status Language rules in
    `NATIVE_APP_SETUP.md`.
  * Accept and decline actions when a trip is newly offered
    (`POST /api/driver/trips/:id/accept`, `POST /api/driver/trips/:id/decline`).
  * Cancel action (`POST /api/driver/trips/:id/cancel`) with a confirm sheet, since
    cancellation is hard to reverse.
  * Location ping loop (`POST /api/driver/location`) while the screen is active and
    the trip is in progress.
  * Quick messages to the passenger (`POST /api/driver/messages/send`), as a short
    list of preset messages, matching the web's quick message set.
* **Scheduled trips** (`GET /api/driver/trips/scheduled` with optional
  `?vehicleType=`, `GET /api/driver/trips/scheduled/assigned`,
  `GET /api/driver/trips/claims/pending`, `GET /api/driver/trips/claims/finished`,
  `POST /api/driver/trips/:id/claim`). Port the available, pending, awarded, and
  finished tabs as a segmented control over the same trip card component used in the
  trip list. The web's auction terms and policy checkboxes (shown before claiming)
  become a `ConfirmSheet` with the same copy and checkboxes, not a `createPortal`
  modal.
* **History** (`GET /api/driver/trips` with date filters, mirroring the web history
  page) and **Reminders** (`POST /api/driver/reminders/:id/read`), reusing the trip
  card and notification list patterns respectively.
* **Rating** (`GET /api/driver/rating`): a simple score summary screen, following the
  Wise style trust language from `NATIVE_APP_SETUP.md` for any numeric trust signal.

Exit criteria:

* A driver can see assigned and on demand trips, open trip detail, accept or decline,
  move a trip through its stages, and cancel with confirmation.
* A driver can browse, claim, and track scheduled trips through all four states.
* Location ping runs only while a trip is active, and stops when the trip ends or the
  screen is left.

### Phase 3: Earnings and money

* **Payouts** (`GET /api/driver/payouts`): list of payout records with status,
  amount, and date, using `AmountCard` and the existing status vocabulary
  (`pending`, `paid`, `failed`, and so on).
* **Bonus** (`GET /api/driver/bonus/eligibility`, `GET /api/driver/bonus/history`,
  `GET /api/driver/performance`): eligibility summary plus history list.
* **Level** (`GET /api/driver/level`, `POST /api/driver/level/message`): current
  level, progress, and a way to send a message about level status, matching the web
  flow.
* **Referral** (`GET /api/driver/referral`, `GET /api/driver/referral-earnings`,
  `GET /api/driver/referral-earnings/withdrawals`, `GET /api/driver/referral/performance`,
  `POST /api/driver/referral-earnings/apply-withdrawal`): referral code and stats,
  earnings list, and a withdrawal action with a confirm sheet.
* **Invoices** (`GET /api/driver/invoices`, `GET /api/driver/invoices/:id`). The web
  print and viewer pages are Next.js print CSS and do not port. Instead, build one
  receipt style screen, extracting the Wallet style proof of payment component from
  the customer app into the shared package if it is not already there (booking code,
  amounts, status, date), with a share action (`expo-sharing`) instead of print.

Exit criteria:

* A driver can see payouts, bonus eligibility and history, level and progress,
  referral stats and earnings, and individual invoices as receipt style screens.
* No screen depends on browser print or PDF rendering.

### Phase 4: Profile, management, security, and policies

* **Profile** (`GET`/`PUT /api/account/me`, `PUT /api/driver/profile`,
  `GET /api/account/payment-methods`, `PUT /api/account/documents`,
  `PUT /api/account/payouts`, `DELETE /api/account`, Cloudinary signed uploads via
  `/api/uploads/cloudinary/sign`, logout via `/api/auth/logout`). Extract the customer
  app's account and document upload components (`expo-image-picker` based) into the
  shared package, then build the driver profile screen on top of them with driver
  specific fields.
* **Management**: `GET /api/driver/license/meta` (management home),
  `GET /api/driver/contract` (contract), `GET /api/driver/license` (license),
  `GET /api/account/me` (insurance). Where the web shows a document or PDF, the native
  screen shows the structured fields plus a "view document" action that opens the
  stored file URL in the system browser or a native PDF viewer, rather than rendering
  print HTML.
* **Security**: 2FA (`GET`/`POST /api/driver/security/2fa`,
  `GET /api/driver/security/2fa/provision`), password
  (`POST /api/driver/security/password`), login history
  (`GET /api/driver/security/logins`), sessions. If the customer app's 2FA, password,
  and login history components are not already in the shared package, extract them
  here, then point both apps at the shared versions with role specific endpoints.
* **Passkeys** (`GET`/`POST /api/driver/security/passkeys`, plus
  `/authenticate`, `/authenticate/verify`, and `DELETE /security/passkeys/:id`) are
  WebAuthn based and browser only. Per the Security Policy in
  `NATIVE_APP_SETUP.md`, this needs its own review for a native credential API (for
  example platform passkeys via `expo-passkeys` or device biometrics as a substitute).
  Until that review, hide the passkeys entry on native and keep 2FA and password as
  the supported methods.
* **Policies and support**: terms, privacy, cookies policy, cancellation policy,
  verification policy, driver disbursement policy, and support are static content.
  If the customer app already has a static policy page renderer in the shared
  package, reuse it with driver copy. Otherwise build one shared renderer here so
  both apps render policy pages the same way, satisfying the Store Readiness Policy's
  requirement for privacy and support links.

Exit criteria:

* A driver can manage their profile, documents, contract, license, and insurance
  information.
* 2FA and password security flows work natively. Passkeys are either hidden or have a
  reviewed native equivalent.
* All policy and support pages exist as static native screens.

### Phase 5: Live map and dispatch (deferred)

Out of scope until Phases 1 through 4 are reviewed and stable. When this phase
starts, it must address, as separate decisions:

* Realtime trip offers: a native Socket.IO client replacing the web's
  `window`/`CustomEvent` based event bus
  (`nols:driver:trip:request`, `nols:driver:pos`, `nols:route:eta`, `nols:route:nav`,
  `nols:route:status`, `nols:route:options`), to replace the Phase 2 polling fallback.
* On device map: a native map library (for example `@rnmapbox/maps` or
  `react-native-maps`) to show the driver's position, the pickup, and the drop off.
* Turn by turn navigation: either a native navigation SDK, or a simplified ETA and
  heading display computed from periodic location pings and the Directions API,
  consistent with the "simplified ETA for v1" idea raised during research.
* Background location: only once navigation is in scope, with explicit permission
  copy for App Store and Play Store review, per the Permissions section of
  `NATIVE_APP_SETUP.md`.
* `GET /api/driver/map` (the web map data endpoint) and `GET /api/driver/safety`
  become relevant here.

This phase gets its own detailed screen plan when it starts, following the same
format as Phases 1 through 4 above.

## API readiness checklist for the driver app

All of these already exist and are mounted under `/api/driver/**` (via
`apps/api/src/routes/driver.ts`) or `/api/account/**`:

```text
GET    /api/account/me                          gate, profile
PUT    /api/account/me                          profile edits
GET    /api/driver/dashboard                    dashboard
GET    /api/driver/stats                        dashboard
GET    /api/driver/availability                 online/offline state
POST   /api/driver/availability                 online/offline toggle
GET    /api/driver/notifications                notifications list
POST   /api/driver/notifications/:id/mark-read  notifications
GET    /api/driver/trips                        on demand trip list
GET    /api/driver/trips/:id                    trip detail
POST   /api/driver/trips/:id/accept             active trip
POST   /api/driver/trips/:id/decline            active trip
POST   /api/driver/trips/:id/cancel             active trip
POST   /api/driver/trips/:id/stage              active trip
POST   /api/driver/location                     active trip location ping
POST   /api/driver/messages/send                active trip quick messages
GET    /api/driver/trips/scheduled              scheduled trips
GET    /api/driver/trips/scheduled/assigned     scheduled trips
GET    /api/driver/trips/claims/pending         scheduled trips
GET    /api/driver/trips/claims/finished        scheduled trips
POST   /api/driver/trips/:id/claim              scheduled trips
GET    /api/driver/rating                       rating
GET    /api/driver/payouts                      earnings
GET    /api/driver/bonus/eligibility            earnings
GET    /api/driver/bonus/history                earnings
GET    /api/driver/performance                  earnings
GET    /api/driver/level                        earnings
POST   /api/driver/level/message                earnings
GET    /api/driver/referral                     earnings
GET    /api/driver/referral-earnings            earnings
GET    /api/driver/referral-earnings/withdrawals earnings
POST   /api/driver/referral-earnings/apply-withdrawal earnings
GET    /api/driver/referral/performance         earnings
GET    /api/driver/invoices                     invoices
GET    /api/driver/invoices/:id                 invoices
PUT    /api/driver/profile                      profile
GET    /api/driver/license                      management
GET    /api/driver/license/meta                 management
GET    /api/driver/contract                     management
GET    /api/driver/security/2fa                 security
POST   /api/driver/security/2fa                 security
GET    /api/driver/security/2fa/provision       security
POST   /api/driver/security/password            security
GET    /api/driver/security/logins              security

Deferred to Phase 5:
GET    /api/driver/map                          live map
GET    /api/driver/safety                       live map
GET/POST /api/driver/security/passkeys (+ sub routes) needs native review
```

Nothing in the table above requires API changes to start Phase 1. If a gap is found
during implementation (for example a mobile friendly trips endpoint that needs a
field web does not use), follow the API Contract Policy in `NATIVE_APP_SETUP.md`:
extend the response, do not fork a parallel endpoint, and keep it backward compatible
with web.

## Open items to confirm before scaffolding `apps/driver`

1. Confirm `com.nolsaf.driver` identifiers for iOS and Android.
2. Confirm the staging API base URL for the driver app (likely the same as
   `apps/mobile`).
3. Confirm the shared component package name and location (for example
   `packages/native-ui`) and the migration order, so `apps/mobile` is not broken while
   components move.
4. Confirm the bottom tab structure (Home, Trips, Earnings, Account) with the team
   before building the navigation shell.
5. Confirm the branch name for this work, for example `native/driver-foundation`,
   following the Branching Policy in `NATIVE_APP_SETUP.md`.
