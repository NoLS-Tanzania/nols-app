# Branch Strategy - Two Truths, One Native Trunk

This repository is a monorepo. There are exactly two long lived development branches,
each the single source of truth for one concern:

- `staging` owns the backend and web (`apps/api`, `apps/web`, `apps/public`,
  `packages/shared`, `packages/prisma`, `prisma/`, and root deploy config).
- `nolsaf/integration` owns all native work (`apps/mobile`, `apps/driver`,
  `apps/partners`, and the shared UI package `packages/native-ui`).

`main` is the production release branch. Everything else is a backup or a release
pointer, not a place to develop.

## Why one native trunk, not a branch per app

The three native apps share `packages/native-ui` (and the root `package.json`, the
lockfile, and the Metro config). When each app had its own long lived branch, every
branch carried its own copy of the shared package and root config, and they drifted
and collided on every merge. A shared package can only have one canonical copy, which
means one branch. So all native development happens on `nolsaf/integration`.

This does not mix the apps together. They stay isolated **by folder**, which is
stronger than isolating by branch:

```text
apps/mobile/        customer app    (only customer code)
apps/driver/        driver app      (only driver code)
apps/partners/      partners app    (only partners code)
packages/native-ui/ shared UI       (used by all three)
```

A change is "app only" or "shared" based on which folder it touches, not which branch
you are on.

## The broad workspace and lean deploys

The root workspace list is intentionally broad:

```json
"workspaces": ["apps/*", "packages/*"]
```

That lets the native apps link `@nolsaf/native-ui` through normal workspace resolution,
with no forked copies. Backend deploys stay lean even with the broad list, because the
API and web Docker images install only the workspaces they need
(`npm ci --include-workspace-root --workspace=@nolsaf/api ...`) and `.dockerignore`
keeps the native apps out of those images. Deployment isolation lives in the deploy
layer, never in a narrowed workspace list. Do not narrow `workspaces` to fix a deploy;
that breaks native shared package linking. Fix deploy scope in the Dockerfiles instead.

## `main` - Production

- Production release branch.
- `apps/web` deploys to the production Vercel project.
- `apps/api` runs on the production AWS API environment and production database.
- Native apps are not deployed from `main`; native production builds are cut by EAS
  from a tagged commit on `nolsaf/integration`.
- Only merge tested work from `staging` into `main`.

## `staging` - Backend and Web Truth

`staging` owns anything that can affect more than one product surface at the API, web,
or runtime level:

- `apps/api`, `apps/web`, `apps/public`
- deployable shared packages such as `packages/shared` and `packages/prisma`
- `prisma/`
- root config such as `package.json`, `package-lock.json`, TypeScript, lint, build,
  and deployment config
- shared contracts for auth, booking, payments, pricing, availability, rides, payouts,
  notifications, and user data

When API behavior, database schema, or a deployable shared package changes, commit it
to `staging` first, then merge `staging` into `nolsaf/integration` so native picks it up.

## `nolsaf/integration` - Native Truth

The single branch for all native development: the customer app, the driver app, the
partners app, and the shared `packages/native-ui`. There is one canonical copy of the
shared package here, so it cannot drift.

- Pulls API, package, and shared contract updates from `staging` (merge `staging` in).
- All native commits land here, routed by folder (see below).
- Native release builds are cut from here per app via EAS.

### How to make an app only change (for example, driver UI only)

```bash
git checkout nolsaf/integration
# edit files under apps/driver/ only
cd apps/driver && npx expo start      # runs only the driver app
git add apps/driver/ && git commit -m "feat(driver): ..."
```

The commit touches only `apps/driver/**`, so `apps/mobile` and `apps/partners` are
untouched. No separate branch is needed; the folder boundary isolates it. The same
holds for customer only (`apps/mobile/`) and partners only (`apps/partners/`).

### How to make a shared change (for example, a native-ui component)

Editing `packages/native-ui/` intentionally affects all three apps, which is the point
of sharing. Update the component and its consumers in the same commit, and run the
typecheck across all three apps before pushing, so a breaking change cannot land for
one app and rot the others.

### Releasing one app independently

Each app keeps its own `app.json`, bundle id, and `eas.json`, so they ship separately
even though they share a tree:

```bash
cd apps/driver && eas build --profile production    # builds only the driver app
```

Choose which app to build and submit. Sharing a branch does not force them to ship
together.

## Legacy per app branches (backups only)

`nolsaf-native-expo`, `nolsaf-driver-expo`, and `nolsaf-partners-expo` are the old per
app development branches. Their work is already merged into `nolsaf/integration`. They
are kept as backups and historical reference only. Do not develop on them; new native
work goes on `nolsaf/integration`. They may be deleted once `nolsaf/integration` is
confirmed and pushed.

## Commit Routing

| Change type | Branch |
| --- | --- |
| API behavior, database, payment/auth/booking logic | `staging` |
| Web UI or Vercel-facing web changes | `staging` |
| Deployable shared packages or root deployment config | `staging` |
| Shared native UI (`packages/native-ui`) | `nolsaf/integration` |
| Customer app only (`apps/mobile`) | `nolsaf/integration` |
| Driver app only (`apps/driver`) | `nolsaf/integration` |
| Partner app only (`apps/partners`) | `nolsaf/integration` |

## Sync Flow

1. Commit shared backend or web work to `staging`.
2. Verify API, web, and shared package checks on `staging`.
3. Merge `staging` into `nolsaf/integration` so native has the latest contracts.
4. Commit native work on `nolsaf/integration`, routed by folder.
5. Cut per app native builds from `nolsaf/integration` via EAS.
6. Merge tested `staging` into `main` for backend and web production releases.

This keeps `staging` as the backend and web truth, `nolsaf/integration` as the native
truth with one canonical shared UI package, and each app isolated by its own folder.
