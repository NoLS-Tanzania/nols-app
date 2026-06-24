# NoLSAF Native App Setup Plan

This document prepares the path for NoLSAF native apps on iOS and Android.

Current repo status:

- There was no existing Markdown plan for native mobile, iOS, Android, Expo, React Native, Capacitor, App Store, Play Store, or EAS.
- The current monorepo is focused on `apps/api`, `apps/web`, `apps/public`, and shared packages.
- Native work should be added carefully so the mobile app reuses NoLSAF's existing API, roles, verification, payment, booking, transport, and account-security systems.

## Recommended Native Direction

Use **Expo React Native** for the first native app.

Why:

- One codebase can ship to iOS and Android.
- It supports over-the-air updates for JavaScript-level fixes.
- EAS Build can produce store-ready iOS and Android builds without requiring every developer machine to be fully configured for native compilation.
- React/TypeScript knowledge from `apps/web` transfers naturally.
- It keeps the first mobile version faster to validate before deciding whether any features need fully custom native modules.

## App Strategy

Start with a strong customer/user app first. The first native release must prove that NoLSAF can deliver a polished traveler experience before expanding into operational roles.

Approved rollout order:

1. **Customer/user app first**
   - Traveler onboarding
   - Account and security flows
   - Verified stays
   - Bookings and trip records
   - Group stays and request-based owner offers
   - Tour package discovery
   - Transport request/status views from the customer side
   - Payment status and booking confirmation flows
2. **Driver app second**
   - Start only after the customer app foundation is stable and reviewed.
   - Driver work should focus on assigned trips, scheduled trips, dispatch status, payout visibility, ratings, and safe operational flows.
3. **Owner or operator app third**
   - Choose one only after customer and driver experiences are satisfactory.
   - Owner/operator mobile scope must be reviewed separately because those roles have heavier business, inventory, and financial workflows.
4. **Admin stays web-only**
   - Admin must not be shipped as an Android or iOS app.
   - Admin workflows remain on the secured web/admin portal only.

The native app should not be treated as a smaller copy of the web app. It must be a focused, fast, reliable mobile product that does the most important mobile tasks better than the web experience.

## NoLSAF Theme, Colors, and Fonts

The native app should use the same NoLSAF identity already defined in the web Tailwind theme. The main brand color is the deep NoLSAF teal-green used for headers, primary buttons, active states, and trusted payment/verification surfaces.

### Color Tokens

Primary brand:

```text
brand.50   #e9f5f4
brand.100  #c8e7e4
brand.200  #a4d7d0
brand.300  #76c2b7
brand.400  #45aa99
brand.500  #028a7a
brand.600  #02665e
brand.700  #014e47
brand.800  #013a35
brand.900  #012a26
```

Core app colors:

```text
primary        #02665e
primaryDark    #014e47
primaryDeep    #012a26
surface        #fafcfc
card           #ffffff
ink            #020617
mutedText      #475569
softText       #64748b
border         #e2e8f0
info           #022099
success        #16a34a
danger         #dc2626
warning        #b45309
```

Usage rules:

- Use `primary` for the main app identity, selected tabs, main actions, trust badges, and verification states.
- Use `primaryDark` and `primaryDeep` for premium headers, splash areas, and strong contrast panels.
- Use white and `surface` for most mobile screens so the app stays clean and readable.
- Use `success` only for completed/approved/paid states.
- Use `warning` for commission, pending review, or attention states.
- Use `danger` only for errors, failed payments, security warnings, and destructive actions.
- Avoid making the app one-color. Pair NoLSAF teal with white, black/ink, slate text, and small controlled accents.

### Font Direction

The current web app uses a system sans-serif stack:

```text
ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans
```

For native, use **Inter** as the main product font because it is clean, modern, readable on small screens, and close to the professional look we have been shaping on web. Keep one font family across the app for consistency.

Recommended weights:

```text
Inter Regular   400  body text
Inter Medium    500  labels, tabs, form text
Inter SemiBold  600  cards, section titles, buttons
Inter Bold      700  screen titles and important values
Inter ExtraBold 800  hero/title moments only
```

Use system monospace only for verification codes, invoice numbers, trip codes, payment references, and QR/barcode labels.

### Native Design Foundations To Define Before Scaffolding

These decisions should be locked before building `apps/mobile` so the app starts with a consistent foundation.

#### Shape and Radius

Use slightly rounded, professional corners:

```text
radius.xs   6
radius.sm   8
radius.md   12
radius.lg   16
radius.xl   20
radius.full 999
```

Rules:

- Use `8-12` for inputs, buttons, small cards, and list rows.
- Use `16-20` for major mobile cards and bottom sheets.
- Avoid overly playful pill shapes except for badges, chips, and status indicators.

#### Spacing

Use an 8-point spacing system:

```text
space.1  4
space.2  8
space.3  12
space.4  16
space.5  20
space.6  24
space.8  32
space.10 40
space.12 48
```

Rules:

- Screen horizontal padding should usually be `16-20`.
- Cards should usually use `16-20` inner padding.
- Dense operational screens can use smaller spacing, but customer booking screens should breathe.

#### Typography Scale

Recommended mobile type scale:

```text
caption    12
label      13
bodySmall  14
body       16
titleSm    18
title      22
headline   28
display    34
```

Rules:

- Keep body text at `16` where possible for readability.
- Use large type only for real screen titles and key payment/booking amounts.
- Avoid excessive bold text. Use weight to guide attention, not to make every element shout.

#### Icons

Use a single icon family across native. Prefer **lucide-react-native** because the web app already uses Lucide icons heavily.

Rules:

- Icon size `20-24` for normal actions.
- Icon size `16-18` for compact metadata rows.
- Icons should support the content, not replace required labels in critical flows.

#### Elevation and Borders

The app should feel clean, not heavy.

```text
border.light  #e2e8f0
shadow.card   subtle, low elevation
shadow.sheet  medium elevation for modals/bottom sheets
```

Rules:

- Use borders more than strong shadows.
- Use shadow only to separate floating sheets, modal cards, and important action areas.
- Keep payment and verification cards clean, structured, and easy to scan.

#### Motion

Use subtle motion only:

- Screen transitions
- Bottom sheet entry
- Button press feedback
- Skeleton/loading shimmer
- Small fade/slide on important content entry

Rules:

- Respect reduced-motion settings.
- Avoid decorative motion in booking, payment, security, or verification flows.
- Motion must make the app feel responsive, not noisy.

#### Status Language

Use one consistent status vocabulary across web and native:

```text
requested
verified
approved
disbursed
pending
paid
failed
cancelled
completed
```

Rules:

- Do not invent new labels for the same backend state.
- Use timestamps under status labels when the action has happened.
- Disable future actions until the previous required step is complete.

#### Components To Standardize First

Build these before feature screens become complex:

- `AppScreen`
- `AppHeader`
- `AppText`
- `AppButton`
- `AppInput`
- `AppCard`
- `StatusBadge`
- `AmountCard`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `ConfirmSheet`
- `PaymentMethodCard`
- `BookingSummaryCard`

#### Reference Product Benchmarks

NoLSAF should not copy one app. It should combine proven patterns from several strong products because NoLSAF is travel, transport, payments, verification, and account security in one platform.

Primary role models:

- **Airbnb** for stay discovery, property cards, booking flow clarity, mobile spacing, and trust-focused details.
- **Uber/Bolt** for trip status, pickup/dropoff presentation, route summaries, driver/passenger trip context, and bottom action patterns.
- **Wise** for payment clarity, transaction confidence, fees/amounts, status timelines, and clean financial language.
- **Apple Wallet / Google Wallet** for booking codes, QR/receipt presentation, compact confirmation screens, and proof-of-payment design.
- **Booking.com** only for reservation confidence and cancellation/payment clarity, not for its dense or noisy listing style.

NoLSAF direction:

- Use Airbnb-level calmness for discovery and booking.
- Use Uber/Bolt-level clarity for transport and trip movement.
- Use Wise-level trust for payments and payout/payment status.
- Use Wallet-style proof screens for QR, receipt, trip code, and booking confirmation.

Avoid:

- Social-media style feeds.
- Overcrowded marketplace layouts.
- Heavy marketing pages inside the app.
- Admin-dashboard density.
- Decorative motion that distracts from booking, payment, or security flows.

#### Mobile-Specific Behavior

- Use bottom sheets for confirmations and short actions.
- Use full screens for booking, payment, security, and profile editing.
- Use haptic feedback for successful booking/payment/security actions where appropriate.
- Use pull-to-refresh only on list screens.
- Keep primary actions fixed near the bottom when the screen is long.

#### Overflow Prevention Policy

NoLSAF native must be built with an overflow-first mindset. Every screen should assume small phones, long names, long emails, long trip codes, large payment amounts, translated labels, and accessibility font scaling.

Core rules:

- Never depend on fixed-width text containers for dynamic data.
- Every row with text must define how text wraps, truncates, or moves to the next line.
- Primary buttons must never clip their labels.
- Amounts, trip codes, invoice numbers, payment references, and addresses must have explicit responsive behavior.
- Horizontal scrolling is allowed only for intentional data tables, never for normal page layout.
- Cards must use `minWidth: 0`, flexible columns, and safe wrapping rules.
- Use vertical stacking on small screens instead of squeezing content into columns.
- Every modal, bottom sheet, and card must fit within safe-area boundaries.
- Keyboard screens must use keyboard-aware layout so inputs and buttons remain visible.
- Lists must use virtualized lists when data can grow.

Required text behavior:

```text
Names              wrap up to 2 lines, then truncate
Emails             truncate middle or end
Phone numbers      stay one line
Trip codes         split into 2 controlled lines or copyable detail view
Payment references wrap in blocks or use monospace compact text
Addresses          wrap naturally, max 3 lines in cards
Amounts            stay one line, reduce surrounding layout before reducing readability
Buttons            one line where possible, otherwise taller button
```

Required layout behavior:

- Use `SafeAreaView` for every screen.
- Use `KeyboardAvoidingView` or equivalent for forms.
- Use `ScrollView` only for screen content, not inside every card.
- Use `FlatList` for long lists.
- Use `flexShrink: 1` on text inside horizontal rows.
- Use `minWidth: 0` on flexible children.
- Avoid absolute positioning for content that can grow.
- Avoid viewport-based font scaling.
- Test every core screen on small Android size, normal iPhone size, and large device size.

Reusable protection components:

- `SafeScreen`
- `ResponsiveRow`
- `StackOnSmall`
- `SafeText`
- `CodeText`
- `AmountText`
- `KeyboardSafeForm`
- `BottomActionBar`

Before any native screen is considered done, it must pass an overflow checklist:

- Long customer name
- Long property name
- Long driver name
- Long trip code
- Long payment reference
- Large amount such as `125,000,000 TZS`
- Accessibility font size increased
- Keyboard open on form screens
- Small Android viewport
- Offline/error/empty states visible without clipping

## Native Governance Policies

These policies apply before and during native development.

### Linked Plan Files Policy

Some native features are large enough to deserve their own plan file. Those files are
managed and controlled by this document. They inherit every policy here and must not
override any of them. If a linked plan conflicts with this file, this file wins and the
linked plan must be updated to match.

Current linked plan files:

* `NATIVE_TOUR_OPERATORS.md`, the customer Tour Operators experience, from discovery
  through operator profile, package detail, booking, confirm, payment, and post booking
  management.
* `NATIVE_DRIVER_APP.md`, the Driver native app (Phase 4 of this file), covering the
  auth and KYC gate, dashboard, trips and active trip flow, scheduled trips, earnings,
  profile, management, security, and policies, with live map and dispatch deferred to
  its own later phase.
* `NATIVE_PARTNERS_APP.md`, the NoLSAF Partners native app (Phase 5 of this file), the
  one app for Owner and Operator (agent), covering the single login and role gate (one
  role per account for v1), the role specific navigation shell, the Owner dashboard
  (properties, availability, bookings, group stays, revenue, invoices, reports) and the
  Operator dashboard (tour bookings, assignments, operator profile, revenues, contract),
  with shared account, security, and policy screens.

### Admin Exclusion Policy

- No admin dashboard in iOS or Android.
- No admin-only APIs should be exposed through native navigation.
- No admin actions such as user suspension, payout approval, platform settings, impact center, vetting, or system management should be added to mobile.
- If a future business case asks for admin mobile access, it requires a separate security review and written approval before any implementation.

### Customer-First Policy

- The first native app must prioritize customers/travelers.
- Driver, owner, and operator features must not distract the first native foundation.
- Customer flows should be complete enough to feel like a real store-ready app, not a demo wrapper around web pages.

### Native Quality Policy

- Mobile screens must be designed for touch first.
- Avoid directly copying dense web pages.
- Every critical flow must have loading, empty, error, offline, and success states.
- Components should use stable dimensions so content does not overflow on small devices.
- App performance must be treated as a product feature.
- Animations should be subtle and should respect reduced-motion settings.

### Security Policy

- Sensitive auth/session material must use secure native storage.
- Do not store tokens, OTPs, payment references, or personal data in plain AsyncStorage.
- Native must call the API through explicit mobile-safe endpoints.
- 2FA and account-security flows must be tested on physical devices before store submission.
- Deep links must be validated so payment and booking callbacks cannot be spoofed.

### API Contract Policy

- The mobile app should not depend on scraping web pages or Next.js routes.
- API responses used by mobile should be documented and stable.
- Any endpoint needed by mobile should return predictable JSON with clear errors.
- Web and native can share TypeScript types from `packages/shared` where practical.
- Any mobile-only endpoint changes must remain backward compatible with web clients.

### Store Readiness Policy

- No app store submission until privacy, permissions, crash handling, and support links are complete.
- Screenshots must show real NoLSAF product flows, not placeholder UI.
- Permission prompts must explain why the app needs location, camera, notifications, or photos.
- App Store and Play Store descriptions must match the real app behavior.

### Branching Policy

- Continue normal web/API work on `staging`.
- Start actual native scaffolding on a dedicated branch, for example `native/expo-foundation`.
- Do not mix major native dependency installation with unrelated web fixes.
- Native work should merge into `staging` only after the app scaffold builds and the web/API checks still pass.

## Proposed Workspace Shape

When we scaffold, use:

```text
apps/mobile/
  app/ or src/
  assets/
  package.json
  app.json
  eas.json
  tsconfig.json
```

Then update workspace config:

```json
"workspaces": [
  "apps/api",
  "apps/web",
  "apps/mobile",
  "packages/*"
]
```

And `pnpm-workspace.yaml` if pnpm remains in use:

```yaml
packages:
  - "apps/api"
  - "apps/web"
  - "apps/mobile"
  - "packages/*"
```

## Required Local Tools

Minimum:

- Node.js matching the repo baseline
- npm workspace support
- Expo CLI via `npx`
- EAS CLI for cloud builds
- Android Studio for Android emulator and SDK tooling

For iOS:

- macOS is required for local iOS simulator builds
- Apple Developer account is required for TestFlight and App Store listing
- EAS Build can create iOS builds from cloud even if daily development happens on Windows

For Android:

- Google Play Console account
- Android package name reserved before release
- Keystore handled by EAS or stored securely if self-managed

## Environment Variables

Native should not assume browser-only cookies or Next.js rewrites.

Local mobile testing is wired first to the local API:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_SOCKET_URL=http://localhost:4000
```

This is stored locally in `apps/mobile/.env.local`, which is ignored by git.

Use `localhost` for Expo web and iOS simulator. Use `http://10.0.2.2:4000` for Android emulator. Use the computer LAN IP, such as `http://192.168.1.20:4000`, for a physical phone on the same Wi-Fi.

Expected mobile environment:

```env
EXPO_PUBLIC_API_URL=https://api.nolsaf.com
EXPO_PUBLIC_SOCKET_URL=https://api.nolsaf.com
EXPO_PUBLIC_MAPBOX_TOKEN=<public-mapbox-token>
```

Staging should use separate values:

```env
EXPO_PUBLIC_API_URL=https://<staging-api-domain>
EXPO_PUBLIC_SOCKET_URL=https://<staging-api-domain>
EXPO_PUBLIC_MAPBOX_TOKEN=<staging-or-shared-public-mapbox-token>
```

## Authentication Notes

The web app uses browser sessions and httpOnly cookie behavior. Native apps need explicit handling:

- Login should call the existing API.
- Tokens/session identifiers should be stored in native secure storage.
- Do not store secrets in normal AsyncStorage.
- The API may need mobile-friendly auth responses if current endpoints only assume browser cookies.
- 2FA, passkeys, and login-history flows should be reviewed for mobile compatibility.

Recommended storage:

- Expo SecureStore for sensitive auth/session material
- Normal AsyncStorage only for non-sensitive preferences

## API Readiness Checklist

Before the mobile app becomes store-ready, confirm these API flows work from a non-browser client:

- Login
- Logout
- Current account/profile
- 2FA status and verification
- Booking list and booking details
- Property search/listing details
- Tour packages
- Group stay requests
- Transport booking and trip status
- Payment initiation and payment status
- Push notification registration
- Socket.IO or polling fallback for realtime status

## Mobile Feature Phases

### Phase 0: Readiness and Decisions

- Confirm first app scope: customer/user first.
- Confirm app name, bundle id, and Android package name.
- Confirm staging API URL for mobile.
- Decide auth response format for native clients.
- Decide secure storage strategy.
- Decide whether the first version uses push notifications immediately or after core booking flows.
- Confirm payment callback/deep-link behavior.

Exit criteria:

- Product scope is written and approved.
- API/mobile auth approach is clear.
- No admin scope is included.

### Phase 1: Customer App Foundation

- Scaffold `apps/mobile`
- App theme and NoLSAF design tokens
- API client
- Secure auth storage
- Login/logout
- Account profile
- Basic navigation shell
- Environment switching for staging/production
- Error, empty, loading, and offline-state patterns

Exit criteria:

- App launches on Android and iOS build targets.
- Customer can authenticate against staging.
- App has a stable shell and navigation model.
- No admin routes or admin-only API flows exist in the app.

### Phase 2: Traveler Core

- Home/search entry
- Verified properties
- Property details
- Bookings
- Group stay request flow
- Tour package discovery
- Payment status views
- Booking confirmation and booking code experience
- Account/security settings that make sense on mobile

Exit criteria:

- A customer can search, review details, begin booking, and track status.
- Group stay request flow is understandable and mobile-safe.
- Payment status can be checked from the app.

### Phase 3: Customer Transport and Trip Support

- Transport requests
- Customer trip tracking view
- Booking code and trip confirmation
- Ratings and trip history
- Notifications or polling for trip status

Exit criteria:

- Customer can see pickup/dropoff context and trip status.
- Customer can rate completed trips.
- Transport flows do not require admin or driver mobile access.

### Phase 4: Driver App Foundation

Start this phase only after customer/user app review is satisfactory.

- Driver authentication and profile
- Assigned trips
- Scheduled trips
- Dispatch status
- Trip start/complete flow
- Driver earnings and payout visibility
- Driver ratings
- Driver safety and account-security flows

Exit criteria:

- Driver app works independently from customer app assumptions.
- Driver flows are tested with real dispatch and payout smoke data.
- Customer app remains stable.

### Phase 5: NoLSAF Partners (Owner and Operator)

Owner and Operator share one native app, "NoLSAF Partners", separated by role inside
the app rather than as two separate apps. This is a deliberate departure from how web
is structured today, made for native:

- On web, Owner is its own full portal with a separate login (`(auth)/owner/login`)
  and its own route group and layout (`(owner)/owner/**`), covering properties,
  bookings, revenue, reports, group stays, invoices, messages, notifications,
  security settings, and policies.
- On web, Operator (agent) is not a separate portal. An operator logs in as a normal
  account holder and the operator tools live inside the regular account area
  (`account/agent/**`): assignments, bookings, contract, documents, profile, reports,
  revenues, security, and tour bookings.
- For native, both become dashboards inside one "NoLSAF Partners" app
  (`com.nolsaf.partners`), gated by the account's role(s) after login, the same way
  `apps/driver` gates on `kycStatus` and `suspendedAt`. An account that holds both the
  Owner and the Operator role sees both dashboards in one app, with no double login
  and no double install. An account with only one role sees only that dashboard.
- The shared package built for `apps/mobile` and `apps/driver` (theme tokens, UI
  primitives, account, security, document upload, policy pages) extends to
  `apps/partners` as well, following the same "extract once, consume everywhere" rule
  as `NATIVE_DRIVER_APP.md`.

Owner dashboard candidates:

- Properties (approved, pending, availability)
- Booking visibility
- Group stay offer responses
- Property performance summaries and reports
- Revenue, invoices, and owner payout status
- Messages and notifications
- Security settings (2FA, password, login history)

Operator dashboard candidates:

- Tour package operations
- Tour booking visibility
- Assigned guide/operator workflows
- Operator profile, contract, documents, and revenues
- Security settings (2FA, password, login history)

Exit criteria:

- Role gated dashboard switching works for accounts with one role, and for accounts
  with both roles.
- Scope per dashboard is small enough for a high quality native release.
- A linked plan file, for example `NATIVE_PARTNERS_APP.md`, is written before
  scaffolding `apps/partners`, following the same screen by screen format as
  `NATIVE_DRIVER_APP.md`.
- Financial/admin-sensitive actions remain properly protected.

### Phase 6: Store Readiness

- App icons and splash screen
- iOS bundle identifier
- Android package name
- Privacy policy links
- Data safety declarations
- Push notification permissions
- Location permission text
- Screenshots for App Store and Play Store
- TestFlight and internal Play testing
- Crash reporting
- Support/contact routes
- Privacy and data-safety review

Exit criteria:

- Internal testing approved.
- Store metadata approved.
- Production API endpoints confirmed.
- Release checklist completed.

## Store Identity

Proposed identifiers:

```text
iOS bundle identifier: com.nolsaf.app
Android package name: com.nolsaf.app
App name: NoLSAF
```

These should be confirmed before first store submission because changing them later is painful.

## Permissions To Plan Carefully

Only request permissions when needed:

- Location: transport, pickup/dropoff, trip tracking
- Camera: document uploads, QR/booking code scanning if used
- Notifications: booking updates, trip updates, payment updates
- Photos: profile/listing upload only where needed

Each permission needs clear wording for App Store review.

## First Scaffold Command

Run this only when we are ready to add dependencies:

```powershell
npx create-expo-app@latest apps/mobile
```

Then configure it for the monorepo and NoLSAF API.

Do not install mobile dependencies into the repo until we are ready to validate the scaffold, because this will change lockfiles and package resolution.

## Immediate Next Step

The first native app is confirmed as **customer/user first**.

Next actions before scaffolding:

1. Review customer/user mobile scope.
2. Confirm `com.nolsaf.app` identifiers.
3. Confirm staging API base URL.
4. Review mobile login/session behavior.
5. Create branch `native/expo-foundation` when ready to install Expo and scaffold `apps/mobile`.

## Writing And Copy Convention

To keep product copy and documentation consistent:

* Do not use dashes in user facing copy or in these docs. This covers the em dash, the en dash, and the hyphen used as a pause in a sentence.
* Use commas, parentheses, or separate sentences instead.
* Write compound ideas as words where natural, for example "door to door" and "auto dispatch", not the hyphenated forms.
* This rule applies to mobile screen text, component copy, and the markdown in this file.

## Implementation Progress Log

This section records what is actually built in `apps/mobile`, so the plan stays a living reference.

### Customer App Foundation (built)

* Expo scaffold, NoLSAF theme tokens, Inter font, and the reusable component set.
* Secure auth with Expo SecureStore, login, register, logout, and account profile.
* Navigation shell with a guest stack and an authenticated customer stack.
* Property discovery wired to live APIs: Verified Stays and Search read public property data.
* Tourism by country quick links on the Onboarding screen.

### Transport "One Trip, One Tap" (built)

NoLSAF transport exists only to bring a customer to a stay they have booked. NoLSAF does not sell standalone point to point rides. The destination is always the booked property. A customer cannot request transport without a paid booking.

Two pickup modes, presented as two cards under the heading "One Trip, One Tap, Get there":

* Mode A, "Schedule a transfer": pick an arrival point (airport, bus terminal, or ferry port), add the flight or bus number and arrival time, and we collect you and bring you to your booked stay.
* Mode B, "Pick me up now": instant pickup from your location to your booked stay.

Where the cards appear:

* On the Onboarding screen, directly below the "Explore tourism by country" rail, as a guest teaser. With no booking yet, tapping routes the guest to Verified Stays to book a stay first.
* On the My Bookings screen, on each paid booking, as the live action that opens the full transport flow.

How the flow works:

* The destination is locked to the booked property and its coordinates, read from the booking detail.
* The fare preview uses the same calculator and vehicle rates as the web (`apps/web/lib/transportFareCalculator.ts`).
* Submission posts to the existing transport endpoint. The server computes the authoritative fare. The client never sets the price.
* My Rides lists the customer's transport bookings with route, status, and fare.

API endpoints used:

* `POST /api/transport-bookings` to create a transport booking (server computes the fare).
* `GET /api/customer/rides` to list rides.
* `GET /api/customer/bookings` and `GET /api/customer/bookings/:id` for the booking gate and the destination coordinates.

Files added or changed:

* `src/transport/` with `fare.ts`, `tanzaniaLocations.ts`, `types.ts`, `transportApi.ts`, `index.ts`.
* `src/bookings/` with `types.ts`, `bookingsApi.ts`, `index.ts`.
* `src/components/GetThereSection.tsx` and `src/screens/AddTransportScreen.tsx`.
* `MyBookingsScreen.tsx` and `MyRidesScreen.tsx` rewired to live data.
* `AddTransport` route added to navigation.

Known limitations to revisit:

* Instant pickup currently uses the nearest preset pickup point. True device location needs the `expo-location` native dependency, left as a follow up. The code has a clean seam for it.
* Transport is blocked when a property has no registered map coordinates, because the transport endpoint requires them. This is a property data gap, not a mobile issue.

### Verified Stays browse (built)

The landing page for all approved listings, designed to stay calm and fast at large inventory sizes.

* One header card with the back control, the title, and an animated counter that ticks up to the total and replays on each load.
* Filtering uses progressive disclosure to stay calm. Three layers: inline decisive filters (search, region chips, the Available on day chips) that auto run, then one Filters button with a count badge opening a bottom sheet for the heavier options (property type, price range, guests, sort) applied in one go, then a row of removable active filter chips with Clear all as the visible memory. The filter state is one object, the single source of truth from which the API params and the active chips are derived.
* Motion is used sparingly for professionalism. A single Featured strip at the top auto rotates and slides photos for attention, and only on the unfiltered All view. The strip pauses on hover or press and resumes when idle.
* The full inventory is laid out as compact rows of up to five tiles with two visible by default. Each row slides by hand only, with no auto rotation and no auto photo slide, which keeps it calm and saves vertical space. The rows are virtualized with `FlatList` so thousands scroll smoothly. Tiles keep the verified icon badge, the chevron and dot hints, and a spring press response.
* The system reduce motion setting disables the auto rotation and auto photo sliding everywhere.
* Property tiles mirror the web approved property card: title on top, square image, verified icon badge, location, and price per night.
* Live availability. An "Available on" day selector (Any day plus the next seven days) drives a rooms left chip on each tile: green "3 rooms left", amber "Last room", or grey "Sold out". A new endpoint `GET /api/public/properties/availability?ids=...&date=...` computes this with the existing `calculateAvailability` engine, and the screen merges the result onto the cards. This is the revolutionary signal: it answers whether a stay is bookable for the chosen day right on the card.

Follow up: the browse list endpoint returns one image per card for speed, so the in card photo slide activates once the list returns an images array (or we lazy load galleries). Device location can power a real Near me filter using the endpoint's nearLat, nearLng, and radiusKm.

### Property details (built, only the booking action pending)

Tapping any property tile opens the detail screen (`PropertyDetailScreen`, route `PropertyDetail`). Data comes from `GET /api/public/properties/:idOrSlug`, which returns the detail wrapped as `{ property }`, so `fetchPropertyDetail` unwraps `response.property`. Types are `PublicPropertyDetail` and `RoomSpec`. Two helpers port web logic: `properties/propertyServices.ts` (`parsePropertyServices` for the heterogeneous services value, which is either an array of tagged strings like "payment: X" and "near X" or an object with `nearbyFacilities` and `houseRules`) and `properties/roomSpec.ts` (`normalizeRoom`, `bedsToSummary`, `getBedDimensions`).

Section order, matching the web flow:

* Hero photo card. A framed rounded image card (not full bleed) with the title and location overlaid over a gradient scrim, a back control, a photo counter, dots, and auto sliding photos that pause on touch and respect reduce motion.
* Type and verified row.
* About this stay, with read more.
* Payment methods. One row per method with real brand logos: M-Pesa, Mixx, Airtel, HaloPesa for mobile money; Visa plus a drawn Mastercard mark for card; a bank icon for bank transfer. Cash is excluded. Logos live in `apps/mobile/assets/payments`.
* Starting from. Price, a Request booking action, and the approved listings note.
* Availability live updates. A custom check in and check out calendar range picker (`CalendarRangeSheet`, no native date dependency, works on web and device) that calls the availability endpoint and shows rooms available for the chosen nights.
* Property structure. A Building Layout card: a stat tile grid (building type, floors, bedrooms, bathrooms, guests) with icons and an Owner declared badge. This is now a structure overview only. The earlier tappable floor accordion was removed because it repeated the same room types the Rooms section already lists. The floor each room sits on now travels with the room itself (see Rooms below), so the structure card just notes "Each room below shows the floor it sits on". The floor count is derived from each room type's `floorDistribution` via `normalizeRoom`.
* Rooms. Rich cards per room: index, name, a floor chip (for example "Ground floor" or "Floors G, 1, 2", derived from `floorDistribution` and exposed as `floors` on `NormalizedRoom`), rooms count, bed summary and dimensions, description, amenities, a bathroom block with a Private or Shared badge, smoking, price with discount or No discount, and a Pay now action. Each card shows per room live availability (for example "3 available for your dates" or "Sold out") using the availability endpoint with a `roomType` filter, inside a grouped booking strip. Each room type is now listed once, with its floor, availability, price, and Pay now all in one place.
* What this place offers. Amenities as icon chips in a horizontal slider, three rows by default, via reusable `AmenityChip` and `AmenityGrid`.
* House rules. Check in and check out as time tiles (windows cleaned to "to", no dashes), Pets and Smoking as Allowed or Not allowed badges, other rules, and safety measures (two row grid).
* Guest reviews. Functional read and write. Reads `GET /api/property-reviews/:id` and shows the overall score box, an overall bar, the four category bars (Customer care, Security, Reality, Comfort), and the reviews as a one at a time horizontal slider with dots. A Write a review action opens `ReviewSheet` (overall stars, title, comment, and per category star pickers with the connected bar and number). Submitting posts to `POST /api/property-reviews` with the token then refetches. Authentication is checked only at submit; guests are routed to Login.
* Location. A lightweight static map: the Mapbox Static Images API renders one image with a teal pin (no live GL, so no battery drain or heat), the address below, and tapping opens the native maps app. Needs `EXPO_PUBLIC_MAPBOX_TOKEN` (read via `lib/env.ts`). Falls back to a tappable placeholder when coordinates exist but the token is missing, or to address only when there are no coordinates.
* Nearby services. Facility cards from the structured `nearbyFacilities` objects: a color coded icon by type (hospital, fuel, airport, bus, road, police, centre), the name, type and ownership tags, and distance, plus any "near ..." strings as a small icon grid.
* Sticky bottom bar with the price and a Request booking action.

API and data changes made for this screen:

* `GET /api/public/properties/availability` accepts `ids` plus either `date` (single night) or `checkIn` and `checkOut` (a range), and an optional `roomType` to narrow to one room type. Uses the existing `calculateAvailability` engine.
* `property-reviews` create schema and aggregation were aligned to the four categories the UI uses: `customerCare, security, reality, comfort`. They previously used different keys, so category ratings never persisted; now they save and round trip.

New mobile components from this session: `PropertyRail`, `PropertyFiltersSheet`, `PriceRangeSlider`, `AnimatedCounter`, `AmenityChip` with `AmenityGrid`, `CalendarRangeSheet`, `ReviewSheet`, `LocationMapCard`, `GetThereSection`. New modules: `properties/propertyServices.ts`, `properties/roomSpec.ts`, `bookings/`, `lib/useReducedMotion.ts`. A `*.png` type declaration lives in `src/assets.d.ts`.

Still to build on this screen: a fullscreen gallery, save and share, and a shrinking header on scroll. Request booking and Pay now are now wired into the booking flow (see below).

### Booking and payment flow (built: stay plus mobile money)

The mobile booking flow mirrors the web (`apps/web/app/public/booking/confirm` then `payment`) against the same endpoints, which already accept the app's Bearer token plus the signed invoice access token, so no backend changes were needed for mobile money or bank.

The spine, built this session:

* `BookingReviewScreen` (route `BookingReview`). Opened from the detail screen's Request booking (sticky bar and Starting from) and each room's Pay now. Guests are routed to Login first. It loads the property and the system commission, then collects dates (reusing `CalendarRangeSheet`), room selection, guests and rooms (steppers), and guest details (name, phone with Tanzania normalization, email, nationality, sex). When the user is signed in the details autofill from the account (blanks only, so it never clobbers typing). It shows live availability for the chosen dates and an estimated total using the ported commission helper, then creates the booking and invoice and moves to payment.
* Transport add on, bundled into the review screen (placed after the guest details, just before the price) via the `TransportBundle` component. When opened it shows a connected, tinted panel grouping a toggle, two modes that echo One Trip One Tap (Pick me up now and Schedule a transfer) with a one line explainer, the pickup chooser, a vehicle picker, arrival flight/bus details for the scheduled mode, and the fare. The pickup chooser handles the many Tanzania locations cleanly, mirroring the web `LocationPickerModal`: a trigger row opens `PickupPickerSheet`, a bottom sheet with search (city, terminal, IATA) and results grouped into Airports, Bus terminals and Ferry ports as horizontal two row rails. Above the chooser, Closest to this stay quick chips rank the pickup points by real straight line distance to the booked property (haversine via `nearestPickupPoints`) and show the distance, so the suggestion reflects true proximity rather than a city name match. The pickup dataset is now at parity with web (17 airports, 19 bus terminals, 11 ferry ports). The ride fare shows a short shimmer skeleton while it computes, then the real fare, in a card that stands out inside the panel. It uses the shared `calculateFarePreview` to the booked property's coordinates and adds the fare to the total. On submit the transport fields merge into the same create-booking request, so the server prices the ride authoritatively and one invoice covers the stay plus the ride. Device GPS is still a follow up, so instant pickup uses a preset, matching the standalone transport flow.
* `BookingPaymentScreen` (route `BookingPayment`). Loads the invoice (price breakdown, draft availability, status), shows the four mobile money providers with real logos and a phone field, initiates an AzamPay USSD push, then polls the invoice (3s then 10s, four minute countdown) through pending, success, timeout, and failed states. Success shows the booking code and links to My Bookings.

API sequence used: `POST /api/public/bookings` (optional auth, server computes the authoritative total), `POST /api/public/invoices/from-booking` (gated by the proof-of-creation token), `GET /api/public/invoices/:id?accessToken=...` (read and status poll), `POST /api/payments/azampay/initiate` (mobile money).

New modules and files: `bookings/checkoutApi.ts`, `bookings/priceUtils.ts`, new checkout types in `bookings/types.ts`, `lib/phone.ts`, `screens/BookingReviewScreen.tsx`, `screens/BookingPaymentScreen.tsx`. The public property endpoints return the owner net price; commission is added at booking time, so the review screen previews the gross price while the invoice stays authoritative.

Instant pickup now uses real device location. `expo-location` is installed (permission strings in app.json), and `lib/location.ts` requests permission, reads the position, and reverse geocodes it to a readable address. In the bundle the two modes are now clearly different: Pick me up now leads with a Use my current location action (with an or choose a point fallback to the preset chooser), while Schedule a transfer shows the arrival point chooser plus the required arrival fields. Switching modes fades the content for a clear transition, and the mode buttons carry icons. The required arrival fields (date, time, pickup area) are marked with a red asterisk, validate on blur, show a green check when valid, and block Continue until complete.

Pickup points are now admin managed, not hardcoded. A verification pass against OpenStreetMap found the airports were accurate but many bus terminals and ferry ports were city centroid placeholders (some duplicated between a city's bus and ferry entry, some 2 km off, and some wrong names, for example Ubungo where the main terminal is now Magufuli, and Morogoro where it is Msamvu). Because these coordinates drive driver pickup, they were moved into a database table:

* `prisma/schema.prisma` model `TransportPickupPoint` (code, name, shortLabel, city, category, arrivalType, latitude, longitude, iataCode, verified, isActive, sortOrder), with migration `20260604120000_add_transport_pickup_points` that creates the table and seeds it. Airports and the OSM confirmed terminals (Magufuli, Ubungo International, Msamvu, Nyegezi, Arusha City, Kivukoni) are seeded `verified = 1`; the rest keep their approximate coordinates as `verified = 0` for an admin to correct.
* API: `GET /api/public/pickup-points` (public read) and admin CRUD at `/api/admin/pickup-points` (`routes/public.pickupPoints.ts`, `routes/admin.pickupPoints.ts`).
* Admin UI: `apps/web/app/(admin)/admin/management/pickup-points/page.tsx` (list, search, category filter, a needs verifying filter, add/edit with a map check link, verify toggle, delete), linked in the admin sidebar.
* Mobile: `transport/usePickupPoints.ts` fetches the live list with the bundled `PICKUP_POINTS` as an instant and offline fallback; `TransportBundle` and `PickupPickerSheet` now read this list, and `rankNearest` ranks any list by distance. Cities with several large terminals (for example Mwanza: Nyegezi and Buzuruga) can now be added by admins without a code change.
* Web: the booking confirm flow listens to the same source. `lib/usePickupPoints.ts` fetches the live list (bundled `TANZANIA_LOCATIONS` fallback) and feeds `LocationPickerModal`, so an admin edit reflects on web and mobile alike. The public endpoint sends `Cache-Control: no-store` so a change is never served stale. A Train station category was added across the stack (DB string value, API validation, admin UI, web and mobile pickers) and admins can lock a point (`isActive = false`) to take it offline instantly; the public endpoint only returns active points.

Operational notes: run the migration (`prisma migrate deploy`) on each environment (it was applied to local MySQL; the hosted Railway production DB needs the same). The feature is pure database rows plus one API route, so it adds no AWS or Railway cost.

Bank transfer is now a second payment channel on `BookingPaymentScreen`. A Pay with selector switches between Mobile money and Bank transfer; the bank form is a bank picker (CRDB, NMB, NBC and ~12 more) plus an optional account number, calling `POST /api/payments/azampay/bank/initiate` and reusing the same pending, poll, success, timeout and failed states as mobile money (bank needs no redirect, so it slots straight into the existing flow). The pending copy adapts per channel.

Card is now the third payment channel. The Pay with selector is three options (Mobile money, Bank, Card). Card calls `POST /api/payments/azampay/card/initiate`, opens the returned hosted `checkoutUrl` with `expo-web-browser` (`openAuthSessionAsync`), and on return resumes the same invoice polling, since the AzamPay webhook is the authoritative paid signal (the server builds the return URL, so no client deep link is required for correctness). Until AzamPay enables card on the merchant the endpoint returns 503 `card_not_available`, which the screen shows as a friendly "card is being set up, use mobile money or bank for now" message, so the UI is ready and lights up the moment AzamPay flips it on. Bank is trimmed to CRDB and NMB everywhere (mobile, web, and the API `SUPPORTED_BANK_CODES` whitelist), since AzamPay Bank Checkout only settles those two.

The three customer payment channels (mobile money, bank, card) are now built on mobile, matching web.

### My Rides (rebuilt)

My Rides was brought up to the web arrangement, adapted to the mobile theme. It has filter tabs (All, Scheduled, Completed, Expired) with counts, pull to refresh, and a virtualized `FlatList`. Each ride is a single card with a status colored left accent bar (scheduled teal, completed green, expired red), a header with a tinted vehicle icon, the date and a status pill, a route track (dot, dashed line, dot) with FROM and TO tinted location cards, a driver card with avatar, phone and rating when assigned, and the fare. Kept loading, error with retry, and empty states (per filter).
* A calendar based arrival date/time picker for the scheduled ride (currently typed fields, now validated and marked required).
* A receipt view, and richer failure and rate limit handling.

### Group Stays request flow (built)

A 4 step wizard, `GroupStayRequestScreen` (route `GroupStayRequest`, opened from a "Request Group Stay" tile in My NoLSAF on the Account screen), ports `apps/web/components/GroupStaysCard.tsx` to mobile and submits live to `POST /api/group-bookings` (the web form is still behind a Coming Soon gate, but the endpoint is fully functional, so mobile is not gated).

* Step 1, Details: group type, the country travelling from (with full Tanzania region, district, ward and street cascading pickers when Tanzania is selected, ported as `groupStays/tzRegions.ts` and `groupStays/tzRegionsFull.ts`), and the same cascade for the destination region, district, ward and street.
* Step 2, Accommodation: accommodation type, a hotel rating picker shown only for hotel, male, female and other headcount steppers, a private rooms toggle with a counter, room size with the same `recommendRoomSize` suggestion as web, an optional check in and check out range via `CalendarRangeSheet`, and the five arrangement toggles (airport pick up, transport between sites, meals, on site guide, special equipment) with pickup location and time fields when pick up is on.
* Step 3, Roster: optional, manual add, edit and remove of passengers (first name, last name, phone, age, gender, nationality), no CSV upload.
* Step 4, Review: a summary of every section, then Submit builds the same `CreateGroupBookingInput` payload as web and calls `createGroupBooking`. On success it shows a thank you state linking to My Group Stay.

New modules: `src/groupStays/` (`types.ts`, `options.ts`, `locations.ts`, `api.ts`, `tzRegions.ts`, `tzRegionsFull.ts`, `index.ts`). New shared component: `src/components/OptionPickerSheet.tsx`, a generic single select bottom sheet (with search above 8 options) used for every enum and cascading picker on this screen.

### Still missing in Traveler Core

* Tour Packages and Tour Operators. The mobile API already computes the commission, but no screen renders it yet. This is the core income stream. The full plan, from discovery through operator profile, package detail, booking, confirm, payment, and post booking management, lives in `NATIVE_TOUR_OPERATORS.md`, which is managed and controlled by this file.
* The N-SaT and No4P AI activities.
