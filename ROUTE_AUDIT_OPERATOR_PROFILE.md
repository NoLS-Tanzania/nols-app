# Operator Profile Review Routes - Audit & Conflict Analysis

## Executive Summary

**⚠️ CRITICAL ISSUE FOUND**: The frontend calls `POST /api/agent/operator-profile/submit` but this endpoint **does not exist** in the backend. This will cause 404 errors when agents try to submit their profiles.

**Route Consolidation Status**: Multiple endpoints handle operator profile operations with potential overlaps and missing implementations.

---

## 1. Complete Route Map

### A. Agent-Side Routes (Save & Submit Profile)

**File**: `d:\nolsapp2.1\nolsaf\apps\api\src\routes\agent.assignments.ts` (lines 256-280)

#### ✅ PATCH `/api/agent/operator-profile`
- **Purpose**: Agent saves profile as DRAFT
- **Handler**: Authenticated agent only
- **Input Schema**: `operatorProfileSchema` (zod validated)
- **Validation**: 25+ fields validated (companyName, contactPhone, packageItems, classifiedPhotos, etc.)
- **Database**: Updates `Agent.operatorProfile` JSON field
- **Response**: Returns updated agent with operatorProfile
- **Status**: ✅ IMPLEMENTED AND WORKING

#### ❌ POST `/api/agent/operator-profile/submit` (MISSING!)
- **Purpose**: Agent submits profile for admin review
- **Frontend Call**: [Frontend calls this](d:\nolsapp2.1\nolsaf\apps\web\app\account\agent\profile\page.tsx#L719)
  ```tsx
  const res = await api.post("/api/agent/operator-profile/submit");
  ```
- **Expected Behavior**:
  - Validate profile has required fields
  - Set review status to "PENDING" or "SUBMITTED"
  - Create audit log entry
  - Return updated agent with review status
- **Actual Status**: ❌ **ENDPOINT DOES NOT EXIST** → Will return 404
- **Impact**: Agents cannot submit profiles for admin review (workflow broken)

---

### B. Admin-Side Routes (Review & Approve)

**File**: `d:\nolsapp2.1\nolsaf\apps\api\src\routes\admin.agents.ts` (lines 1280-1407)

#### ✅ GET `/api/admin/agents/:id/packages`
- **Purpose**: Admin fetches packages from submitted profile
- **Handler**: Admin only
- **Logic**: Extracts `operatorProfile.packageItems` array
- **Returns**: Normalized package objects with id, title, destination, duration, category, minPax, maxPax, pricePerPerson, currency, status, createdAt
- **Status**: ✅ IMPLEMENTED (Recently added)
- **Uses**: Called by admin agents/[id]/page.tsx to display submitted profile packages

#### ✅ PATCH `/api/admin/agents/:id/profile-review`
- **Purpose**: Admin approves or rejects submitted profile
- **Handler**: Admin only
- **Input Schema**: `updateProfileReviewSchema` with status ("APPROVED" | "REJECTED") and optional reason
- **Database Updates**:
  - Nested: `Agent.operatorProfile.review = {status, reason, reviewedAt, reviewedByAdminId}`
  - Flat: `Agent.reviewStatus`, `Agent.reviewReason`, `Agent.reviewedAt`, `Agent.reviewedByAdminId` (backward compat)
- **Audit**: Creates AdminAudit entry with action "APPROVE_OPERATOR_PROFILE" or "REJECT_OPERATOR_PROFILE"
- **Response**: Returns updated agent with review status
- **Status**: ✅ IMPLEMENTED (Recently added)
- **Uses**: Called by admin agents/[id]/page.tsx "Submitted Profile" tab to approve/reject

---

### C. Tour Commerce/Dashboard Routes

**File**: `d:\nolsapp2.1\nolsaf\apps\api\src\routes\admin.tourCommerce.ts`

#### ⚠️ `profileReadiness()` Function
- **Purpose**: Calculates if submitted profile is "ready" for admin review
- **Checks**: 
  - packageItems array populated
  - documentProofs (if required)
  - classifiedPhotos.vehicles populated
  - Profile description present
- **Issue**: May duplicate validation logic from submit endpoint
- **No dedicated route**: This is utility logic, not an endpoint
- **Status**: ⚠️ NEEDS CONSOLIDATION

---

## 2. Data Structure Consistency

### Submitted Profile Storage

Location: `Agent.operatorProfile` (Prisma JSON field)

**Current Structure**:
```typescript
operatorProfile: {
  companyName: string
  operatingRegions: string[]
  packageItems: {
    id: string
    title: string
    destination: string
    duration: string
    category: string
    minPax: number
    maxPax: number
    pricePerPerson: number
    currency: string
    status: string
    createdAt: string
  }[]
  classifiedPhotos: Record<string, string[]>
  gallery: string[]
  vehicles: any[]
  services: string[]
  addOns: string[]
  tourismTypes: string[]
  tools: string[]
  
  // Review metadata (nested)
  review?: {
    status: "APPROVED" | "REJECTED" | "PENDING"?
    reason?: string
    reviewedAt?: string (ISO)
    reviewedByAdminId?: number
  }
}
```

**Backward Compatibility Fields** (flat):
- `Agent.reviewStatus` - mirrors `operatorProfile.review.status`
- `Agent.reviewReason` - mirrors `operatorProfile.review.reason`
- `Agent.reviewedAt` - mirrors `operatorProfile.review.reviewedAt`
- `Agent.reviewedByAdminId` - mirrors `operatorProfile.review.reviewedByAdminId`

---

## 3. Route Conflicts & Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Missing Submit Endpoint** | 🔴 CRITICAL | Frontend calls `POST /api/agent/operator-profile/submit` but endpoint doesn't exist in backend |
| **Status Inconsistency** | 🟡 MEDIUM | Profile review status stored in both nested (`operatorProfile.review.status`) and flat fields (`reviewStatus`) - potential sync issues |
| **Validation Duplication** | 🟡 MEDIUM | `profileReadiness()` in tourCommerce.ts may duplicate `operatorProfileSchema` validation |
| **No Status Values Defined** | 🟡 MEDIUM | Frontend doesn't have defined enum for review statuses (PENDING, APPROVED, REJECTED, CHANGES_REQUESTED?) |
| **Missing Field Validation** | 🟠 LOW | Submit endpoint should validate required fields (companyName, contactEmail, packageItems, etc.) before accepting |
| **tmp_fix_admin_profile.js** | 🟠 LOW | Temporary patch file exists but role unclear - appears to be UI patch for profile card, status: stale/unmerged |

---

## 4. Recommended Consolidation

### Option A: Add Missing Submit Endpoint (Recommended)

Create: `POST /api/agent/operator-profile/submit` in `agent.assignments.ts`

```typescript
// POST /api/agent/operator-profile
// Agent submits profile for admin review
router.post(
  "/operator-profile/submit",
  requireRole("AGENT") as RequestHandler,
  asyncHandler(async (req: any, res) => {
    const gate = await getActiveAgent(req as AuthedRequest);
    if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error, message: gate.message });

    const agent = gate.agent;
    const profile = agent?.operatorProfile || {};
    
    // Validate required fields
    const requiredFields = ['companyName', 'contactEmail', 'contactPhone'];
    const missing = requiredFields.filter(f => !profile[f] || String(profile[f]).trim() === '');
    
    if (missing.length > 0) {
      return res.status(400).json({
        ok: false,
        error: "incomplete_profile",
        missing,
        message: `Profile incomplete. Missing: ${missing.join(', ')}`
      });
    }

    // Update profile with submission metadata
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        operatorProfile: {
          ...profile,
          review: {
            status: "PENDING",
            submittedAt: new Date().toISOString()
          }
        }
      },
      select: { id: true, operatorProfile: true, updatedAt: true }
    });

    // Create audit entry
    await audit(req.user?.id, "SUBMIT_OPERATOR_PROFILE", {
      agentId: agent.id,
      submitted: new Date().toISOString()
    });

    return res.json({ ok: true, agent: updated });
  })
);
```

**Impact**: ✅ Fixes agent workflow, enables profile submission

---

### Option B: Standardize Review Status Handling

**Choose ONE approach**:

1. **Nested Only** (Recommended for clean Prisma):
   - Remove flat fields `reviewStatus`, `reviewReason`, `reviewedAt`, `reviewedByAdminId`
   - Always use `operatorProfile.review.status`
   - Pro: Single source of truth
   - Con: Migration needed if flat fields used elsewhere

2. **Flat Only** (Legacy approach):
   - Keep `Agent.reviewStatus`, `Agent.reviewReason`, etc. as primary
   - Don't store in `operatorProfile.review`
   - Pro: Easier queries
   - Con: Duplicates data

3. **Hybrid** (Current):
   - Keep both synced via database triggers or application logic
   - Add validation to prevent sync failures
   - Pro: Maximum compatibility
   - Con: Maintenance complexity

---

### Option C: Consolidate Validation Logic

**Current**: Validation spread across:
- `operatorProfileSchema` in agent.assignments.ts (line 50)
- `profileReadiness()` in admin.tourCommerce.ts

**Recommendation**:
- Create shared `validateOperatorProfile()` function in utils
- Call from both agent submit and admin readiness check
- Central place to define required fields

---

## 5. Files Involved

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| agent.assignments.ts | Backend | 50-280 | ✅ Agent profile PATCH, ❌ Submit missing |
| admin.agents.ts | Backend | 1280-1407 | ✅ Admin packages GET, ✅ Profile review PATCH |
| admin.tourCommerce.ts | Backend | ? | ⚠️ profileReadiness() validation logic |
| agent/profile/page.tsx | Frontend | 700-730 | ✅ Calls PATCH, 🔴 Calls missing POST /submit |
| admin/agents/[id]/page.tsx | Frontend | 300-400 | ✅ Displays profile, ✅ Calls admin review endpoints |
| tmp_fix_admin_profile.js | Patch | N/A | 🟠 Stale UI patch - unclear status |

---

## 6. Implementation Priority

### 🔴 CRITICAL (Do First)
1. **Add POST `/api/agent/operator-profile/submit` endpoint**
   - File: agent.assignments.ts
   - Time: ~30 min
   - Blocks: Entire agent profile submission workflow

### 🟡 HIGH (Do Next)
2. **Define review status enum**
   - Add to schema
   - Ensure PENDING, APPROVED, REJECTED are handled
   - Time: ~15 min

3. **Consolidate validation logic**
   - Extract `validateOperatorProfile()` to utils
   - Time: ~20 min

### 🟠 MEDIUM (Do After)
4. **Clean up tmp_fix_admin_profile.js**
   - Determine if patch should be applied/merged/deleted
   - Time: ~10 min

5. **Resolve flat vs nested field debate**
   - Decide on standardization approach
   - Time: Discussion + Migration

---

## 7. Verification Checklist

After implementing, verify:

- [ ] POST `/api/agent/operator-profile/submit` returns 400 if profile incomplete
- [ ] POST `/api/agent/operator-profile/submit` creates audit entry
- [ ] Admin sees "Submitted Profile" tab with review status
- [ ] Admin can approve/reject with reason
- [ ] Agent sees rejection reason in profile editor
- [ ] Agent can resubmit after rejection
- [ ] PATCH and POST both validate operatorProfileSchema
- [ ] No 404 errors from frontend calls

---

## 8. Related Routes (Not Conflicting)

These are separate workflows, no consolidation needed:

- `PUT /api/account/profile` - Generic user profile updates
- `GET /api/driver/profile` - Driver-specific profile (different entity)
- `PATCH /api/admin/agents/:id` - Agent metadata (status, level, etc.) - different from operatorProfile
- `POST /api/agent/notify-admin` - Message notifications
- `POST /api/agent/revenues/claim` - Payout requests

---

**Generated**: Route audit report
**Next Action**: Implement missing POST /api/agent/operator-profile/submit endpoint
