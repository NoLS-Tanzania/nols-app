# Property Listing Workflow: Owner → Admin

## Overview
This document outlines the complete property listing workflow from owner submission to admin approval, including all routes, notifications, and security measures.

## Workflow Steps

### 1. Owner Creates Property
**Route:** `POST /owner/properties`
- **Location:** `apps/api/src/routes/owner.properties.ts` (line 105)
- **Security:** Requires authentication + OWNER role
- **Status:** Creates property with status `DRAFT`
- **Validation:** Uses Zod schema (`baseBodySchema`)
- **Response:** Returns `{ id: number }`

### 2. Owner Submits Property for Review
**Route:** `POST /owner/properties/:id/submit`
- **Location:** `apps/api/src/routes/owner.properties.ts` (line 248)
- **Security:** Requires authentication + OWNER role, verifies property belongs to owner
- **Status Change:** `DRAFT` → `PENDING`
- **Validation:** 
  - Title ≥ 3 characters
  - Region and District required
  - ≥ 3 photos required
  - ≥ 1 room type required
- **Notification:** Owner receives `property_submitted` notification
- **Response:** Returns `{ ok: true, id: number, status: "PENDING" }`

### 3. Admin Reviews Property
**Route:** `GET /admin/properties/:id`
- **Location:** `apps/api/src/routes/admin.properties.ts` (line 135)
- **Security:** Requires authentication + ADMIN role
- **Response:** Returns full property details with owner information

### 4. Admin Approves Property
**Route:** `POST /admin/properties/:id/approve`
- **Location:** `apps/api/src/routes/admin.properties.ts` (line 210)
- **Security:** Requires authentication + ADMIN role
- **Status Change:** `PENDING` → `APPROVED`
- **Actions:**
  - Updates property status to `APPROVED`
  - Emits `property.status.changed` event
  - Invalidates admin property queues cache
  - Invalidates owner property lists cache
  - **Sends notification to owner** (`property_approved`)
  - Creates audit log entry
  - Broadcasts status change via Socket.IO
- **Response:** Returns `{ ok: true, id: number, status: "APPROVED" }`

### 5. Owner Views Approved Properties
**Route:** `GET /owner/properties/mine?status=APPROVED`
- **Location:** `apps/api/src/routes/owner.properties.ts` (line 78)
- **Security:** Requires authentication + OWNER role, filters by ownerId
- **Frontend:** `apps/web/app/(owner)/owner/properties/approved/page.tsx`
- **Response:** Returns paginated list of approved properties

## Alternative Workflows

### Admin Rejects Property
**Route:** `POST /admin/properties/:id/reject`
- **Status Change:** `PENDING` → `REJECTED`
- **Notification:** Owner receives `property_rejected` with reasons and notes
- **Owner Action:** Can edit and resubmit

### Admin Suspends Property
**Route:** `POST /admin/properties/:id/suspend`
- **Status Change:** `APPROVED` → `SUSPENDED`
- **Notification:** Owner receives `property_suspended` with reason

## Notification System

### Notification Templates
Located in: `apps/api/src/lib/notifications.ts`

**Available Templates:**
1. `property_submitted` - When owner submits property
2. `property_approved` - When admin approves property
3. `property_rejected` - When admin rejects property (includes reasons)
4. `property_suspended` - When admin suspends property
5. `property_unsuspended` - When admin reinstates property

### Notification Storage
- **Service:** `apps/api/src/services/notifications.ts`
- **Model:** Uses `prisma.notification` (gracefully handles if model doesn't exist)
- **Fields:** `ownerId`, `title`, `body`, `unread`, `meta`, `createdAt`
- **Retrieval:** `GET /api/owner/notifications?tab=unread|viewed&page=1&pageSize=20`

## Security Measures

### Owner Routes (`/owner/properties/*`)
- ✅ **Authentication Required:** `requireAuth` middleware
- ✅ **Role Check:** `requireRole("OWNER")` middleware
- ✅ **Ownership Verification:** All operations verify `ownerId` matches authenticated user
- ✅ **Input Validation:** Zod schema validation for all inputs
- ✅ **SQL Injection Protection:** Prisma ORM with parameterized queries

### Admin Routes (`/admin/properties/*`)
- ✅ **Authentication Required:** `requireAuth` middleware
- ✅ **Role Check:** `requireAdmin` middleware
- ✅ **Audit Logging:** All status changes are logged with actor details
- ✅ **Event Broadcasting:** Real-time updates via Socket.IO

## Frontend Pages

### Owner Pages
1. **Add Property:** `/owner/properties/add`
   - Multi-step form (6 steps)
   - Validates completeness before submission
   - Redirects to pending page after submission

2. **Pending Properties:** `/owner/properties/pending`
   - Shows properties with status `PENDING` or `DRAFT`
   - Displays status badges

3. **Approved Properties:** `/owner/properties/approved`
   - Shows properties with status `APPROVED`
   - Grid layout with property cards

### Admin Pages
- Property management interface for reviewing and approving properties
- Real-time status updates via Socket.IO

## Communication Flow

```
Owner                    Admin                    Database
  |                        |                         |
  |-- Create (DRAFT) ----->|                         |
  |                        |-- Store ----------------|
  |                        |                         |
  |-- Submit (PENDING) --->|                         |
  |                        |-- Update Status --------|
  |<-- Notification -------|                         |
  |                        |                         |
  |                        |-- Review ---------------|
  |                        |                         |
  |                        |-- Approve (APPROVED) ---|
  |<-- Notification -------|                         |
  |                        |                         |
  |-- View Approved ------>|                         |
  |<-- List --------------|                         |
```

## Status Transitions

```
DRAFT → PENDING → APPROVED
         ↓
      REJECTED (can resubmit)
         ↓
      SUSPENDED (from APPROVED)
```

## Testing Checklist

- [x] Owner can create property (DRAFT)
- [x] Owner can submit property (PENDING)
- [x] Owner receives notification on submission
- [x] Admin can view pending properties
- [x] Admin can approve property (APPROVED)
- [x] Owner receives notification on approval
- [x] Owner can view approved properties
- [x] Admin can reject property with reasons
- [x] Owner receives notification on rejection
- [x] All routes are properly secured
- [x] Notifications are stored in database
- [x] Cache invalidation works correctly
- [x] Audit logs are created for all actions

## Notes

- The notification system gracefully handles missing Notification model
- All property operations are logged for audit purposes
- Real-time updates are broadcast via Socket.IO for admin dashboard
- Cache invalidation ensures data consistency across views
