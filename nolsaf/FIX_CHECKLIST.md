# Quick Fix Checklist

Use this checklist to track progress on each fix.

## 🔴 Critical Security (Fix First)

### 1. Public Properties Routes
- [ ] Create `nolsaf/apps/api/src/routes/public.properties.ts`
- [ ] Implement GET `/api/public/properties` (approved only)
- [ ] Implement GET `/api/public/properties/:id` (approved only)
- [ ] Register in `index.ts`: `app.use('/api/public/properties', publicPropertiesRouter)`
- [ ] Add rate limiting
- [ ] Test: Only approved properties visible
- [ ] Test: Draft/rejected properties hidden

### 2. Booking Creation Fix
- [ ] Create Zod schema in `bookings.ts`
- [ ] Add property availability check
- [ ] Implement database persistence (Booking + CheckinCode)
- [ ] Remove mock data return
- [ ] Add proper error handling
- [ ] Test: Booking creates DB record
- [ ] Test: Invalid input rejected

### 3. Codes Search Implementation
- [ ] Create `nolsaf/apps/api/src/routes/codes.ts`
- [ ] Move `/codes/search` from `index.ts` to new file
- [ ] Add `requireAuth` middleware
- [ ] Implement search in CheckinCode table
- [ ] Add rate limiting (already has `limitCodeSearch`)
- [ ] Test: Auth required
- [ ] Test: Search works correctly

### 4. Driver Payouts Auth
- [ ] Fix `driver/payouts/page.tsx` line 38
- [ ] Add `Authorization` header to fetch
- [ ] Test: Authenticated requests work
- [ ] Test: Unauthenticated requests fail

### 5. Admin Search Registration
- [ ] Add to `index.ts`: `app.use('/admin/search', requireAuth, requireRole('ADMIN'), adminSearchRouter)`
- [ ] Also add: `app.use('/api/admin/search', requireAuth, requireRole('ADMIN'), adminSearchRouter)`
- [ ] Test: Search works from frontend

## 🟡 High Priority Features

### 6. Owner Bookings - Checked-In
- [ ] Add to `owner.booking.ts`:
  ```typescript
  router.get("/checked-in", async (req, res) => {
    const user = (req as AuthedRequest).user!;
    const bookings = await prisma.booking.findMany({
      where: {
        property: { ownerId: user.id },
        status: "CHECKED_IN"
      },
      include: { property: true, code: true }
    });
    res.json(bookings);
  });
  ```
- [ ] Test: Only owner's bookings returned

### 7. Owner Bookings - Recent
- [ ] Add to `owner.booking.ts`:
  ```typescript
  router.get("/recent", async (req, res) => {
    const user = (req as AuthedRequest).user!;
    const limit = Number(req.query.limit) || 20;
    const bookings = await prisma.booking.findMany({
      where: { property: { ownerId: user.id } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { property: true }
    });
    res.json(bookings);
  });
  ```
- [ ] Test: Recent bookings returned

### 8. Admin Analytics Search
- [ ] Add to `admin.analytics.event.ts`:
  ```typescript
  router.post("/search", async (req, res) => {
    const { query, timestamp } = req.body;
    // Log search event
    console.info('[admin-analytics-search]', { query, timestamp, user: (req as any).user?.id });
    res.json({ ok: true });
  });
  ```
- [ ] Register: Already registered via `/admin/analytics/event`
- [ ] Test: Search events logged

### 9. SQL Injection Fix
- [ ] Review `owner.booking.ts` lines 92-97, 136-140
- [ ] Verify Prisma `$executeRaw` uses tagged templates (✅ already safe)
- [ ] Add JSON sanitization if needed
- [ ] Test: SQL injection attempts fail

### 10. Socket.IO Authorization
- [ ] Add Socket.IO auth middleware
- [ ] Filter broadcasts by user role
- [ ] Test: Only authorized users receive events

## ✅ Verification Steps

After each fix:
- [ ] Code compiles (no TypeScript errors)
- [ ] Route registered in `index.ts`
- [ ] Frontend can call endpoint
- [ ] Authentication works
- [ ] Authorization works
- [ ] Error handling works
- [ ] Rate limiting works (if applicable)

## 🧪 Testing Commands

```bash
# Start API
cd nolsaf/apps/api
pnpm dev

# Start Web
cd nolsaf/apps/web
pnpm dev

# Test public properties
curl http://localhost:4000/api/public/properties

# Test booking (with auth token)
curl -X POST http://localhost:4000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"propertyId": 1, "checkIn": "2025-01-20", "checkOut": "2025-01-22"}'
```

