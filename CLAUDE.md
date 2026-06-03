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
lib/
  hooks/              54 hook files; barrel in index.ts
  services/           e.g. reports-service.ts (currently mock)
  auth/               claims, requireSuperAdmin, getAuthenticatedUser, verify-admin
  rbac/               definitions, registry, super-admin, types
  entitlements/ email/ cache/ contexts/ i18n/ impersonation/ stores/ validations/ types/
  schemas.ts types.ts firebase.ts firebase-admin.ts utils.ts paypal.ts quotas.ts
functions/src/        Cloud Functions (separate package.json)
public/ cypress/ tests/ scripts/ docs/
firestore.rules       Security rules (tenant-scoped across all collections; 156 emulator tests)
proxy.ts              (renamed from middleware.ts in Next 16)
service-account.json  (gitignored; not tracked; scrubbed from history in 0.3)
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

**Enforcement layers:** Firestore rules (last line of defense) → API route guards →
component guards → hooks. Rules enforce tenant isolation across all root collections
and customers/leads subcollections via parent-orgId `get()` (see §6).

---

## 6. Security State

Phase 0 closed: both leaked Firebase keys revoked + scrubbed from history; PayPal live secret revoked + scrubbed; `apphosting.yaml` uses Secret Manager refs (secrets to be created via `firebase apphosting:secrets:set` before next live deploy); 14 Firestore collections tenant-scoped with 167-test emulator suite deployed to `goalo-6a269` prod. All multi-tenant data isolation enforced at rules layer.

---

## 7. Module Status Snapshot

Fully wired (UI→API/SDK→Firestore): Customers, Leads, Invoices, Estimates,
Projects, Tasks, Support, Contracts, Knowledge Base, HR, Finance/Accounting,
Super Admin, Chat, Signup/Portal.

Gaps:

- **Reports** — `lib/services/reports-service.ts` is 100% mock (6 TODO markers).
- **Proposals** — stub; being removed.
- Minor TODOs: journal vendor hook, expense currency hard-coded "USD",
  payroll→accounting expense records, chat participant creation.

---

## 8. Build & Test

- `npm run build` → **passes** (Next 16, 182 pages, exit 0). The `middleware.ts → proxy.ts` deprecation warning cleared in 1.3.
- `npm run lint` → **1015 problems / 382 errors / 633 warnings** (down from 1098 / 461 / 637 at Phase 0 start; 5 errors closed by 2.1's dead-code removal). The 49 macOS `._*` parse errors are gone (1.1). The 382 remaining cluster around `no-explicit-any` (295) and `react-hooks` / React Compiler regressions (~113) — Phase 2.2 work (re-sequenced ahead of functional gaps because the pre-commit hook now activates on every multi-file commit).
- Tests: Jest under `tests/`, Cypress under `cypress/`. Tenant-isolation rules suite at `tests/firestore-rules/tenant-isolation.test.ts` (156 tests); RBAC drift test at `tests/unit/rbac/permission-codes.test.ts`. Run per-task as touched.

**Definition of done for every task:** `npm run build` clean, no _new_ lint errors,
relevant tests pass, change verified before moving on.

---

## 9. Working Agreement

- Phased order is fixed: **Phase 0 (security) → Phase 1 (stabilize) → Phase 2
  (gaps) → Phase 3+ (features)**. Do not start features early.
- One task at a time. Test before advancing. Report blockers immediately.
- Phase 2 tasks are independent — paced execution is the default; one task per session is fine.
- Phase 2 was re-sequenced on 2026-06-01: lint cluster triage promoted to 2.2 because the pre-commit hook activated on the 2.1 commit and makes per-task `--no-verify` decisions necessary until the cluster is cleared.
- Destructive/irreversible ops (history force-push, key rotation, rules deploy to
  prod) are surfaced to Ahmed for the actual trigger — never silently executed.
- Pre-commit hook bypass: `--no-verify` requires Ahmed's explicit approval per commit AND a posted check that the hook's failures are all pre-existing — zero new rule IDs and zero count increase vs the §8 baseline. Bypass is justified per-commit, never standing; the day a non-baseline ID appears, fix in-batch instead of bypassing.
- Secrets never get committed. Credentials load from env / secret manager only.
- Preserve existing patterns ("service as a hook", orgId isolation, barrel exports).

---

## 10. Task List

### Phase 0 — Stop the bleeding ✅ COMPLETE

0.1 ✅ Manual: Firebase Admin keys revoked (2 keys: original + apphosting.yaml inlined)
0.2 ✅ Commit `f0d218e6` — load admin SDK from env only; untrack `service-account.json`
0.3 ✅ Commits `c1feb3ed`, `b3b3a787` — apphosting.yaml secret refs; 3-pass filter-repo history scrub for both Firebase keys + PayPal live secret; force-pushed
0.4 ✅ Commit `993004ea` — 14 collections tenant-scoped + 167 emulator tests + deployed to `goalo-6a269` prod
0.6 ✅ Incident response (2026-06-02 stolen-OAuth-credential intrusion) — 39 malicious `.github/workflows/ci-*.yml` commits stripped from history via filter-repo + pinned-lease force-push; `origin/main` clean at `4c148120` (verified by `ls-remote`); forensic tag `incident/malicious-tip-20260602` (`4840fdb0`, local-only) + evidence bundle retained; backup `backup/pre-incident-cleanup-20260602` held ≥7 days. Outstanding incident-tail (not cleanup): re-enable Actions, delete `ci-290443` run record, GitHub Support unreachable-object GC ticket, fork check.

### Phase 1 — Stabilize ✅ COMPLETE

1.1 ✅ Commit `ad983d74` — macOS `._*` cleanup + ESLint ignore (49 parse errors eliminated)
1.2 ✅ Commit `2224e191` — stray `components ` dir deleted
1.3 ✅ Commit `b8bdc1a9` — `middleware.ts`→`proxy.ts` + `isOrgAdmin` removed from rules
1.4 ✅ Commit `ecb74486` — broken `can()` removed; `lib/hooks/use-permissions.ts` is single source of truth
1.5 ✅ Commits `67720d14` + `3859bd0f` — `PERMISSION_MODULES` canonical, `Permission` type derived (89 codes), 22 underscore→dash call sites fixed, leads module catalog completed, drift test in place

### Phase 2 — Close functional gaps

2.1 ✅ Commit `030d01ac` — Proposals entity removed (types, schemas, Firestore rule, Cloud Functions undeployed from prod, 16 org-settings fields, 35+ UI touchpoints); LeadStatus `"proposal"` → `"offer-sent"` with prod data migration (0 docs found); rules redeployed to `goalo-6a269`; 156/156 tenant-isolation tests pass
Lint cluster triage — 407 errors (319 `no-explicit-any` + 113 React Compiler regressions − some closed by 2.1's dead-code removal); promoted from original position 2.4 because the pre-commit hook activated on the 2.1 commit and now blocks every push until the cluster is worked down. Sub-tasks: the `no-explicit-any` cluster (mostly mechanical type-tightening) and the React Compiler regressions (correctness work) treated as separate sub-tasks.

2.2.a ✅ Commit `4c148120` — auto-fixable lint cluster closed (prefer-const, stale eslint-disable, no-require-imports).
2.2.b-i ✅ Commit `2ac6800a` — `Block` typed as discriminated union (`BlockData & {id}`); BlockRenderer.tsx closed 20 `no-explicit-any`; `createBlock<T>`/`defaultBlockData` made DU-aware via `BlockDataFor<T>`; one documented `as unknown as` bridging TS generic-`Extract` limitation; iconMap → `LucideIcon`. Landed with `--no-verify`: hook tripped on 4 pre-existing cluster items (2 `no-unescaped-entities`, 2 unused `design`), zero new rule IDs vs baseline.
2.3 Real Firestore aggregations in `lib/services/reports-service.ts` — replace 6 mock TODOs (Business Health, Sales Pipeline, Invoices, Revenue Summary, Cash Flow, Profit-Loss).
2.4 View-scope data-layer enforcement — the catalog/UI offer `view-own` vs `view-global` but hooks don't filter by ownership; per-module design across ~9 modules.

### Phase 3+ — Features

TBD once foundation is functional-gap-closed.
