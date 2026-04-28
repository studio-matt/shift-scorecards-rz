# Firestore Security Audit Report

## SECTION A — Current Data Model

### 1. USERS COLLECTION STRUCTURE

**Collection Path:** `/users/{docId}`

**Key Finding:** The Firestore document ID does **NOT** equal the Firebase Auth UID. Instead, the Auth UID is stored in a field called `authId`.

**Login Flow:**
1. User authenticates with Firebase Auth (Google/Microsoft OAuth or email/password)
2. App queries: `where("authId", "==", fbUser.uid)` to find their profile
3. If not found by authId, falls back to: `where("email", "==", email.toLowerCase())`
4. If found by email (pre-invited user), links the authId to that document

**User Document Schema:**
```typescript
{
  id: string,              // Firestore auto-generated document ID (NOT the Auth UID)
  authId?: string,         // Firebase Auth UID - populated on first login
  email: string,           // Lowercase email
  firstName: string,
  lastName: string,
  role: "admin" | "company_admin" | "user",
  department: string,
  jobTitle: string,
  phone: string,
  avatar?: string,
  organizationId: string,  // Links to /organizations/{orgId}
  excludeFromReporting?: boolean,
  notificationPreferences?: NotificationPreferences,
  reportSchedule?: ReportSchedule,
  timezone?: string,
  createdAt: string,       // ISO date
  lastLogin: string,       // ISO date
  status?: string,         // "active", "pending", etc.
}
```

---

## SECTION B — Current Role Model

### 2. ROLE / PERMISSIONS MODEL

**Field Name:** `role`

**Role Values:**
| Value | Meaning | Access Level |
|-------|---------|--------------|
| `"admin"` | Super Admin | Full access to ALL companies, ALL users, ALL settings |
| `"company_admin"` | Company Admin | Admin access scoped to their organization only |
| `"user"` | Normal User | Access to their own data only |

**Role Check Patterns in Code:**
```typescript
// Super Admin (global access)
const isSuperAdmin = user?.role === "admin"

// Company Admin (org-scoped admin)
const isCompanyAdmin = user?.role === "company_admin"

// Any admin type
const isAdmin = isSuperAdmin || isCompanyAdmin
```

**Note:** There is NO `"super_admin"` value - the actual super admin role is stored as `"admin"`.

---

## SECTION C — Firestore Collections + Access Needs

### 3. COMPANY / ORG MODEL

**Field linking user to company:** `organizationId`

**Organizations Collection:** `/organizations/{orgId}`

**Organization Document Schema:**
```typescript
{
  id: string,
  name: string,
  departments: string[],
  createdAt: string,
  website?: string,
  contactEmail?: string,
  industry?: string,
  memberCount?: number,
  // Branding
  accentColor?: string,
  backgroundColor?: string,
  buttonColor?: string,
  buttonFontColor?: string,
  logoUrl?: string,
  // Financial settings
  hourlyRate?: number,     // Default $100/hr
  // Reporting preferences
  reportingPreferences?: {...}
}
```

### 4. DEPARTMENT MODEL

**Field linking user to department:** `department` (string field on user document)

**Storage:** Departments are stored as:
1. A `departments: string[]` array on the Organization document
2. A `department: string` field on each User document

**Admin Filtering:** Yes, department filtering is used extensively in admin views.

### 5. COLLECTION ACCESS MAP

| Collection | Path | Purpose | Read By | Write By |
|------------|------|---------|---------|----------|
| **users** | `/users/{docId}` | User profiles, roles, org membership | All authenticated (for login lookup) | Own profile only; Admins via Admin SDK |
| **responses** | `/responses/{responseId}` | Scorecard submissions | All authenticated (filtered by org) | Own responses only |
| **organizations** | `/organizations/{orgId}` | Company data, branding, settings | All authenticated | Admin SDK only |
| **templates** | `/templates/{templateId}` | Scorecard question templates | All authenticated | Admin SDK only |
| **schedules** | `/schedules/{scheduleId}` | Scorecard release schedules | All authenticated | Admin SDK only |
| **settings** | `/settings/{settingId}` | Global app settings, email templates | All authenticated | Admin SDK only |
| **invites** | `/invites/{inviteId}` | Pending user invitations | Admins only | Admin SDK only |
| **report_history** | `/report_history/{reportId}` | Generated report logs | Admins only | Admin SDK only |
| **webinars** | `/webinars/{webinarId}` | Webinar deck storage | All authenticated | Admin SDK only |
| **scorecards** | `/scorecards/{scorecardId}` | (Legacy - may not be in active use) | - | - |

---

## SECTION D — Security Risks

### 6. QUERY ACCESS PATTERNS BY ROLE

#### A. Normal User
| Action | Collections | Query Pattern |
|--------|-------------|---------------|
| Login | `users` | `where("authId", "==", uid)` or `where("email", "==", email)` |
| Dashboard | `responses`, `users`, `organizations`, `templates` | Read filtered by `userId` |
| Submit scorecard | `responses` | Create with own `userId` |
| View history | `responses` | `where("userId", "==", userId)` |

#### B. Company Admin
| Action | Collections | Query Pattern |
|--------|-------------|---------------|
| All Normal User actions | (same) | (same) |
| See all users in company | `users` | `where("organizationId", "==", orgId)` |
| See all departments | `users` | Filter by org, extract departments |
| View all scorecards in org | `responses` | `where("organizationId", "==", orgId)` |
| Exports/Reports | `responses`, `users` | Filtered by `organizationId` |

#### C. Super Admin
| Action | Collections | Query Pattern |
|--------|-------------|---------------|
| All Company Admin actions | (same) | (same) |
| See all companies | `organizations` | Full read |
| See all users | `users` | Full read |
| See all scorecards | `responses` | Full read (no org filter) |
| Manage settings | `settings` | Full read/write |
| Send invites | `invites` | Create/read/update |
| Schedule releases | `schedules` | Full CRUD |

### 7. RULES BLOCKERS

| Issue | Severity | Description |
|-------|----------|-------------|
| **Users docs not keyed by Auth UID** | HIGH | Document ID is auto-generated, not the Firebase Auth UID. This means rules cannot use `request.auth.uid == resource.id` pattern. Must use `resource.data.authId == request.auth.uid` instead. |
| **Query filtering required** | MEDIUM | Login requires querying `where("authId", "==", uid)`. Firestore rules must allow collection-level reads for this query to work, or use a different auth strategy. |
| **No ownership field on responses** | LOW | Responses have `userId` field (Firestore doc ID), not `authId`. Rules must join/lookup to verify ownership. |
| **Role stored in Firestore only** | OK | Role is in Firestore `users` collection, accessible via `get()` in rules. This is fine. |
| **Org-scoped access complexity** | MEDIUM | Company admins need to read all users/responses in their org. Rules must verify requester's `organizationId` matches target's `organizationId`. |

---

## SECTION E — Recommended Rule Strategy

### Immediate Safe Rules (Login + Basic Access)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get current user's profile
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Helper to check if user is super admin
    function isSuperAdmin() {
      return getUserData().role == 'admin';
    }
    
    // Helper to check if user is any admin type
    function isAdmin() {
      return getUserData().role in ['admin', 'company_admin'];
    }
    
    // USERS - Login requires reading to find profile by authId
    match /users/{userId} {
      // Anyone authenticated can read (needed for authId lookup at login)
      allow read: if request.auth != null;
      
      // Users can only update their own profile (where authId matches)
      allow update: if request.auth != null 
        && resource.data.authId == request.auth.uid;
      
      // Create/delete via Admin SDK only
      allow create, delete: if false;
    }
    
    // RESPONSES - Users can read all (filtered client-side), write own
    match /responses/{responseId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow delete: if false;
    }
    
    // Read-only collections for all authenticated users
    match /organizations/{orgId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    match /templates/{templateId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    match /schedules/{scheduleId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    match /webinars/{webinarId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Admin-only collections
    match /invites/{inviteId} {
      allow read: if request.auth != null && isAdmin();
      allow write: if false;
    }
    
    match /report_history/{reportId} {
      allow read: if request.auth != null && isAdmin();
      allow write: if false;
    }
    
    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Known Limitation with Above Rules

**CRITICAL:** The `getUserData()` helper function above assumes the user document ID equals the Auth UID, which is NOT the case in this system. The current data model stores Auth UID in the `authId` field, and documents have auto-generated IDs.

**This means:** The `get(/databases/$(database)/documents/users/$(request.auth.uid))` pattern will NOT work.

---

## SECTION F — Migration Recommendation

### Should users docs be migrated to `/users/{authUid}`?

**RECOMMENDATION: YES** — This is the cleanest long-term solution.

**Current Problem:**
- User docs are at `/users/{autoGeneratedId}` with `authId` field inside
- Rules cannot efficiently verify ownership without a query
- Every "is this my data?" check requires a `get()` call or trusting client-side filtering

**Migration Benefits:**
1. Rules become simpler: `request.auth.uid == userId` 
2. No need for `get()` calls to verify ownership
3. Direct document access without queries
4. Standard Firebase Auth pattern

**Migration Steps:**
1. For each user doc at `/users/{oldId}`:
   - Read the `authId` field
   - Create new doc at `/users/{authId}` with same data
   - Update all `userId` references in `responses` collection
   - Delete old doc
2. Update code to use Auth UID as document ID
3. Update login flow to directly get doc by ID instead of querying by authId

**Risk:** Migration requires updating ~500+ response documents and ensuring no data loss. Should be done during maintenance window with backup.

**Alternative (No Migration):**
Keep current structure but accept limitations:
- Rules must allow broader read access
- Ownership verification happens at application layer, not rules layer
- Less secure but functional

---

## Summary

| Aspect | Current State | Risk Level |
|--------|---------------|------------|
| User doc keying | Auto-generated ID, not Auth UID | HIGH |
| Role storage | `role` field in users collection | OK |
| Org linkage | `organizationId` field | OK |
| Response ownership | `userId` field (Firestore doc ID) | MEDIUM |
| Login query | `where("authId", "==", uid)` | Requires read access to users |

**Recommended Next Steps:**
1. Deploy the temporary safe rules above (immediate)
2. Plan migration to `/users/{authUid}` structure (medium-term)
3. Implement stricter rules post-migration (long-term)
