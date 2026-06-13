# Branch Strategy - Shared Core and App Branches

This repository is a monorepo. Every branch can discover the apps that exist in
its working tree through the root workspace pattern:

```json
"workspaces": ["apps/*", "packages/*"]
```

That gives us one clean rule:

- Shared code is integrated through `staging`.
- App-only code stays on that app's branch.
- `main` receives only tested production-ready work.

## Branches

```text
main                  Production
staging               Shared API, web, packages, database, and root config
nolsaf-native-expo    Traveller/customer native app in apps/mobile
nolsaf-driver-expo    Driver native app in apps/driver
nolsaf-partners-expo  Future partner native app in apps/partners
```

## `main` - Production

- Production release branch.
- `apps/web` deploys to the production Vercel project.
- `apps/api` runs on the production AWS API environment and production database.
- Native apps are not deployed directly from `main`; production builds are cut
  from the relevant verified native branch/tag.
- Only merge tested work from `staging` into `main`.

## `staging` - Shared Integration

`staging` is the shared truth branch. It owns anything that can affect more than
one product surface:

- `apps/api`
- `apps/web`
- `packages/*`
- `prisma/`
- root workspace files such as `package.json`, `package-lock.json`, TypeScript,
  lint, build, and deployment config
- shared contracts for auth, booking, payments, pricing, availability, rides,
  payouts, notifications, and user data

When API behavior, database schema, shared UI, or shared package behavior changes,
commit it to `staging` first. Then merge or rebase `staging` into every app branch
that needs the change.

## `nolsaf-native-expo` - Traveller Mobile

- Owns customer mobile work in `apps/mobile`.
- Uses EAS for Android/iOS builds and updates.
- Pulls API, package, payment, auth, booking, availability, and NoLSCOPE contract
  updates from `staging`.
- Mobile-only screens, navigation, assets, and app config belong here.
- API or shared package changes must not be hidden inside this branch only.

## `nolsaf-driver-expo` - Driver Mobile

- Owns driver app work in `apps/driver`.
- Uses EAS for Android/iOS builds and updates.
- Pulls shared UI, API, auth, ride, payout, and notification contracts from
  `staging`.
- Driver-only screens, navigation, assets, and app config belong here.

## Future `nolsaf-partners-expo` - Partner Mobile

- Will own partner app work in `apps/partners`.
- Pulls shared contracts and packages from `staging`.
- Partner-only screens, navigation, assets, and app config belong there.

## Commit Routing

Use this routing before every commit:

| Change type | Branch |
| --- | --- |
| API behavior, database, payment/auth/booking logic | `staging` |
| Web UI or Vercel-facing web changes | `staging` |
| Shared packages or root workspace config | `staging` |
| Traveller mobile only | `nolsaf-native-expo` |
| Driver app only | `nolsaf-driver-expo` |
| Partner app only | `nolsaf-partners-expo` |

## Sync Flow

1. Commit shared work to `staging`.
2. Verify API/web/shared package checks on `staging`.
3. Merge or rebase `staging` into app branches that need the shared work.
4. Commit app-only work on the app branch.
5. Merge tested `staging` into `main` for production releases.

This keeps `staging` as the tree that holds shared behavior, while each app branch
stays focused on its own product surface.
