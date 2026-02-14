# Support Agent Portal – Draft Spec (Feb 13, 2026)

## Goal
After a support/operations agent is hired and approved, they should receive an email that confirms approval and includes credentials (or a secure credential-setup link) to access an internal portal. In the portal, the agent can view their assignments and related work/staff context.

## Primary User
- **Support Agent (new hire)**: logs in, sees all assignments they have done, and other staff-related info connected to those assignments.

## Core Requirements (from conversation)
1. **Hire approval triggers portal access**
   - When the agent is approved/hired, they receive an email.
   - At the same time, they receive credentials to access the portal.

2. **Portal capabilities (MVP)**
   - Agent can **see and view all assignments they have done**.
   - Agent can see **other staff-related information** connected to their work (exact scope TBD).

## Suggested Onboarding Flow (secure default)
- Admin marks candidate as **Hired/Active**.
- System sends email with:
  - A **one-time setup link** (preferred over sending a plaintext password), e.g. `.../account/setup?token=...`
  - Instructions to set password + enable MFA (optional later).
- On first login, agent is forced to:
  - Set a new password
  - Accept required policies

## Portal Information Architecture (MVP)
- **Dashboard**
  - Summary: assignments completed, in-progress, last activity.
- **My Assignments** (list + detail)
  - Filters later; MVP can be simple list.
  - Assignment detail includes:
    - status, timestamps, property/booking/customer reference (as applicable)
    - notes/actions performed
    - attachments (if any)
    - linked staff (who assigned/reviewed)
- **Profile**
  - name, role, contact, last login

## Initial UI Routes (scaffold)
These routes reuse the existing **Account** layout (premium PublicHeader + boundary frame) so the portal looks consistent and premium out of the box.

- `/account/agent` (dashboard)
- `/account/agent/assignments` (list)
- `/account/agent/assignments/[id]` (detail)

## Data Model (high-level)
- `AgentProfile` (links to existing `User`)
  - `userId`, `employeeId` (optional), `role`, `status`
- `Assignment`
  - `id`, `title`, `description`, `status`, `createdAt`, `completedAt`
  - `assignedToUserId`
  - `createdByUserId` (manager/admin)
  - `relatedEntityType` + `relatedEntityId` (booking/property/etc)
- `AssignmentEvent` / `AssignmentNote`
  - audit trail of actions taken

## API (MVP)
- `GET /api/agent/me` (profile + permissions)
- `GET /api/agent/assignments` (list)
- `GET /api/agent/assignments/:id` (detail)

## Open Questions (answer when you’re awake)
1. **Credentials**: Do we want to email a temporary password, or email a one-time setup link (recommended) to set the password?
2. **Assignments**: What counts as an “assignment” in your ops process (support ticket, booking issue, property verification, driver/owner onboarding, etc.)?
3. **Other staff info**: What should be visible—only the assigner/reviewer names, or broader staff directory/roles?

## Next Implementation Steps (when we start)
- Confirm the 3 open questions above.
- Add an `agent` role + permission checks.
- Build onboarding email + token-based password setup.
- Create the Agent Portal pages (dashboard + assignments list/detail).
