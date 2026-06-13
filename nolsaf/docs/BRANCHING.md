# Branch Strategy — API, Web, and the Native Apps

This repo is a single monorepo (`apps/api`, `apps/web`, `apps/mobile`, and later
`apps/driver` and `apps/partners`, plus shared `packages/` and `prisma/`). Every
branch's working tree can contain all of these apps, but each branch has one job.
This doc explains what each branch is for, what gets deployed from it, and the rules
that keep them from contradicting each other as more native apps are added.

## The branches today

```text
main                  Production
staging               Active development for apps/api and apps/web
nolsaf-native-expo    Traveller/Customer native app (apps/mobile)
nolsaf-driver-expo    Driver native app (apps/driver), see NATIVE_DRIVER_APP.md
nolsaf-partners-expo  Partners native app (apps/partners), see NATIVE_APP_SETUP.md Phase 5
```

`nolsaf-driver-expo` and `nolsaf-partners-expo` were branched from `staging`, not from
`nolsaf-native-expo`. They start clean, with the current `apps/api` and `apps/web`,
and no in progress traveller mobile work.

## `main` — Production

- The source of truth for what is live for real users.
- `apps/api` deploys to the production AWS service and uses the production AWS
  database.
- `apps/web` deploys to the production Vercel project (Production environment).
- Native apps are not deployed from here directly. Production mobile builds are cut
  via EAS from a tagged commit on the relevant native branch, once that branch's work
  has been verified on `staging`.
- Only merge into `main` once changes have been verified on `staging`.

## `staging` — The one source of truth for `apps/api` and `apps/web`

- Day to day development branch for `apps/api` and `apps/web`.
- `apps/api` deploys to the staging Render service (staging database).
- `apps/web` deploys as a Vercel Preview, pointed at the staging API.
- `staging` does not contain `apps/mobile`, `apps/driver`, or `apps/partners`, and does
  not contain the native planning docs (`NATIVE_APP_SETUP.md`,
  `NATIVE_TOUR_OPERATORS.md`, `NATIVE_DRIVER_APP.md`). Those live only on the native
  branches.
- This is the branch all backend and web feature work should target. Any API change a
  native app needs (a new endpoint, a changed field, a bug fix) lands on `staging`
  first, then flows out to the native branches. A native branch must never be the
  first or only place an `apps/api` change happens, because the other native branches
  and web would not get it.

## `nolsaf-native-expo` — Traveller/Customer native app

- Active development branch for `apps/mobile` (Expo, React Native).
- Started as a sync of `staging`, plus the mobile app added on top.
- `apps/mobile` is not deployed via Vercel or Render. It is built and distributed
  through EAS Build (dev, preview, production profiles) and EAS Submit to the Play
  Store and App Store. OTA JS updates go through EAS Update.
- `apps/web`'s `vercel.json` has an `ignoreCommand` that skips the Vercel build on
  this branch unless a commit actually touches `apps/web` or `packages/shared`, so
  pure mobile commits do not trigger or fail a web preview build.
- The mobile app talks to the same backend API as web. `EXPO_PUBLIC_API_URL` in
  `apps/mobile/.env*` points at the staging or production Render API URL depending on
  the EAS build profile.
- Holds `NATIVE_APP_SETUP.md` and `NATIVE_TOUR_OPERATORS.md`, the planning docs for
  this app.

### Known gap to close

Native branches can drift from `staging` if they are not synced regularly. Before any
further `apps/api` or `apps/web` work happens on this branch, compare it against
`staging` and bring in the staging-only shared commits first, since the mobile app
depends on `apps/api` behaving the same way web does. See "Keeping native branches in
sync" below.

## `nolsaf-driver-expo` — Driver native app

- Development branch for `apps/driver` (Expo, React Native), once scaffolding starts.
- Branched from `staging`, so it starts with the current `apps/api` and `apps/web`
  and no traveller mobile code.
- Plan and screen by screen scope: `NATIVE_DRIVER_APP.md`. That file is not on
  `staging`; bring it onto this branch (cherry pick or copy) before starting Phase 1.
- Same deployment story as `nolsaf-native-expo`: `apps/driver` ships via EAS, not
  Vercel or Render. Apply the same `vercel.json` `ignoreCommand` pattern so pure
  driver commits do not affect the web preview build.
- Phase 1 of `NATIVE_DRIVER_APP.md` extracts shared, generic native components
  (theme tokens, `AppButton`, `AppCard`, the API client, secure auth storage, and so
  on) out of `apps/mobile` into a shared package. That extraction touches
  `apps/mobile` files that also live on `nolsaf-native-expo`. See "Shared package
  rule" below for how to do this without the two branches fighting over the same
  files.

## `nolsaf-partners-expo` — Partners native app (Owner and Operator)

- Development branch for `apps/partners` (Expo, React Native), for later, once the
  Driver app foundation is reviewed and stable.
- Branched from `staging`, same starting point as `nolsaf-driver-expo`.
- Plan: `NATIVE_APP_SETUP.md` Phase 5, and its own linked plan file
  (`NATIVE_PARTNERS_APP.md`) once that phase starts.
- Same EAS based deployment story, same `vercel.json` pattern, and the same shared
  package rule as `nolsaf-driver-expo`.
- Until this phase actually starts, this branch should be kept at or near `staging`.
  Do not let it sit untouched and drift the way `nolsaf-native-expo` drifted from
  `staging`; if months pass before Phase 5 starts, re-cut it from `staging` rather
  than syncing a stale branch.

## Keeping native branches in sync with `staging`

Each native branch (`nolsaf-native-expo`, `nolsaf-driver-expo`,
`nolsaf-partners-expo`) periodically pulls the latest `staging` into itself, via merge
or cherry pick, so it always has the current `apps/api` contract and `apps/web` code.
This is one directional: `apps/api` and `apps/web` changes flow `staging` to native
branches, never the other way. If a native branch needs an API change that does not
exist yet, that change is made on `staging` first (its own small commit, reviewed on
its own), then pulled into the native branch.

If a shared `apps/api` or `apps/web` change is accidentally made while working on a
native branch, split it into its own commit and apply that commit to `staging`
immediately. Do not leave shared backend or web behavior only on a native branch.
After it is on `staging`, sync that commit back into any native branch that needs it.

Rules of thumb:

- Sync often, in small batches. A branch that goes weeks without syncing can become
  expensive to untangle.
- Never resolve a conflict in `apps/api` or `apps/web` by keeping the native branch's
  version. The native branch's copy of those folders should always end up identical
  to `staging`'s, the same way `nolsaf-driver-expo` and `nolsaf-partners-expo` started
  identical to `staging` today.
- `apps/mobile`, `apps/driver`, `apps/partners`, and the native docs only exist on
  their own branches and on each other where explicitly shared (see below), never on
  `staging` or `main`.

## Shared package rule (avoiding contradictions between native branches)

Once `NATIVE_DRIVER_APP.md` Phase 1 extracts a shared package (for example
`packages/native-ui`) out of `apps/mobile`, three branches care about that package:
`nolsaf-native-expo` (where the components currently live), `nolsaf-driver-expo`
(which needs them to build `apps/driver`), and later `nolsaf-partners-expo`.

To avoid two branches both "owning" the same shared files differently:

1. The extraction happens once, as its own commit, on `nolsaf-native-expo` first
   (since that is where the components already exist and are proven).
2. That extraction commit is merged to `staging` as soon as it builds and the
   `apps/mobile` app still works against it. This makes `packages/native-ui` part of
   the normal `staging` tree, like any other shared package.
3. `nolsaf-driver-expo` and `nolsaf-partners-expo` then get `packages/native-ui`
   through the normal "sync from staging" path above, the same as any other shared
   code. They do not re-extract it or fork their own copy.
4. After step 2, `packages/native-ui` is governed by the same rule as `apps/api` and
   `apps/web`: changes to it land on `staging` (or are merged there quickly after
   landing on whichever native branch touched it first), then flow out to the other
   native branches.

This keeps exactly one copy of the shared package on `staging`, with each native
branch consuming it, instead of three branches each holding a slightly different
fork.

## How the apps connect across branches

| | `apps/api` | `apps/web` | native app |
|---|---|---|---|
| **main** | Production AWS | Production Vercel | EAS production builds (from tagged commits on the relevant native branch) |
| **staging** | Staging Render | Staging Vercel preview | not present |
| **nolsaf-native-expo** | synced from staging | synced from staging, web build skipped via `ignoreCommand` unless web changed | `apps/mobile`, EAS dev/preview builds |
| **nolsaf-driver-expo** | synced from staging | synced from staging, same `ignoreCommand` pattern | `apps/driver`, EAS dev/preview builds |
| **nolsaf-partners-expo** | synced from staging | synced from staging, same `ignoreCommand` pattern | `apps/partners`, EAS dev/preview builds |

In short: **`apps/api` and `apps/web` have one normal CI/CD pipeline: production runs
from `main` with API/database on AWS and web on Vercel, while `staging` runs the
staging API/web pipeline. Each native app has its own EAS pipeline, driven by its own
branch, but every native branch always consumes the same `apps/api` and `apps/web` as
`staging`, kept current through one directional syncing.**

## Git commands for managing these branches

These are the actual commands for the situations described above. Run them from the
repo root. Always `git fetch origin` first so local branches reflect what is on the
remote before comparing or merging.

### Creating a new native branch from `staging`

This is how `nolsaf-driver-expo` and `nolsaf-partners-expo` were created, and how
`nolsaf-partners-expo` should be re-cut later if it goes stale before Phase 5 starts.

```bash
git fetch origin
git branch <new-branch-name> origin/staging
git push -u origin <new-branch-name>
```

If the branch already exists and needs to be reset to a fresh copy of `staging`
(only do this if it has no work worth keeping):

```bash
git fetch origin
git checkout <branch-name>
git reset --hard origin/staging
git push --force-with-lease origin <branch-name>
```

`--force-with-lease`, not `--force-with-lease=false` or plain `--force`, and confirm
with whoever owns that branch first, since this discards its history.

### Syncing a native branch with the latest `staging`

Run this periodically on `nolsaf-native-expo`, `nolsaf-driver-expo`, and
`nolsaf-partners-expo` (once it is active) so `apps/api` and `apps/web` stay current.

```bash
git fetch origin
git checkout nolsaf-driver-expo
git merge origin/staging
```

If conflicts appear in `apps/api` or `apps/web`, resolve by taking `staging`'s side
for those paths, per the rule above:

```bash
git checkout --theirs -- nolsaf/apps/api nolsaf/apps/web
git add nolsaf/apps/api nolsaf/apps/web
git commit
```

(`--theirs` here means `origin/staging`'s version, since `staging` was merged in.)
Then push:

```bash
git push origin nolsaf-driver-expo
```

### Closing a `nolsaf-native-expo` sync gap

Before more `apps/api` or `apps/web` work happens on `nolsaf-native-expo`, compare it
with `staging` and bring in the staging-only shared commits:

```bash
git fetch origin
git checkout nolsaf-native-expo
git merge origin/staging
```

Resolve any conflicts in `apps/api`/`apps/web` in favor of `staging`'s side as above.
Conflicts in `apps/mobile` or the native docs are expected to be rare, since `staging`
does not touch those paths, but if any appear, keep `nolsaf-native-expo`'s side for
those. Build and test `apps/mobile` against the updated `apps/api` before pushing.

### Applying shared native package extraction to `staging`

Once `NATIVE_DRIVER_APP.md` Phase 1 extracts `packages/native-ui` on
`nolsaf-native-expo` and it builds cleanly, use a targeted cherry pick of just the
extraction commit(s):

```bash
git checkout staging
git cherry-pick <extraction-commit-sha>
git push origin staging
```

Then sync `nolsaf-driver-expo` (and later `nolsaf-partners-expo`) from `staging` as
described above, so they pick up `packages/native-ui` the normal way.

### Promoting a native branch toward `main`

Only after the relevant phase has been verified on `staging` quality checks and the
native branch is fully synced with `staging`:

```bash
git fetch origin
git checkout main
git merge --no-ff <native-branch-name>
git push origin main
```

Tag the commit used for the EAS production build so it can be traced back later:

```bash
git tag <app-name>-v<version>
git push origin <app-name>-v<version>
```

### Quick health check between any two branches

Use this whenever it is unclear how far two branches have drifted:

```bash
git fetch origin
git rev-list --left-right --count origin/staging...origin/<branch-name>
git log origin/<branch-name>..origin/staging --oneline
git log origin/staging..origin/<branch-name> --oneline
```

The first command gives the count in each direction. The next two list the actual
commits each side is missing.
