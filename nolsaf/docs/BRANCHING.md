# Branch Strategy - Shared Core and App Branches

This repository is a monorepo. Every branch discovers the apps and packages in its
working tree through the broad root workspace pattern:

```json
"workspaces": ["apps/*", "packages/*"]
```

This is intentional: it lets the native apps (`apps/mobile`, `apps/driver`,
`apps/partners`) link the shared UI package `packages/native-ui` through normal
workspace resolution, with no forked copies. Backend deploys stay lean even with the
broad list, because the API and web Docker images install only the workspaces they
need (`npm ci --include-workspace-root --workspace=@nolsaf/api ...`) and `.dockerignore`
keeps the native apps out of those images. Deployment isolation lives in the deploy
layer, not in a narrowed workspace list.

That gives us one clean rule:

- Shared code is integrated through `staging`.
- App-only code stays on that app's branch.
- `main` receives only tested production-ready work.

## Branches

```text
main                  Production
staging               Shared API, web, packages, database, and root config
native/integration    Native trunk: merges staging + all native app branches
nolsaf-native-expo    Traveller/customer native app in apps/mobile
nolsaf-driver-expo    Driver native app in apps/driver
nolsaf-partners-expo  Partner native app in apps/partners
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
one product surface at the API, web, or runtime level:

- `apps/api`
- `apps/web`
- deployable shared packages such as `packages/shared` and `packages/prisma`
- `prisma/`
- root config such as `package.json`, `package-lock.json`, TypeScript, lint,
  build, and deployment config
- shared contracts for auth, booking, payments, pricing, availability, rides,
  payouts, notifications, and user data

When API behavior, database schema, or deployable shared package behavior changes,
commit it to `staging` first. Then merge or rebase `staging` into the native trunk
or app branch that needs the change.

The shared native UI package `packages/native-ui` is part of the broad workspace so
native apps can link it, but it is never installed by the API or web Docker images
because those images scope their installs to the backend workspaces. Keep the root
workspace list broad; do not narrow it to fix a deploy, since narrowing it breaks
native shared package linking. Fix deploy scope in the Dockerfiles and
`.dockerignore` instead.

## `native/integration` - Native Trunk

- The integration branch for all native work. Built from `staging`, then merges
  `nolsaf-native-expo` and `nolsaf-driver-expo` so the customer app, the driver app,
  and the shared `packages/native-ui` live on one tree.
- The shared package migration (apps consume `@nolsaf/native-ui` instead of forking)
  lands here, so there is one canonical copy.
- New native app branches, such as `nolsaf-partners-expo`, are cut from here.
- Pulls API, package, and shared contract updates from `staging`.

## `nolsaf-native-expo` - Traveller Mobile

- Owns customer mobile work in `apps/mobile`.
- Uses EAS for Android/iOS builds and updates.
- Pulls API, package, payment, auth, booking, availability, and NoLSCOPE contract
  updates from `staging` through `native/integration`.
- Mobile-only screens, navigation, assets, and app config belong here.
- API or shared package changes must not be hidden inside this branch only.

## `nolsaf-driver-expo` - Driver Mobile

- Owns driver app work in `apps/driver`.
- Uses EAS for Android/iOS builds and updates.
- Pulls shared UI, API, auth, ride, payout, and notification contracts from
  `staging` through `native/integration`.
- Driver-only screens, navigation, assets, and app config belong here.

## `nolsaf-partners-expo` - Partner Mobile

- Owns partner app work in `apps/partners`.
- Cut from `native/integration` so it starts with the canonical `packages/native-ui`.
- Pulls shared contracts and packages from `staging` through `native/integration`.
- Partner-only screens, navigation, assets, and app config belong there.

## Commit Routing

Use this routing before every commit:

| Change type | Branch |
| --- | --- |
| API behavior, database, payment/auth/booking logic | `staging` |
| Web UI or Vercel-facing web changes | `staging` |
| Deployable shared packages or root deployment config | `staging` |
| Shared native UI (`packages/native-ui`) | `native/integration` |
| Customer mobile only | `nolsaf-native-expo` |
| Driver app only | `nolsaf-driver-expo` |
| Partner app only | `nolsaf-partners-expo` |

## Sync Flow

1. Commit shared work to `staging`.
2. Verify API/web/shared package checks on `staging`.
3. Merge or rebase `staging` into `native/integration`, then into the app branches
   that need the shared work.
4. Commit app-only work on the app branch.
5. Merge tested `staging` into `main` for production releases.

This keeps `staging` as the tree that holds shared behavior, `native/integration` as
the tree that holds shared native UI, and each app branch focused on its own product
surface.
