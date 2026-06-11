# NoLSAF Native Tour Operators Plan

This file is the single plan for building the customer Tour Operators experience in
`apps/mobile`. It mirrors the proven NoLSAF web flow, from discovery through booking,
confirm, and payment, and on to managing a booked tour.

## Governance

This document is managed and controlled by `NATIVE_APP_SETUP.md`. It inherits every
rule in that file and does not override any of them. In particular:

* Customer first. Operator and admin dashboards stay web only. No operator app in
  this phase.
* Server authoritative pricing. The client only previews. The server computes the
  final amount and commission, and the invoice stays the source of truth.
* No dashes in user facing copy or in this document. Use commas, parentheses, or
  separate sentences. Write compound ideas as words, for example "drop off",
  "check in", "post booking", "mobile money". API paths and code identifiers keep
  their literal hyphens (for example `tour-bookings`), since they are not prose.
* Every screen ships loading, empty, error, offline, and success states.
* Reuse the NoLSAF theme tokens, the shared component set, and the existing API
  client (Bearer token plus signed access token), exactly as the stay flow does.

If a tour decision conflicts with `NATIVE_APP_SETUP.md`, the setup file wins and this
file must be updated to match.

## Why this file exists

Tour Packages discovery and the operator booking flow are the core income stream that
is still missing in Traveler Core (see `NATIVE_APP_SETUP.md`, section "Still missing
in Traveler Core"). The web already implements the whole journey, so native should
port it rather than invent a new one.

## The web flow we mirror

Read these pages as the blueprint. Each native screen below maps to one of them.

```text
Discovery            apps/web/app/public/tour-packages/page.tsx
Operator profile     apps/web/app/public/tour-packages/operators/[id]/page.tsx
Package detail       apps/web/app/public/tour-packages/operators/[id]/[slug]/page.tsx
Booking confirm      apps/web/app/public/booking/tour-confirm/page.tsx
Payment              apps/web/app/public/booking/tour-payment/page.tsx
Post booking (account)
  list               apps/web/app/account/tour-packages/page.tsx
  detail             apps/web/app/account/tour-packages/[id]/page.tsx
  timeline           apps/web/app/account/tour-packages/[id]/timeline/page.tsx
  voucher            apps/web/app/account/tour-packages/[id]/voucher/page.tsx
  receipt            apps/web/app/account/tour-packages/[id]/receipt/page.tsx
  documents          apps/web/app/account/tour-packages/[id]/documents/page.tsx
```

## The customer journey (the spine)

1. Discover tour operators and their packages.
2. Open an operator profile, then open one of their packages.
3. Review and confirm: number of travelers, travel date, the international arrival
   airport so we can schedule the airport pickup, an optional hotel or lodge choice
   through NoLSAF, and the price with commission applied.
4. Pay with mobile money, bank, or card, then poll until the payment reaches success.
5. Manage the booked tour: voucher, receipt, timeline, pickup check in, chat with the
   operator, request a change, and report an issue.

A tour booking is created against an operator and a package. Like transport and stays,
the client never sets the price. The server prices the booking and the invoice is the
authority.

## Screens to build

Each screen lists its route, its data source, the sections it shows, the behaviors it
needs, and the states it must cover.

### 1. Tour Packages discovery

* Route: `TourPackages`.
* Data: `GET /api/public/agents` for operators (page 1, pageSize 50, the same as web),
  `GET /api/public/agents/categories` for categories, `GET /api/public/tourism-sites`
  with `country=all` for the parks and sites list, and the system commission from
  `GET /api/public/support/system-settings` (`agentCommissionPercent`, default 15). The
  home screen already loads featured operators through `src/tours/toursApi.ts`, so reuse
  those builders.
* Sections: a header with title and a count, an always visible search field, an advanced
  filters control (category, parks and sites, sort), and an operators list of verified
  operator cards.

#### Filter and search (mirrors the web)

The web loads up to fifty approved operators once, then filters, searches, and sorts on
the client. Native mirrors this exactly, so the experience stays instant and offline
friendly.

* Approved only. Show an operator only if it has at least one package whose status is
  one of `APPROVED`, `LIVE`, `PUBLISHED`, or `ACTIVE`. Operators with no approved package
  are hidden.
* Search. One text field, case insensitive substring match against a per operator search
  bag built from: `companyName`, `physicalLocation`, `businessAddress`,
  `operatingRegions`, `services`, `addOns`, `tourismTypes`, `specializations`, and each
  approved package's `name`, `title`, `destination`, and `category`.
* Category. A select of the categories from the API (fallback list: Safari Tours, Beach
  Holidays, Cultural Tours, Mountain Trekking, City Tours, Family Travel), plus All.
  Filters by substring match in the search bag.
* Parks and sites. A select of tourism sites from `tourism-sites`, plus All. Filters by
  substring match in the search bag.
* Sort. Recommended (most completed trips first), Top rated (trip confidence score, then
  completed trips), Price low to high, and Price high to low (by the lowest package price,
  with commission applied).
* Progressive disclosure. The search field is always visible. Category, parks and sites,
  and sort live behind an Advanced filters control, the same calm pattern Verified Stays
  uses. A small active filter summary and a Clear all action keep the state visible.
* Behaviors: tap an operator to open its profile, tap a package to open the package
  detail.
* States: loading skeletons, empty (no approved package found for the active search or
  filters), the onboarding placeholder when there are no operators at all, error with
  retry, and offline with the last cached operators.

### 2. Operator profile

* Route: `TourOperator` with params `{ id }`.
* Data: `GET /api/public/agents/:id` returns the operator profile and its packages.
* Sections: operator hero (name, logo, verified badge, region), about, trust signals
  (commission note, verification), and the operator's packages as cards.
* Behaviors: tap a package to open the package detail. Guest browsing is allowed.
* States: loading, empty (operator has no active packages), error, offline.

### 3. Package detail

* Route: `TourPackageDetail` with params `{ operatorId, slug }` (slug or package id).
* Data: read the package from the operator profile payload, or a dedicated package
  endpoint if one is added. Mirror the fields the web package page renders.
* Sections: photo hero, title and operator, about, what is included and excluded,
  itinerary or day plan, duration and group size, starting price (server net price,
  commission added at booking time), and a sticky Request booking action.
* Behaviors: Request booking routes a guest to Login first, then opens the booking
  review. Respect reduce motion for any photo slide.
* States: loading, error, offline.

### 4. Booking review and confirm

* Route: `TourBookingReview` with params `{ operatorId, packageId, packageName }`.
* Mirrors `public/booking/tour-confirm/page.tsx`.
* Collects, in one calm screen:
  * Number of travelers (a stepper).
  * Travel date (reuse `CalendarRangeSheet`, single date mode where the package is a
    fixed length).
  * Arrival airport, important but optional: the international airport in Tanzania the
    traveler flies into, so NoLSAF can schedule the airport pickup. Tours do not use the
    transport pickup points (airports as terminals, bus terminals, ferry ports), because
    tour travelers arrive by air from abroad, so there is no terminal or ferry pickup.
    Limit the choices to Tanzania international airports (for example Julius Nyerere,
    Kilimanjaro, Abeid Amani Karume). Stored as `metadata.departureAirport` with the
    shape `{ id, label, shortLabel, city, iataCode, lat, lng }`.
  * Hotel or lodge, optional: a Yes or Not now question, "Do you wish to book your hotel
    or lodge via NoLSAF". Yes links into Verified Stays tagged as coming from this tour,
    so the stay stays connected to the tour plan. Stored as
    `metadata.hotelLodgeBooking.wantsToBookViaNolsaf`.
  * Guest details (name, phone with Tanzania normalization through `lib/phone.ts`,
    email, nationality), autofilled from the account when signed in.
* Price: preview the gross total using the operator commission (the web loads
  `agentCommissionPercent`, default 15). Show it as an estimate. The server computes
  the authoritative total on create.
* Submit: `POST /api/public/tour-bookings` with `{ operatorAgentId, packageId,
  travelerCount, startDate, guestName, guestPhone, guestEmail, nationality, notes,
  metadata: { departureAirport, hotelLodgeBooking } }`. The response returns the booking
  id and the access token. Move to payment with both.
* States: loading, validation errors inline, error on create, offline.

### 5. Payment

* Route: `TourBookingPayment` with params `{ bookingId, accessToken }`.
* Mirrors `public/booking/tour-payment/page.tsx` and reuses the patterns already built
  in the stay `BookingPaymentScreen`.
* Three channels:
  * Mobile money: `POST /api/public/tour-bookings/:id/initiate-payment` (AzamPay
    PostCheckout, USSD push), four providers with real logos and a phone field.
  * Bank: `POST /api/public/tour-bookings/:id/initiate-bank-payment` (AzamPay
    BankCheckout). Keep the bank list aligned with the stay flow (CRDB and NMB are the
    settled banks today).
  * Card: `POST /api/public/tour-bookings/:id/initiate-card-payment` (AzamPay
    CardCheckout), open the hosted checkout with `expo-web-browser`, then resume
    polling on return. The webhook is the authoritative paid signal.
* Status polling: `GET /api/public/tour-bookings/:id/payment-status` through pending,
  success, timeout, and failed, with a countdown, matching the stay flow.
* Success shows the booking code and links to My Tours.
* States: idle, pending, success, timeout, failed, offline.

### 6. My Tours list and tour detail

* Routes: `MyTours` (list) and `TourDetail` with params `{ id }`.
* Data: `GET /api/customer/tour-bookings` for the list, `GET
  /api/customer/tour-bookings/:id` for the detail. All authed with the Bearer token.
* Tour detail surfaces the post booking tools the web account pages expose:
  * Voucher: `GET /api/customer/tour-bookings/:id/voucher`.
  * Receipt: `GET /api/customer/tour-bookings/:id/receipt`.
  * Timeline: `GET /api/customer/tour-bookings/:id/timeline`, with day events and
    ratings (`POST /:id/timeline-event-rating`).
  * Pickup check in: `POST /:id/start-pickup-checkin` and `POST /:id/validate-pickup`.
  * Chat with the operator: `GET` and `POST /:id/chat`.
  * Request a change: `POST /:id/request-change` and `DELETE
    /:id/request-change/:requestId`.
  * Report an issue: `POST /:id/report-issue` and `DELETE
    /:id/report-issue/:issueId`.
* States: loading, empty (no tours yet, link to TourPackages to browse), error,
  offline, plus per action success and failure.

## API contract

Public, guest allowed:

```text
GET  /api/public/agents/categories
GET  /api/public/agents
GET  /api/public/agents/:id
POST /api/public/tour-bookings
GET  /api/public/tour-bookings/:id/payment-status
POST /api/public/tour-bookings/:id/initiate-payment
POST /api/public/tour-bookings/:id/initiate-bank-payment
POST /api/public/tour-bookings/:id/initiate-card-payment
```

Customer, authed with the Bearer token:

```text
GET    /api/customer/tour-bookings
GET    /api/customer/tour-bookings/:id
GET    /api/customer/tour-bookings/:id/timeline
GET    /api/customer/tour-bookings/:id/voucher
GET    /api/customer/tour-bookings/:id/receipt
POST   /api/customer/tour-bookings/:id/start-pickup-checkin
POST   /api/customer/tour-bookings/:id/validate-pickup
GET    /api/customer/tour-bookings/:id/chat
POST   /api/customer/tour-bookings/:id/chat
POST   /api/customer/tour-bookings/:id/request-change
DELETE /api/customer/tour-bookings/:id/request-change/:requestId
POST   /api/customer/tour-bookings/:id/report-issue
DELETE /api/customer/tour-bookings/:id/report-issue/:issueId
POST   /api/customer/tour-bookings/:id/timeline-event-rating
POST   /api/customer/tour-bookings/:id/timeline-invite
GET    /api/customer/tour-bookings/timeline-invites/:token
POST   /api/customer/tour-bookings/timeline-invites/:token/accept
```

Mobile must use these explicit endpoints. It must not scrape web pages or Next.js
routes. Any tour endpoint the app needs should return predictable JSON with clear
errors, per the API Contract Policy in `NATIVE_APP_SETUP.md`.

## Pricing and commission

* The public package endpoints return the operator net price.
* Commission is added at booking time. The review screen previews the gross price
  using the operator commission percent (the web reads `agentCommissionPercent`,
  default 15), and the invoice stays authoritative.
* The client never sets or trusts the price. The server prices the booking on create
  and the payment status poll reflects the real settled amount.

## Status vocabulary

Reuse the one status vocabulary from `NATIVE_APP_SETUP.md` (requested, verified,
approved, disbursed, pending, paid, failed, cancelled, completed). Tour specific trip
states (for example draft, confirmed, in progress, completed) must match the backend
exactly. Do not invent new labels for the same backend state.

## Navigation routes to add

Add to `RootStackParamList` and register in both stacks where browsing is public:

```text
TourPackages        : undefined
TourOperator        : { id: number }
TourPackageDetail   : { operatorId: number; slug?: string; packageId?: number }
TourBookingReview   : { operatorId: number; packageId: number; packageName?: string }
TourBookingPayment  : { bookingId: number; accessToken: string }
MyTours             : undefined
TourDetail          : { id: number }
```

Guests can browse discovery, operator, and package detail. The Request booking action
gates to Login, the same way the stay flow does.

## Existing seams to reuse

* `src/tours/` already holds `toursApi.ts` and `types.ts`, with
  `fetchFeaturedTourPackages`, `fetchFeaturedTourOperators`, and the public tour types
  (`PublicTourPackageItem`, `PublicTourOperatorProfile`, `PublicTourAgent`). Extend
  `toursApi.ts` with the operator profile read, the package detail read, the tour
  booking create, the three payment initiations, the payment status poll, and the
  customer tour booking calls.
* `src/bookings/` checkout helpers and the stay `BookingPaymentScreen` are the closest
  reference for the payment screen. Reuse `CalendarRangeSheet`, `PaymentMethodCard`,
  `AmountText`, `StateView`, `ScreenHeader`, and `SafeScreen`. Tours do not use
  `PickupPickerSheet`; the arrival airport selector is a small dedicated control over
  the Tanzania international airports list.
* Reuse `lib/phone.ts` for phone normalization, `lib/env.ts` for config, and the
  shared `apiClient` for the Bearer token plus the invoice access token.

## Overflow and state checklist

Before any tour screen is considered done, it must pass the overflow checklist from
`NATIVE_APP_SETUP.md`, including:

* Long operator name and long package title.
* Long pickup point and long itinerary lines.
* Large amounts such as `125,000,000 TZS`.
* Accessibility font size increased.
* Keyboard open on the review and payment forms.
* Small Android viewport.
* Offline, error, and empty states visible without clipping.

## Out of scope (governance)

The operator and admin tour surfaces stay web only and must not appear in native
navigation:

```text
admin tour operators, tour bookings, tour experience, tour revenue
operator dashboards and operator payout views
```

These live under the secured web and admin portals and are excluded by the Admin
Exclusion Policy and the Customer First Policy in `NATIVE_APP_SETUP.md`.

## Build phases

The web flow is the 100 percent baseline. It is complete and correct, so native must
first match it feature for feature against the same APIs. On top of that, native must
add the mobile lift that the web cannot give, to reach 150 percent. The lift is not new
scope for its own sake. It is the set of things a phone does better: device location,
push notifications, offline access in the field, a real camera and QR, wallet style
proof screens, share sheets, haptics, and calm motion. The benchmarks in
`NATIVE_APP_SETUP.md` guide the lift: Airbnb calmness for discovery, Uber and Bolt
clarity for pickup and movement, Wise trust for payments, and Wallet style screens for
the voucher, receipt, and booking code.

Each phase below states the goal, what we build, the web baseline (the 100 percent), the
native lift (the extra 50 percent), the quality bar, and the exit criteria.

### Phase T1: discovery and detail (read only)

Goal: a traveler can find an operator and a package and understand them fully, with no
account required.

What we build:

* Screens `TourPackages`, `TourOperator`, and `TourPackageDetail`.
* Extend `src/tours/toursApi.ts` with the operator list, the operator profile read, and
  the package detail read, against `GET /api/public/agents`,
  `GET /api/public/agents/categories`, and `GET /api/public/agents/:id`.

Web baseline (100 percent):

* List operators, filter by category, open an operator profile, and open a package with
  its photos, description, inclusions, itinerary, duration, group size, and starting
  price.

Native lift (150 percent):

* Near me ranking. With permission, use device location (`expo-location`, already in the
  app) to sort operators and packages by real proximity, the same way the property
  browse uses `nearLat` and `nearLng`. The web cannot do true device location.
* Calm motion. One featured rail that auto rotates only on the unfiltered view and
  pauses on touch, all disabled under the system reduce motion setting, matching Verified
  Stays.
* Scale. Virtualized lists (`FlatList`) so a large operator catalogue scrolls smoothly.
* Offline first open. Cache the last loaded operators and packages so the screen opens
  instantly with content when signal is poor, then refreshes in the background.
* A static region map on the package detail (Mapbox Static Images, reusing
  `LocationMapCard`), with no live map battery cost.
* Save and share a package through the native share sheet, so a traveler can send it to a
  travel companion.
* Spring press feedback and skeleton shimmer for a responsive feel.

Quality bar: loading skeletons, empty per filter, error with retry, offline with cached
content, long operator and package names, large prices, small Android, accessibility
font.

Exit criteria: a traveler can browse operators and packages, open an operator, and open a
package, all from live data, with the states above. Near me, offline open, and share work
on a device.

### Phase T2: booking and payment

Goal: a signed in traveler can confirm a tour and pay, with the server pricing the
booking and the invoice staying authoritative.

What we build:

* Screens `TourBookingReview` and `TourBookingPayment`.
* `toursApi.ts` gains the tour booking create, the three payment initiations, and the
  payment status poll, against `POST /api/public/tour-bookings`,
  `POST /api/public/tour-bookings/:id/initiate-payment`, `initiate-bank-payment`,
  `initiate-card-payment`, and `GET /api/public/tour-bookings/:id/payment-status`.

Web baseline (100 percent):

* Collect travelers, travel date, the international arrival airport, the optional hotel
  or lodge question, and guest details. Apply the operator commission preview. Create the
  booking, then pay with mobile money, bank, or card, and poll to success with the
  booking code.

Native lift (150 percent):

* Login gate that returns cleanly. A guest who taps Request booking is sent to Login and
  returned to the review screen with the package context intact.
* Native date selection through `CalendarRangeSheet`, with required fields marked,
  validated on blur, and a clear blocked Continue until complete.
* Arrival airport as a clean bottom sheet with search by city and IATA code, and an
  optional nearest airport suggestion from device location.
* In app hotel or lodge bridge. Yes opens Verified Stays inside the app, carrying the
  tour context, and returns, rather than the web link out to a properties page. The stay
  stays connected to the tour plan.
* The three payment channels reuse the polished stay `BookingPaymentScreen` patterns:
  mobile money USSD push, bank checkout, and card through the hosted page with
  `expo-web-browser`, then resume polling, since the webhook is the authoritative paid
  signal.
* Haptic feedback on a successful payment, and a wallet style success screen with the
  booking code, an add to calendar action for the travel date, and share.
* Push notification registration so booking and payment updates arrive even after the app
  is closed.
* Offline safety. Submit and pay are disabled with a clear message when there is no
  signal, so the traveler never loses money to a dropped request.

Quality bar: idle, pending, success, timeout, failed, and offline payment states, plus
inline validation, large amounts such as `125,000,000 TZS`, keyboard open on the forms,
and small Android.

Exit criteria: a signed in traveler can confirm a tour (travelers, date, arrival airport,
optional accommodation, price) and pay with mobile money, bank, or card, then reach a
wallet style success screen with the booking code. The server prices the booking and the
invoice stays authoritative.

### Phase T3: post booking management

Goal: a traveler can manage a booked tour end to end from the phone, including in the
field with weak signal.

What we build:

* Screens `MyTours` (list) and `TourDetail`, against `GET /api/customer/tour-bookings`
  and `GET /api/customer/tour-bookings/:id`, plus the voucher, receipt, timeline, pickup
  check in, chat, request a change, and report an issue endpoints.

Web baseline (100 percent):

* List the traveler tours, open one, and view the voucher, receipt, and timeline, do the
  pickup check in, chat with the operator, request a change, and report an issue.

Native lift (150 percent):

* Wallet style voucher. The booking code as a scannable QR with a screen brightness boost
  on open, matching Apple Wallet and Google Wallet proof screens, so an operator can scan
  it at pickup.
* Pickup check in with the camera and device location. The traveler validates the pickup
  by scanning or by location, calling `start-pickup-checkin` and `validate-pickup`,
  which is a clear lift over a web button.
* Live timeline. Day by day events that update through the socket or a polling fallback,
  with per event ratings and haptic confirmation.
* Realtime chat with the operator over the socket, with push notifications so a reply
  arrives even when the app is closed.
* Offline proof. The voucher and receipt are cached so they open without signal in the
  field, where a tourist often has no data.
* Request a change and report an issue as bottom sheets that can attach a photo from the
  camera or photo library.
* Receipt as a shareable proof screen, and a map of the current day or itinerary with a
  directions action.

Quality bar: loading, empty (link to `TourPackages` to browse), error, offline with
cached voucher and receipt, plus per action success and failure, and the security rule
that sensitive material is read over the authed endpoints only.

Exit criteria: a traveler can manage a booked tour end to end from the app, including
opening the voucher and receipt offline, scanning in at pickup, following the live
timeline, and chatting with the operator.

## Locked decisions

* Booking gate: tours require Login before the booking review screen, matching the
  stay and transport flows. A guest can browse discovery, operator profiles, and
  package detail freely, but tapping Request booking routes the guest to Login first,
  then returns to the review screen. Guest booking with details collected inline is not
  used on native, even though the public create endpoint allows optional auth.
* Pickup model: tours do not use the transport pickup points. Tour travelers arrive by
  air from abroad, so there is no bus terminal or ferry pickup. Pickup is scheduled from
  the international arrival airport. The review screen offers an international airport
  selector limited to Tanzania international airports (Julius Nyerere, Kilimanjaro, Abeid
  Amani Karume), important but optional, stored in `metadata.departureAirport`. A
  separate optional question asks whether the traveler wants NoLSAF to handle the hotel
  or lodge, which links into the stay flow and is stored in
  `metadata.hotelLodgeBooking.wantsToBookViaNolsaf`.

## Open questions to confirm before building

* Documents screen: confirm whether the native tour detail includes the documents view
  the web account page exposes, or defers it.
