# Architecture Overview

This document describes the high-level architecture of the Goalo CRM platform.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                      Next.js App Router                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Pages      │  │  Components  │  │   Custom Hooks       │  │
│  │  (app/)      │  │  (components)│  │   (lib/hooks/)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Firebase Client SDK                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Firestore   │  │     Auth     │  │      Storage         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Firebase Backend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Firestore  │  │  Cloud Fns   │  │   Security Rules     │  │
│  │   Database   │  │  (functions/)│  │   (firestore.rules)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Boundaries

The application is organized into distinct feature modules:

### Core CRM Modules

| Module        | Path                         | Description                           |
| ------------- | ---------------------------- | ------------------------------------- |
| **Customers** | `/dashboard/customers`       | Customer management, contacts, notes  |
| **Leads**     | `/dashboard/leads`           | Lead capture, scoring, conversion     |
| **Invoices**  | `/dashboard/sales/invoices`  | Invoice creation and payment tracking |
| **Estimates** | `/dashboard/sales/estimates` | Quote generation                      |
| **Projects**  | `/dashboard/projects`        | Project and task management           |
| **Support**   | `/dashboard/support`         | Customer support tickets              |

### Platform Modules

| Module        | Path                   | Description                         |
| ------------- | ---------------------- | ----------------------------------- |
| **Dashboard** | `/dashboard`           | Home with widgets and quick stats   |
| **Setup**     | `/dashboard/setup`     | Organization settings, staff, roles |
| **Finance**   | `/dashboard/finance`   | Expenses, payments, categories      |
| **Marketing** | `/dashboard/marketing` | Campaigns, email templates          |

---

## Data Layer Architecture

### Custom Hooks Pattern

All data operations are encapsulated in custom hooks located in `lib/hooks/`:

```typescript
// Example: useCustomers hook pattern
const { customers, loading, error, createCustomer, updateCustomer } = useCustomers();
```

**Key hooks:**

- `useCustomers` - Customer CRUD operations
- `useLeads` - Lead management + conversion
- `useInvoices` - Invoice operations + payments
- `useProjects` - Project + task management
- `useSupport` - Support ticket handling

### Firestore Collections

```
firestore/
├── users/              # User profiles
├── organizations/      # Organization settings
├── customers/          # Customer records
│   └── {id}/notes/    # Customer notes (subcollection)
├── contacts/           # Contact persons
├── leads/              # Lead records
│   └── {id}/notes/    # Lead notes (subcollection)
├── invoices/           # Invoice records
├── estimates/          # Estimate records
├── projects/           # Project records
├── tasks/              # Task records
├── support_tickets/    # Support tickets
│   └── {id}/messages/ # Ticket messages
└── payments/           # Payment records
```

---

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│  Firebase   │────▶│   Profile   │
│   Page      │     │    Auth     │     │   Fetch     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Dashboard  │◀────│  Org Check  │
                    │             │     │  & Setup    │
                    └─────────────┘     └─────────────┘
```

1. User authenticates via Firebase Auth (email/password or Google)
2. `useUserProfile` hook fetches user document from Firestore
3. Profile includes `orgId` for multi-tenant isolation
4. All data queries filter by `orgId`

---

## Multi-Tenancy

All data is isolated by organization:

```typescript
// Every collection query includes orgId filter
const q = query(collection(db, "customers"), where("orgId", "==", profile.orgId));
```

Firestore rules enforce this at the database level:

```javascript
function belongsToOrg(orgId) {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.orgId == orgId;
}

function canReadByOrg() {
  return belongsToOrg(resource.data.orgId) || isSuperAdmin();
}
```

---

## State Management

### Local State

- React `useState` and `useReducer` for component state
- Form state managed by React Hook Form

### Server State

- Firestore `onSnapshot` for real-time subscriptions
- Data cached in hook state with loading/error states

### Global State

- `Zustand` for cross-component state (e.g., impersonation)
- Auth context for user session

---

## API Routes

Located in `app/api/`:

| Route                 | Method | Description                       |
| --------------------- | ------ | --------------------------------- |
| `/api/send-email`     | POST   | Send emails via Nodemailer/Resend |
| `/api/verify-email`   | POST   | Email verification flow           |
| `/api/webhook/paypal` | POST   | PayPal IPN webhook handler        |

---

## Key Design Decisions

### 1. App Router over Pages Router

**Why:** Leverages React Server Components, better layouts, and improved performance.

### 2. Firestore over REST API

**Why:** Real-time subscriptions, offline support, and simpler client-side code.

### 3. Custom Hooks for Data

**Why:** Encapsulates Firestore logic, provides consistent loading/error states, enables reuse.

### 4. Shadcn/ui Components

**Why:** Accessible, customizable, copy-paste ownership (not a dependency).

### 5. Zod for Validation

**Why:** TypeScript-first validation, works with React Hook Form, runtime safety.

---

## Technical Debt

### Large Hooks

These hooks have grown large and may benefit from splitting:

| Hook                           | Size | Recommendation                      |
| ------------------------------ | ---- | ----------------------------------- |
| `use-leads.ts`                 | 25KB | Consider splitting conversion logic |
| `use-organization-settings.ts` | 25KB | Consider splitting billing logic    |
| `use-invoices.ts`              | 21KB | Consider splitting payment logic    |

### Missing Tests

- Unit test coverage is minimal
- E2E tests not yet implemented
- See `tests/TEST_PLAN.md` for test strategy

---

## Performance Considerations

### Query Optimization

- All Firestore queries use appropriate indexes
- `orderBy` clauses moved to client-side sorting where possible
- Pagination not yet implemented (consider for large datasets)

### Bundle Size

- Dynamic imports used for heavy components (PDF, charts)
- Radix UI components are tree-shakeable

---

## Security Model

1. **Authentication** - Firebase Auth with email/password and Google OAuth
2. **Authorization** - Role-based permissions checked in `usePermissions` hook
3. **Data Isolation** - All queries filtered by `orgId`
4. **Rules Enforcement** - Firestore security rules as last line of defense
5. **Input Validation** - Zod schemas validate all form inputs

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Hosting                         │
│                   (Next.js Static + SSR)                    │
├─────────────────────────────────────────────────────────────┤
│                   Cloud Functions                           │
│              (API Routes, Background Jobs)                  │
├─────────────────────────────────────────────────────────────┤
│                     Firestore                               │
│               (Primary Database)                            │
└─────────────────────────────────────────────────────────────┘
```

Deployment is managed via Firebase:

```bash
firebase deploy           # Deploy all
firebase deploy --only hosting  # Deploy Next.js app
firebase deploy --only functions  # Deploy cloud functions
firebase deploy --only firestore  # Deploy rules + indexes
```
