# Multi-Tenancy Quick Fixes - Critical Issues

## 🔴 CRITICAL PRIORITY 1: User Controller (HIGHEST RISK)

**File:** `backend/src/controllers/user.controller.js`

### Issue
Users from Business A can manage users from Business B because there's NO businessId filtering.

### Required Changes

#### Fix 1: getUsers() - Line 5-50
```javascript
// BEFORE (UNSAFE - Returns ALL users)
const users = await req.db.user.findMany({
  where,
  select: { ... }
});

// AFTER (SAFE - Returns only this business's users)
const users = await req.db.user.findMany({
  where: {
    businessId: req.user.businessId,  // ← ADD THIS
    ...where  // Existing conditions  
  },
  select: { ... }
});
```

#### Fix 2: getUser() - Line 60-100
```javascript
// BEFORE (UNSAFE - Fetches ANY user by ID)
const user = await req.db.user.findUnique({
  where: { id: parseInt(id) },
  select: { ... }
});

// AFTER (SAFE - Verifies user belongs to this business)
const user = await req.db.user.findUnique({
  where: { 
    id_businessId: {  // Use composite WHERE if schema supports, OR:
      id: parseInt(id),
    }
  },
  select: { ... }
});

// OR use findFirst with businessId filter:
const user = await req.db.user.findFirst({
  where: { 
    id: parseInt(id),
    businessId: req.user.businessId  // ← ADD THIS
  },
  select: { ... }
});
```

#### Fix 3: createUser() - Line 140-180
```javascript
// BEFORE (UNSAFE - User created without businessId)
const user = await req.db.user.create({
  data: {
    username: username.trim().toLowerCase(),
    passwordHash,
    // ... missing businessId!
  },
});

// AFTER (SAFE - User tied to current business)
const user = await req.db.user.create({
  data: {
    businessId: req.user.businessId,  // ← ADD THIS
    username: username.trim().toLowerCase(),
    passwordHash,
    // ...
  },
});
```

#### Fix 4: updateUser() - Line 260-310
Add businessId to WHERE clause:
```javascript
const updatedUser = await req.db.user.update({
  where: { 
    id: parseInt(id),
    businessId: req.user.businessId  // ← ADD THIS
  },
  data: updateData,
});
```

#### Fix 5: updateUserPermissions() - Line 340+
Add businessId filter to findUnique:
```javascript
const user = await req.db.user.findFirst({
  where: { 
    id: parseInt(id),
    businessId: req.user.businessId  // ← ADD THIS
  },
});
```

#### Fix 6: changeUserPassword() - Line 380+
Also needs businessId in findUnique WHERE clause

#### Fix 7: deactivateUser() / activateUser() / deleteUser() - Multiple
All update/delete operations must add businessId filter

---

## 🔴 CRITICAL PRIORITY 2: Materials Controller  

**File:** `backend/src/controllers/materials.controller.js`

### Issue
Users can see all materials from all businesses

### Required Changes (Pattern for ALL functions)

```javascript
// STANDARD PATTERN - Apply to ALL queries:

// READ operations:
const materials = await req.db.material.findMany({
  where: {
    businessId: req.user.businessId,  // ← ADD THIS
    // ... other conditions
  }
});

// CREATE operations:
const material = await req.db.material.create({
  data: {
    businessId: req.user.businessId,  // ← ADD THIS
    name: name.trim(),
    // ... other fields
  }
});

// UPDATE operations:
const material = await req.db.material.update({
  where: { 
    id: parseInt(id),
    businessId: req.user.businessId  // ← ADD THIS
  },
  data: updateData
});

// DELETE operations:
await req.db.material.delete({
  where: { 
    id: parseInt(id),
    businessId: req.user.businessId  // ← ADD THIS
  }
});
```

### Functions Affected
1. getMaterials() - Line 5
2. getMaterial() - Line 40  
3. createMaterial() - Line 79
4. updateMaterial() - ~Line 200
5. deleteMaterial() - ~Line 300
6. getLowStockMaterials() - ~Line 400
7. reorderMaterial() - ~Line 500
8. getMaterialReorders() - ~Line 600
9. bulkReorderMaterials() - ~Line 700

---

## 🔴 CRITICAL PRIORITY 3: Jobs Controller

**File:** `backend/src/controllers/jobs.controller.js`

### Key Issue
Jobs can be accessed/manipulated across business boundaries

### Critical Function: createJob() - Line 1-200
```javascript
// BEFORE (UNSAFE - Material lookup has no businessId)
const inventoryMaterial = await req.db.material.findUnique({
  where: { id: parseInt(material.materialId) },
});

// AFTER (SAFE)
const inventoryMaterial = await req.db.material.findUnique({
  where: { 
    id: parseInt(material.materialId),
    businessId: req.user.businessId  // ← ADD THIS
  },
});

// AND in job creation:
const job = await tx.job.create({
  data: {
    businessId: req.user.businessId,  // ← ADD THIS
    jobType,
    // ... other fields
  },
});
```

### Functions to Fix
- createJob() - 3 places (material lookup, job creation, auditLog)
- updateJob() - 2+ places (job update, material updates, auditLog)
- getJobs() - Add WHERE businessId filter
- getJob() - Add businessId verification
- deleteJob() - Add businessId to WHERE clause

---

## 🔴 CRITICAL PRIORITY 4: Invoice Controller

**File:** `backend/src/controllers/invoice.controller.js`

### Critical Issue
generateInvoice() fetches jobs without businessId verification

```javascript
// BEFORE (UNSAFE)
const job = await req.db.job.findUnique({
  where: { id: parseInt(jobId) },
  include: { ... }
});

// AFTER (SAFE)
const job = await req.db.job.findUnique({
  where: { 
    id: parseInt(jobId),
    businessId: req.user.businessId  // ← ADD THIS
  },
  include: { ... }
});

// AND in invoice creation:
const invoice = await tx.invoice.create({
  data: {
    businessId: req.user.businessId,  // ← ADD THIS
    jobId: parseInt(jobId),
    // ... other fields
  },
});
```

---

## 🔴 CRITICAL PRIORITY 5: Payment & Receipt Controllers

**Files:** 
- `backend/src/controllers/payment.controller.js`
- `backend/src/controllers/receipt.controller.js`

### Pattern for Both
Every invoice/payment lookup needs businessId:

```javascript
const invoice = await req.db.invoice.findUnique({
  where: { 
    id: parseInt(invoiceId),
    businessId: req.user.businessId  // ← ADD THIS
  }
});

// Payment creation:
const payment = await tx.payment.create({
  data: {
    businessId: req.user.businessId,  // ← ADD THIS
    invoiceId: parseInt(invoiceId),
    // ... other fields
  }
});

// Receipt creation:
const receipt = await tx.receipt.create({
  data: {
    businessId: req.user.businessId,  // ← ADD THIS
    // ... other fields
  }
});

// AuditLog creation:
await tx.auditLog.create({
  data: {
    businessId: req.user.businessId,  // ← ADD THIS
    userId: req.user.id,
    // ... other fields
  }
});
```

---

## 🔴 CRITICAL PRIORITY 6: Report Controller (Financial Data)

**File:** `backend/src/controllers/report.controller.js`

### Issue
Reports show consolidated financial data from ALL businesses

### Critical Fix: Raw SQL Queries
```javascript
// BEFORE (UNSAFE)
const dailySales = await req.db.$queryRaw`
  SELECT DATE(sale_date)::TEXT as date, ...
  FROM sales
  WHERE status = 'completed'
    AND sale_date >= ${dateRange.gte}
    AND sale_date <= ${dateRange.lte}
`;

// AFTER (SAFE)
const dailySales = await req.db.$queryRaw`
  SELECT DATE(sale_date)::TEXT as date, ...
  FROM sales
  WHERE status = 'completed'
    AND business_id = ${req.user.businessId}  -- ← ADD THIS
    AND sale_date >= ${dateRange.gte}
    AND sale_date <= ${dateRange.lte}
`;
```

### All Aggregate Queries Need
```javascript
const where = {
  businessId: req.user.businessId,  // ← ADD THIS to initialwhere
  // ... other filters
};

// Then use in findMany, groupBy, aggregate:
const sales = await req.db.sale.findMany({ where, ... });
const groupBy = await req.db.sale.groupBy({ 
  by: [...],
  where,  // ← Ensure businessId is in where
  ...
});
```

---

## 🟡 MEDIUM PRIORITY: Customer & Bookings Controllers

### Customer Controller - `customer.controller.js`
- getCustomer(): Add WHERE businessId filter
- createCustomer(): Add businessId to data object
- updateCustomer(): Add businessId to WHERE clause

### Bookings Controller - `bookings.controller.js`
- getBookings(): Add WHERE businessId filter
- getBooking(): Add WHERE businessId filter
- updateBooking(): Add WHERE businessId filter

---

## Implementation Order

1. **Fix User Controller first** (most critical vulnerability)
2. **Fix Materials, Jobs, Invoice** (core business logic)  
3. **Fix Payment, Receipt** (financial records)
4. **Fix Reports** (data exposure)
5. **Fix Customer, Bookings** (consistency)

**Estimated Time:** 4-6 hours for all P1 & P2 fixes

---

## Verification Checklist

After each fix:
- [ ] Add WHERE businessId: req.user.businessId to SELECT/READ operations
- [ ] Add businessId: req.user.businessId to INSERT/CREATE operations
- [ ] Add businessId: req.user.businessId to UPDATE WHERE clauses
- [ ] Add businessId: req.user.businessId to DELETE WHERE clauses
- [ ] Test as User A - should see only User A's data
- [ ] Test as User B - should see only User B's data
- [ ] Cross-business access should return 404 or empty results

---

*This is a quick reference guide. See MULTI_TENANCY_AUDIT_REPORT.md for full details.*
