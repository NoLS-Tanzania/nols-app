# NoLSAF - Comprehensive Fix Workspace

**Last Updated:** 2025-01-XX  
**Status:** 🟡 In Progress  
**Priority:** Critical Security & Missing Features

---

## 📋 Table of Contents

1. [Security Vulnerabilities](#security-vulnerabilities)
2. [Missing API Routes](#missing-api-routes)
3. [Incomplete Implementations](#incomplete-implementations)
4. [Frontend-Backend Mismatches](#frontend-backend-mismatches)
5. [Fix Priority Matrix](#fix-priority-matrix)
6. [Implementation Checklist](#implementation-checklist)
7. [Testing Requirements](#testing-requirements)

---

## 🔴 Security Vulnerabilities

### Critical (Fix Immediately)

#### 1. **Missing Public API Routes - Information Disclosure Risk**
- **Issue:** Frontend calls `/api/public/properties` and `/api/public/properties/:id` but routes don't exist
- **Risk:** Developers may expose admin endpoints or bypass security
- **Location:** 
  - Frontend: `nolsaf/apps/public/app/page.tsx`, `nolsaf/apps/public/app/property/[id]/page.tsx`
  - Backend: Missing routes
- **Fix Status:** ⬜ Not Started
- **Fix File:** `nolsaf/apps/api/src/routes/public.properties.ts` (NEW)
- **Registration:** Add to `nolsaf/apps/api/src/index.ts`

#### 2. **Stub Booking Endpoint - Data Injection Risk**
- **Issue:** `/api/bookings` POST returns mock data, accepts arbitrary JSON without validation
- **Risk:** Booking ID enumeration, fake booking injection, replay attacks
- **Location:** `nolsaf/apps/api/src/routes/bookings.ts` (lines 9-21)
- **Fix Status:** ⬜ Not Started
- **Fix File:** `nolsaf/apps/api/src/routes/bookings.ts`

#### 3. **Codes Search Endpoint - Brute Force Risk**
- **Issue:** `/codes/search` is a stub with TODO comment, no auth, minimal rate limiting
- **Risk:** Code enumeration leading to booking takeover
- **Location:** `nolsaf/apps/api/src/index.ts` (line 55-58)
- **Fix Status:** ⬜ Not Started
- **Fix File:** `nolsaf/apps/api/src/routes/codes.ts` (NEW)

#### 4. **Driver Payouts Missing Auth Headers**
- **Issue:** Frontend doesn't set Authorization headers for `/api/driver/payouts`
- **Risk:** Anonymous access or forced security relaxation
- **Location:** `nolsaf/apps/web/app/(driver)/driver/payouts/page.tsx` (line 38)
- **Fix Status:** ⬜ Not Started
- **Fix File:** `nolsaf/apps/web/app/(driver)/driver/payouts/page.tsx`

### High Priority

#### 5. **Admin Search Route Not Registered**
- **Issue:** Route file exists but not registered in server
- **Risk:** Frontend calls fail, may lead to insecure workarounds
- **Location:** 
  - Route: `nolsaf/apps/api/src/routes/admin.search.ts` (exists)
  - Registration: Missing in `nolsaf/apps/api/src/index.ts`
- **Fix Status:** ⬜ Not Started

#### 6. **Admin Analytics Search Missing**
- **Issue:** Frontend calls `/admin/analytics/search` but only `/admin/analytics/event` exists
- **Risk:** Log injection, event flooding
- **Location:** 
  - Frontend: `nolsaf/apps/web/app/(admin)/admin/properties/page.tsx` (line 155)
  - Backend: `nolsaf/apps/api/src/routes/admin.analytics.event.ts`
- **Fix Status:** ⬜ Not Started

#### 7. **Owner Bookings Endpoints Missing**
- **Issue:** `/owner/bookings/checked-in` and `/owner/bookings/recent` not implemented
- **Risk:** Developers may expose raw database queries
- **Location:** 
  - Frontend: `nolsaf/apps/web/app/(owner)/owner/bookings/checked-in/page.tsx`
  - Backend: `nolsaf/apps/api/src/routes/owner.booking.ts` (missing routes)
- **Fix Status:** ⬜ Not Started

#### 8. **SQL Injection Risk in Booking Confirmations**
- **Issue:** Raw SQL with JSON stringification in booking check-in
- **Risk:** SQL injection if Prisma parameterization fails
- **Location:** `nolsaf/apps/api/src/routes/owner.booking.ts` (lines 92-97, 136-140)
- **Fix Status:** ⬜ Not Started

#### 9. **Socket.IO Broadcast Without Authorization**
- **Issue:** Socket events broadcast to all connected clients without filtering
- **Risk:** Unauthorized access to booking/invoice data
- **Location:** `nolsaf/apps/api/src/routes/owner.booking.ts` (lines 148, 226)
- **Fix Status:** ⬜ Not Started

---

## 🟡 Missing API Routes

### Public Routes (Must Implement)

| Route | Method | Purpose | Frontend Usage | Status |
|-------|--------|---------|----------------|--------|
| `/api/public/properties` | GET | List all approved properties | `nolsaf/apps/public/app/page.tsx` | ⬜ Missing |
| `/api/public/properties/:id` | GET | Get single property details | `nolsaf/apps/public/app/property/[id]/page.tsx` | ⬜ Missing |

### Admin Routes (Registration Missing)

| Route | Method | Purpose | Route File | Registration | Status |
|-------|--------|---------|------------|-------------|--------|
| `/admin/search` | GET | Search owners, drivers, users, properties, bookings | `admin.search.ts` ✅ | Missing in `index.ts` | ⬜ Not Registered |
| `/admin/analytics/search` | POST | Track search analytics | Missing | Missing | ⬜ Missing |

### Owner Routes (Implementation Missing)

| Route | Method | Purpose | Frontend Usage | Status |
|-------|--------|---------|----------------|--------|
| `/owner/bookings/checked-in` | GET | List checked-in bookings | `owner/bookings/checked-in/page.tsx` | ⬜ Missing |
| `/owner/bookings/recent` | GET | List recent bookings | `owner/bookings/recent/page.tsx` | ⬜ Missing |

### Driver Routes (Verify Registration)

| Route | Method | Purpose | Route File | Status |
|-------|--------|---------|------------|--------|
| `/api/driver/payouts` | GET | Get driver payouts | `driver.stats.ts` ✅ | ✅ Exists (verify access) |

---

## 🟠 Incomplete Implementations

### 1. Booking Creation (Stub)
- **File:** `nolsaf/apps/api/src/routes/bookings.ts`
- **Issue:** Returns mock data, doesn't persist to database
- **Required:**
  - ✅ Validate input (Zod schema)
  - ✅ Check property availability
  - ✅ Create Booking record
  - ✅ Generate CheckinCode
  - ✅ Return proper response
- **Status:** ⬜ Not Started

### 2. Codes Search (Stub)
- **File:** `nolsaf/apps/api/src/index.ts` (line 55-58)
- **Issue:** TODO comment, no implementation
- **Required:**
  - ✅ Authentication middleware
  - ✅ Rate limiting (already has `limitCodeSearch`)
  - ✅ Search logic in CheckinCode table
  - ✅ Return matching codes with booking info
- **Status:** ⬜ Not Started

---

## 🔵 Frontend-Backend Mismatches

### API Calls to Non-Existent Endpoints

| Frontend File | API Call | Expected Response | Actual Status |
|---------------|----------|-------------------|---------------|
| `public/app/page.tsx` | `GET /api/public/properties` | `{ items: Property[] }` | ❌ 404 |
| `public/app/property/[id]/page.tsx` | `GET /api/public/properties/:id` | `{ item: Property }` | ❌ 404 |
| `admin/home/page.tsx` | `GET /api/admin/search?q=...` | `Array<SearchResult>` | ❌ 404 (not registered) |
| `admin/properties/page.tsx` | `POST /admin/analytics/search` | `{ ok: true }` | ❌ 404 |
| `owner/bookings/checked-in/page.tsx` | `GET /owner/bookings/checked-in` | `Array<Booking>` | ❌ 404 |
| `owner/bookings/recent/page.tsx` | `GET /owner/bookings/recent` | `Array<Booking>` | ❌ 404 |
| `driver/payouts/page.tsx` | `GET /api/driver/payouts` | `{ items: Payout[] }` | ⚠️ Verify |

---

## 📊 Fix Priority Matrix

### Priority 1: Critical Security (Fix First)
1. ✅ Implement public properties routes with proper filtering
2. ✅ Fix booking creation endpoint (validation + persistence)
3. ✅ Implement codes search with auth + rate limiting
4. ✅ Fix driver payouts auth headers
5. ✅ Register admin search route

### Priority 2: High Priority Features (Fix Second)
6. ✅ Implement owner bookings endpoints
7. ✅ Add admin analytics search endpoint
8. ✅ Fix SQL injection risks in booking confirmations
9. ✅ Add Socket.IO authorization

### Priority 3: Code Quality (Fix Third)
10. ✅ Add input validation (Zod schemas)
11. ✅ Add error handling
12. ✅ Add logging
13. ✅ Add unit tests

---

## ✅ Implementation Checklist

### Phase 1: Security Fixes (Week 1)

#### Day 1-2: Public Routes
- [ ] Create `nolsaf/apps/api/src/routes/public.properties.ts`
- [ ] Implement `GET /api/public/properties` (filter: status=APPROVED only)
- [ ] Implement `GET /api/public/properties/:id` (filter: status=APPROVED only)
- [ ] Register routes in `index.ts` (NO auth required, public access)
- [ ] Add rate limiting for public routes
- [ ] Test with frontend

#### Day 3: Booking Endpoint
- [ ] Create Zod schema for booking validation
- [ ] Add property availability check
- [ ] Implement database persistence
- [ ] Generate CheckinCode
- [ ] Add proper error handling
- [ ] Test booking flow

#### Day 4: Codes Search
- [ ] Create `nolsaf/apps/api/src/routes/codes.ts`
- [ ] Move `/codes/search` from `index.ts` to new route file
- [ ] Add authentication middleware
- [ ] Implement search logic (CheckinCode table)
- [ ] Add proper rate limiting
- [ ] Test search functionality

#### Day 5: Auth Fixes
- [ ] Fix driver payouts auth headers
- [ ] Register admin search route
- [ ] Verify all routes have proper auth middleware
- [ ] Test authentication flow

### Phase 2: Missing Features (Week 2)

#### Day 1-2: Owner Bookings
- [ ] Implement `GET /owner/bookings/checked-in` in `owner.booking.ts`
- [ ] Implement `GET /owner/bookings/recent` in `owner.booking.ts`
- [ ] Add proper filtering (owner's properties only)
- [ ] Add pagination
- [ ] Test with frontend

#### Day 3: Admin Analytics
- [ ] Add `POST /admin/analytics/search` to `admin.analytics.event.ts`
- [ ] Add input validation
- [ ] Add rate limiting
- [ ] Test analytics tracking

#### Day 4-5: SQL Injection Fixes
- [ ] Review all `$executeRaw` usage
- [ ] Ensure all parameters are properly parameterized
- [ ] Add input sanitization for JSON fields
- [ ] Test SQL injection attempts

### Phase 3: Socket.IO Security (Week 3)

#### Day 1-2: Socket Authorization
- [ ] Implement Socket.IO authentication middleware
- [ ] Add room-based authorization (admin-only rooms)
- [ ] Filter broadcast events by user role
- [ ] Test Socket.IO security

#### Day 3-5: Testing & Documentation
- [ ] Write unit tests for all new routes
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Security audit

---

## 🧪 Testing Requirements

### Unit Tests Required

1. **Public Properties Routes**
   - Test: Only approved properties returned
   - Test: Rejected/draft properties filtered out
   - Test: Pagination works
   - Test: Rate limiting works

2. **Booking Creation**
   - Test: Valid booking creates DB record
   - Test: Invalid input rejected
   - Test: Property availability checked
   - Test: CheckinCode generated

3. **Codes Search**
   - Test: Authentication required
   - Test: Rate limiting enforced
   - Test: Search returns correct results
   - Test: Unauthorized access blocked

4. **Owner Bookings**
   - Test: Only owner's properties returned
   - Test: Pagination works
   - Test: Filtering by status works

### Integration Tests Required

1. **End-to-End Booking Flow**
   - Guest books property → Booking created → Code generated → Owner validates → Check-in confirmed

2. **Payment Flow**
   - Owner creates invoice → Admin verifies → Payment processed → Owner receives payout

3. **Security Tests**
   - Unauthorized access attempts
   - SQL injection attempts
   - Rate limiting enforcement
   - Socket.IO authorization

---

## 📝 Code Standards

### Route Implementation Template

```typescript
// nolsaf/apps/api/src/routes/example.ts
import { Router } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

export const router = Router();

// Schema validation
const createSchema = z.object({
  // Define schema
});

// Route handler
router.post("/", requireAuth, requireRole("OWNER"), async (req, res) => {
  try {
    // 1. Validate input
    const body = createSchema.parse(req.body);
    
    // 2. Check permissions
    const user = (req as AuthedRequest).user!;
    
    // 3. Business logic
    const result = await prisma.model.create({
      data: { /* ... */ }
    });
    
    // 4. Return response
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
```

### Route Registration Template

```typescript
// nolsaf/apps/api/src/index.ts
import exampleRouter from "./routes/example";

// Register route
app.use("/api/example", requireAuth, requireRole("OWNER"), exampleRouter);
```

---

## 🔍 Security Checklist

Before deploying any route:

- [ ] Input validation (Zod schema)
- [ ] Authentication middleware
- [ ] Authorization check (role-based)
- [ ] Rate limiting (if public or sensitive)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize output)
- [ ] CORS configuration
- [ ] Error handling (no sensitive info leaked)
- [ ] Logging (audit trail)
- [ ] Testing (unit + integration)

---

## 📈 Progress Tracking

### Overall Progress: 0% Complete

- **Security Fixes:** 0/9 (0%)
- **Missing Routes:** 0/6 (0%)
- **Incomplete Implementations:** 0/2 (0%)
- **Frontend Fixes:** 0/1 (0%)

### Current Sprint: Phase 1 - Security Fixes

**Started:** [Date]  
**Target Completion:** [Date + 5 days]  
**Status:** Not Started

---

## 🚨 Critical Notes

1. **DO NOT** deploy to production until all Critical Security issues are fixed
2. **DO NOT** expose admin endpoints without authentication
3. **ALWAYS** validate and sanitize user input
4. **ALWAYS** use parameterized queries (Prisma handles this, but verify)
5. **ALWAYS** test authentication and authorization
6. **ALWAYS** add rate limiting to public endpoints

---

## 📞 Contact & Resources

- **Project:** NoLSAF Monorepo
- **Database Schema:** `nolsapp.session.sql`
- **API Base:** `nolsaf/apps/api/src/`
- **Frontend Base:** `nolsaf/apps/web/app/`
- **Prisma Schema:** `nolsaf/packages/prisma/`

---

**Next Steps:** Start with Phase 1, Day 1-2: Implement public properties routes.

