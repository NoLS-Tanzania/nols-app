# Quick Start: Fixing NoLSAF Issues

## 🎯 Goal
Fix all security vulnerabilities and missing features systematically.

## 📁 Workspace Files Created

1. **`WORKSPACE_FIXES.md`** - Comprehensive workspace with all issues, priorities, and implementation plan
2. **`FIX_CHECKLIST.md`** - Quick checklist for tracking fixes
3. **`apps/api/src/routes/_TEMPLATE.ts`** - Template for creating new routes

## 🚀 Start Here

### Step 1: Review Current State
```bash
# Read the workspace document
cat nolsaf/WORKSPACE_FIXES.md

# Check what's missing
cat nolsaf/FIX_CHECKLIST.md
```

### Step 2: Start with Critical Security (Priority 1)

#### Fix 1: Public Properties Routes (2-3 hours)

**Create the route file:**
```bash
# Copy template
cp nolsaf/apps/api/src/routes/_TEMPLATE.ts nolsaf/apps/api/src/routes/public.properties.ts
```

**Then implement:**
- `GET /api/public/properties` - List approved properties only
- `GET /api/public/properties/:id` - Get single approved property

**Register in `index.ts`:**
```typescript
import publicPropertiesRouter from './routes/public.properties';
app.use('/api/public/properties', publicPropertiesRouter); // NO auth - public route
```

#### Fix 2: Booking Creation (2-3 hours)

**File:** `nolsaf/apps/api/src/routes/bookings.ts`

**Replace stub with:**
- Zod validation schema
- Property availability check
- Database persistence (Booking + CheckinCode)
- Proper error handling

#### Fix 3: Codes Search (1-2 hours)

**Create:** `nolsaf/apps/api/src/routes/codes.ts`

**Move from `index.ts` and implement:**
- Authentication required
- Search logic in CheckinCode table
- Rate limiting (already has middleware)

#### Fix 4: Driver Payouts Auth (15 minutes)

**File:** `nolsaf/apps/web/app/(driver)/driver/payouts/page.tsx`

**Change line 38:**
```typescript
// BEFORE
const res = await fetch("/api/driver/payouts");

// AFTER
const token = localStorage.getItem("token");
const res = await fetch("/api/driver/payouts", {
  headers: token ? { "Authorization": `Bearer ${token}` } : {}
});
```

#### Fix 5: Admin Search Registration (5 minutes)

**File:** `nolsaf/apps/api/src/index.ts`

**Add after line 142:**
```typescript
import adminSearchRouter from './routes/admin.search';
app.use('/admin/search', requireRole('ADMIN') as express.RequestHandler, adminSearchRouter);
app.use('/api/admin/search', requireRole('ADMIN') as express.RequestHandler, adminSearchRouter);
```

### Step 3: High Priority Features (Priority 2)

#### Fix 6-7: Owner Bookings Endpoints (1-2 hours)

**File:** `nolsaf/apps/api/src/routes/owner.booking.ts`

**Add two new routes:**
- `GET /owner/bookings/checked-in`
- `GET /owner/bookings/recent`

#### Fix 8: Admin Analytics Search (30 minutes)

**File:** `nolsaf/apps/api/src/routes/admin.analytics.event.ts`

**Add new route:**
- `POST /admin/analytics/search`

## 📊 Progress Tracking

After each fix:
1. ✅ Mark checkbox in `FIX_CHECKLIST.md`
2. ✅ Test the endpoint
3. ✅ Update progress in `WORKSPACE_FIXES.md`
4. ✅ Commit with descriptive message

## 🧪 Testing Each Fix

### Test Public Properties
```bash
# Should return only approved properties
curl http://localhost:4000/api/public/properties

# Should return single property if approved
curl http://localhost:4000/api/public/properties/1
```

### Test Booking Creation
```bash
# Should create booking in database
curl -X POST http://localhost:4000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": 1,
    "checkIn": "2025-01-20T14:00:00Z",
    "checkOut": "2025-01-22T11:00:00Z",
    "guestName": "Test Guest",
    "guestPhone": "+255123456789"
  }'
```

### Test Codes Search
```bash
# Should require auth
curl http://localhost:4000/codes/search?q=ABC123

# With auth
curl http://localhost:4000/codes/search?q=ABC123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Code Review Checklist

Before committing each fix:

- [ ] Input validation (Zod schema)
- [ ] Authentication middleware (if needed)
- [ ] Authorization check (role-based)
- [ ] Error handling
- [ ] No console.log with sensitive data
- [ ] TypeScript compiles without errors
- [ ] Route registered in `index.ts`
- [ ] Tested manually
- [ ] Follows template structure

## 🎯 Estimated Timeline

- **Day 1:** Fixes 1-2 (Public routes + Booking)
- **Day 2:** Fixes 3-5 (Codes search + Auth fixes)
- **Day 3:** Fixes 6-8 (Owner bookings + Analytics)
- **Day 4:** Testing & bug fixes
- **Day 5:** Documentation & final review

**Total:** ~5 days for all critical fixes

## 🔗 Related Files

- **Main Workspace:** `WORKSPACE_FIXES.md`
- **Checklist:** `FIX_CHECKLIST.md`
- **Route Template:** `apps/api/src/routes/_TEMPLATE.ts`
- **Server Registration:** `apps/api/src/index.ts`

## ⚠️ Important Notes

1. **Never skip authentication** on routes that access user data
2. **Always validate input** with Zod schemas
3. **Always filter by owner** in owner routes (prevent data leakage)
4. **Always filter by status** in public routes (only show approved)
5. **Test with real data** before marking as complete

---

**Ready to start?** Begin with Fix 1: Public Properties Routes.

