# CLAUDE.md — Dosory / Goalo CRM Platform

> Master reference for Claude Code. Single source of truth for this build.
> Read this fully before touching any task. Do not invent stack defaults — this
> project does **not** use the agency's usual Node/MongoDB/Angular template.

---

## 1. Project Overview

Multi-tenant CRM/ERP SaaS. One codebase serves many tenants (organizations),
isolated by an `orgId` field on every document. Tenants reach their workspace via
subdomain (catch-all route `app/[...slug]`). A separate Super Admin surface
(`app/sa/*`) manages tenants, billing plans, modules, and platform security.

**Naming note:** `package.json` says `dosory`; README/ARCHITECTURE/.firebaserc say
_Goalo_ (Firebase project `goalo-6a269`). Treat the two names as the same project.

---

## 2. Tech Stack (ACTUAL — confirmed by audit)

| Layer      | Technology                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------- |
| Framework  | Next.js **16.0.8** (App Router, Turbopack)                                                  |
| UI         | React **19.2.1**, Tailwind CSS 4, Radix UI / shadcn (36 primitives)                         |
| Language   | TypeScript 5                                                                                |
| Backend    | Firebase — Firestore + Auth + Cloud Functions (Node 20 runtime)                             |
| Client SDK | `firebase@^12.6.0`                                                                          |
| Admin SDK  | `firebase-admin@^13.6.0` (root) / `^11.11.0` (functions/ — old major, do not assume parity) |
| State      | Zustand 5 (no React Query / SWR)                                                            |
| Forms      | React Hook Form 7 + Zod 4 + `@hookform/resolvers`                                           |
| Charts     | Recharts 3                                                                                  |
| PDF        | `@react-pdf/renderer@^4.3.1`                                                                |
| Rich text  | Tiptap 3                                                                                    |
| Email      | nodemailer / resend / @react-email                                                          |
| Payments   | PayPal (`@paypal/react-paypal-js`); Stripe keys stored per-tenant                           |
| Tables     | @tanstack/react-virtual; gantt-task-react; @dnd-kit; react-grid-layout                      |
| Testing    | Jest 30 + ts-jest, Cypress 15                                                               |
| Tooling    | ESLint 9, Prettier, Husky + lint-staged                                                     |
| Deploy     | Firebase Hosting / App Hosting (`apphosting.yaml`), `firebase deploy`                       |

**Do not** introduce MongoDB, Express, Angular, Railway/Render, or Vercel here.
This project is Firebase-native. Work with its grain.

---

## 3. Folder Structure (real)

```
app/                  App Router: pages + API routes
  [...slug]/          Tenant subdomain catch-all
  api/                60+ route handlers (Admin SDK)
  dashboard/          Tenant app (182 prerendered pages)
  sa/                 Super Admin surface
  login/ signup/ pay/[invoiceId]/ setup-superadmin/
components/           Feature components + ui/ (shadcn primitives)
"components "/        ⚠ STRAY dir with trailing space — DELETE (Phase 1)
lib/
  hooks/              54 hook files; barrel in index.ts
  services/           e.g. reports-service.ts (currently mock)
  auth/               claims, requireSuperAdmin, getAuthenticatedUser, verify-admin
  rbac/               access, definitions, registry, super-admin, types
  entitlements/ email/ cache/ contexts/ i18n/ impersonation/ stores/ validations/ types/
  schemas.ts types.ts firebase.ts firebase-admin.ts utils.ts paypal.ts quotas.ts
functions/src/        Cloud Functions (separate package.json)
public/ cypress/ tests/ scripts/ docs/
firestore.rules       Security rules (CURRENTLY PARTIALLY BYPASSED)
middleware.ts         ⚠ rename to proxy.ts (Next 16 deprecation)
service-account.json  🚨 LEAKED KEY — remove + gitignore + scrub history
```

---

## 4. Data Model

Every entity extends `BaseEntity { id, orgId, createdAt, updatedAt, createdBy? }`.
Multi-tenancy is field-based: `orgId` on every document. Source of truth is
`lib/types.ts` (993 lines) + `lib/schemas.ts` (921 lines).

Core entities: Customer, Contact, Lead, Activity, Invoice, Estimate, CreditNote,
Payment, Product/ProductGroup, Project, ProjectMember, Task, TaskComment,
TaskList, Milestone, Timesheet, ProjectFile, ProjectDiscussion, Expense,
ExpenseCategory, Subscription, Contract, Ticket/TicketReply/Department,
KnowledgeArticle/Group, Staff, Role, Tax, Currency, PaymentMode, CustomField,
EmailTemplate, Organization, Notification, Reminder, FileDoc/CustomerFile/VaultItem,
HR domain (Employee, Attendance, Leave, Payroll, Performance, Documents),
Finance domain (Account, JournalEntry/JournalLine — double-entry).

**Proposal — BEING REMOVED (Phase 2).** Type, schema, Firestore rule, and Cloud
Functions (`onProposalCreated`, `onProposalStatusChange`) all get ripped out. The
only UI was a settings page under `setup/sales-crm/proposals`. Decision: descope.

---

## 5. Roles & RBAC

Two independent axes:

**Tenant axis** — custom claims `{orgId, role}` (`role` ∈ admin / employee / custom
roleId). Real client-side check lives in `lib/hooks/use-permissions.ts` (looks up
staff doc by `authUid`, reads `permissions: string[]` + `isAdmin`). Component gating
via `components/permission-guard.tsx`.

**Super Admin axis** — `lib/rbac/super-admin.ts` enum (PlatformAdmin, ContentAdmin,
SupportAgent, BillingAdmin, SecurityAdmin). Server enforcement in
`lib/auth/requireSuperAdmin.ts` (verifies Bearer token, checks `isSuperAdmin`).

**Known RBAC debt (Phase 1):**

- `lib/rbac/access.ts` universal `can()` has its real logic commented out — returns
  `false` for all non-admins. Must be implemented or removed.
- Two drifting permission catalogs: flat union in `types.ts` vs action-rich modules
  in `rbac/definitions.ts`. Must be reconciled.

**Enforcement layers:** Firestore rules (last line of defense) → API route guards →
component guards → hooks. Rules are currently the weak link (see §6).

---

## 6. 🚨 Security State (read before any work)

1. **Leaked admin key.** `service-account.json` committed with a real private key for
   `goalo-6a269`. Treat as compromised. Rotation in Firebase console is **Ahmed's
   manual step**; code-side removal + history scrub is ours.
2. **Ultra-permissive Firestore rules.** `leads, customers, invoices, estimates,
proposals, projects, tasks, contacts, customer_files, files, activities,
reminders, notifications, settings` all use `allow read, write: if request.auth
!= null` — labelled "TEMPORARY for debugging". Any authenticated user can
   read/write ANY tenant's data, including per-tenant Stripe/PayPal secrets stored in
   `organizations/{orgId}`. The correct `orgId`-scoped pattern already exists in the
   same file for other collections — copy it.

Until Phase 0 closes both, the platform is not safe for real tenant data.

---

## 7. Module Status Snapshot

Fully wired (UI→API/SDK→Firestore): Customers, Leads, Invoices, Estimates,
Projects, Tasks, Support, Contracts, Knowledge Base, HR, Finance/Accounting,
Super Admin, Chat, Signup/Portal.

Gaps:

- **Reports** — `lib/services/reports-service.ts` is 100% mock (6 TODO markers).
- **Proposals** — stub; being removed.
- **RBAC `can()`** — stubbed to false.
- Minor TODOs: journal vendor hook, expense currency hard-coded "USD",
  payroll→accounting expense records, chat participant creation.

---

## 8. Build & Test

- `npm run build` → **passes** (Next 16, 182 pages, exit 0). One warning: rename
  `middleware.ts` → `proxy.ts`.
- `npm run lint` → **fails**: 461 errors / 637 warnings. Composition:
  49 parse errors from macOS `._*` files (delete them → instant -49),
  319 `no-explicit-any`, 113 react-hooks/React-Compiler issues.
- Tests: Jest under `tests/`, Cypress under `cypress/`. Run per-task as touched.

**Definition of done for every task:** `npm run build` clean, no _new_ lint errors,
relevant tests pass, change verified before moving on.

---

## 9. Working Agreement

- Phased order is fixed: **Phase 0 (security) → Phase 1 (stabilize) → Phase 2
  (gaps) → Phase 3+ (features)**. Do not start features early.
- One task at a time. Test before advancing. Report blockers immediately.
- Destructive/irreversible ops (history force-push, key rotation, rules deploy to
  prod) are surfaced to Ahmed for the actual trigger — never silently executed.
- Secrets never get committed. Credentials load from env / secret manager only.
- Preserve existing patterns ("service as a hook", orgId isolation, barrel exports).

---

## 10. Task List

### Phase 0 — Stop the bleeding

0.1 Ahmed rotates the leaked service-account key in Firebase console (MANUAL).
0.2 Add `service-account.json` to `.gitignore`; switch `lib/firebase-admin.ts` to
load credentials from env only; verify build still passes.
0.3 Scrub `service-account.json` from git history (filter-repo/BFG); Ahmed runs the
destructive force-push.
0.4 Replace ultra-permissive Firestore rules with `orgId`-scoped rules using the
file's existing correct pattern; deploy.
0.5 Verify tenant isolation with a cross-tenant read/write test.

### Phase 1 — Stabilize

1.1 Delete macOS `._*` files (outside node*modules) + add `\*\*/.*\*`to ESLint ignore.
1.2  Delete the stray`components `directory (trailing space).
1.3  Rename`middleware.ts`→`proxy.ts`.
1.4  Resolve RBAC `can()`in`lib/rbac/access.ts` (implement real check or remove).
1.5  Reconcile the two permission catalogs (`types.ts`vs`rbac/definitions.ts`).

### Phase 2 — Close functional gaps

2.1 Rip out Proposals: types, schemas, Firestore rule, Cloud Functions, settings UI.
2.2 Real Firestore aggregations in `reports-service.ts` (replace all 6 mocks).
2.3 Triage `no-explicit-any` cluster + React Compiler regressions
(`use-support.ts`, `use-task-lists.ts`, `use-tickets.ts`).

### Phase 3+ — Features

TBD — defined once the foundation is safe.
