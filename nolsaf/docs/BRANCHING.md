# Branch Strategy - Shared Core and App Branches

This repository is a monorepo. The important rule is simple:

- Shared code is integrated through `staging`.
- App-only code stays on that app's branch.
- `main` is for production-ready releases.

## `main` - Production

- Production release branch.
- `apps/web` is deployed to the production Vercel project.
- `apps/api` runs on the production AWS API environment and production database.
- Only merge tested work from `staging` into `main`.

## `staging` - Shared Integration

`staging` is the shared truth branch. It owns anything that can affect more than
one app:

- `apps/api`
- `apps/web`
- `packages/*`
- `prisma/`
- root workspace files such as `package.json`, `package-lock.json`, TypeScript,
  lint, build, and deployment config
- shared contracts for auth, booking, payments, pricing, availability, and user
  data

When API or shared package behavior changes, commit it to `staging` first. Then
merge or rebase `staging` into the app branch that needs the change.

## `nolsaf-native-expo` - Customer Mobile App

- Owns customer mobile work in `apps/mobile`.
- Uses EAS for Android/iOS builds.
- Pulls API, package, payment, auth, and contract updates from `staging`.
- Should not hide API or shared package changes inside mobile-only commits.

## `nolsaf-driver-expo` - Driver Mobile App

- Owns driver app work in `apps/driver`.
- Uses EAS for Android/iOS builds.
- Pulls shared UI, API, auth, ride, payout, and notification contracts from
  `staging`.
- Driver-only screens, navigation, assets, and app config belong here.

## Future `nolsaf-partners-expo` - Partner Mobile App

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
| Customer mobile only | `nolsaf-native-expo` |
| Driver app only | `nolsaf-driver-expo` |
| Partner app only | `nolsaf-partners-expo` |

## Sync Flow

1. Commit shared work to `staging`.
2. Verify API/web/shared package checks on `staging`.
3. Merge or rebase `staging` into app branches that need the shared work.
4. Commit app-only work on the app branch.
5. Merge tested `staging` into `main` for production releases.

This keeps `staging` as the tree that holds shared behavior, while each app
branch stays focused on its own product surface.
