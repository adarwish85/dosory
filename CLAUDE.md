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

- **Reports** — `lib/services/reports-service.ts` is 100% mock (6 TODO markers; gated "coming soon" in A8).
- **Support tickets read/write split-brain (OPEN, 2026-08-07)** — writes land in
  `tickets`/`tenantId`; the customer-tickets tab, project-tickets tab, and dashboard Today
  view still read `support_tickets`/`orgId` and are therefore permanently empty. Decision
  needed (recommend: migrate the 3 readers). See §11 ledger + Sweep E.
- Minor TODOs: journal vendor hook, expense currency hard-coded "USD",
  payroll→accounting expense records, chat participant creation.
- ~~`/dashboard/payments/new` route absent~~ — CLOSED 2026-07-28: real record-payment form
  built over the processPayment callable (invoice picker scoped to payable invoices, amount
  validated against remaining balance, EN/AR). Leads stat cards fixed the same day (combined
  count+sum aggregation excluded value-less docs; split via lib/hooks/leads/fetch-lead-stats.ts).

**Route-fall-through rule (3 incidents: /leads/import, /customers/import, /customers/new):**
quick actions must link only to routes that exist as static segments — a missing static page
silently falls through to `[id]` and renders a not-found/hang. When adding a quick action,
create the page.

---

## 8. Build & Test

- `npm run build` → **passes** (Next 16, 182 pages, exit 0). The `middleware.ts → proxy.ts` deprecation warning cleared in 1.3.
- `npm run lint` → **975 problems / 343 errors / 632 warnings** (down from 1098 / 461 / 637 at Phase 0 start; 5 errors closed by 2.1's dead-code removal). The 49 macOS `._*` parse errors are gone (1.1). The 343 remaining cluster around `no-explicit-any` (282) and `react-hooks` / React Compiler regressions (~113) — Phase 2.2 work (re-sequenced ahead of functional gaps because the pre-commit hook now activates on every multi-file commit).
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
2.2.b ✅ Commit `43b03c9b` — escaped 26 `react/no-unescaped-entities` across 18 files (`&apos;`/`&quot;` JSX-text encoding, rendered output byte-identical); rule ID eliminated (12→11). Landed with `--no-verify`: hook tripped only on pre-existing cluster items, zero new rule IDs vs baseline.
2.2.b-ii ✅ Commit `98566e62` — leaf-typed canvas.tsx renderers via new `lib/types/website-section-config.ts` (7 section configs, documented for verbatim lift into the eventual `WebsiteSection` DU); canvas.tsx 13 `no-explicit-any`→0, off hook-blocker list; first 2.2 commit to land hook-clean (no `--no-verify`). `no-explicit-any` 295→282.
2.3 Real Firestore aggregations in `lib/services/reports-service.ts` — replace 6 mock TODOs (Business Health, Sales Pipeline, Invoices, Revenue Summary, Cash Flow, Profit-Loss).
2.4 View-scope data-layer enforcement — the catalog/UI offer `view-own` vs `view-global` but hooks don't filter by ownership; per-module design across ~9 modules.

### Phase 3 — SaaS readiness

Sequenced from the 2026-06-03 readiness recon. Two finish lines: Milestone A (friendly first paying customer, hand-held) and Milestone B (self-serve sign-up-and-pay). Five decisions are unresolved — marked [DECISION PENDING] — and block only their own tasks, not Stage 3.0.

**Stage 3.0 — Security closure (strictly first; blocks all of Phase 3)**
3.0.1 ✅/⏳ Chat-messages cross-tenant leak — `chats/{id}/messages/{mid}` allows any authed user read/write across tenants; scope to parent chat orgId via parent-`get()` pattern. HARD BLOCKER before any 2nd tenant.
3.0.2 Extend rules test suite with a cross-tenant chat-message assertion (must fail pre-fix, pass post-fix).
3.0.3 `analytics/{cat}/events` create — add orgId check (pollution, not leak).
3.0.4 `platform/{id}` public read — confirm non-sensitive or scope.
3.0.5 `staff/{id}` create — block arbitrary-orgId claim (list pollution).

**Stage 3.1 — Billing real enough for one customer → MILESTONE A**
3.1.1 Create `subscriptions/{orgId}` doc on signup (today only a `plan` field on the org doc exists).
3.1.2 checkQuota — wire at write paths OR delete (currently dead code, 0 call sites). [DECISION PENDING]
3.1.3 Observability — wire Sentry into existing error boundaries (placeholder comment already present). Highest-leverage non-feature.
3.1.4 Email-verification flow — add `sendEmailVerification` + `/verify` route (signup sets `pending_verification` but nothing triggers/handles it).
3.1.5 Seed-on-creation — seed default taxes/currencies/payment-modes/templates so a new tenant can transact (today lands bare).

**Stage 3.2 — Self-serve billing funnel → MILESTONE B**
3.2.1 Platform-billing checkout (customer→Dosory). Stripe vs PayPal-subscriptions. [DECISION PENDING]
3.2.2 Subscription-management UI (subscribe/upgrade/cancel/payment-method/receipt) — distinct from tenant's own invoicing config.
3.2.3 Trial→paid conversion + dunning for `past_due`.
3.2.4 Rate-limiting/abuse protection on signup + API routes (bot can currently mint unlimited trials).

**Stage 3.3 — Operational & legal table-stakes (parallelizable with 3.2)**
3.3.1 Dev/staging/prod separation; move `PAYPAL_MODE: live` out of inline `apphosting.yaml`. (Do before 3.2.1 — need a safe place to test payments.)
3.3.2 Tenant data export (GDPR Art. 20 portability).
3.3.3 Terms / privacy / legal pages (absent entirely).
3.3.4 Backup story for tenant data.

**Stage 3.4 — Feature completeness & polish (parallelizable; gate before public launch)**
3.4.1 Reports module — wire 5 real aggregations OR gate behind "coming soon" for launch (currently 100% mocked — fake-but-real-looking numbers). [DECISION PENDING]
3.4.2 view-own enforcement (§2.4) — wire ownership into queries across ~14 modules OR simplify catalog to match reality. [DECISION PENDING]
3.4.3 Website-builder Option B — lift SectionConfigFor into `WebsiteSection` DU, refactor `properties.tsx` off destructure, resolve 4 stub types (image/video/form/html: build / stub-config / drop). [DECISION PENDING]
3.4.4 ~12 "coming soon" UI corners — label-and-defer acceptable.

**Loose end (not Phase 3):** Phase 2 lint tail — 2.2.b-iii (8 `no-explicit-any`) + 2.2.b-iv (2 `react-hooks/set-state-in-effect`), 10 errors across 5 files. Mechanical; does not block Phase 3; slot after 3.0.

---

## 11. Ops Log & Standing Checks (updated 2026-07-28)

**Standing QA infrastructure:** tenant `qasmoke20260728131942` (subdomain
`qasmoke20260728131942.dosory.com`, owner `ahmeddarwesh+qasmoke20260728131942@gmail.com`,
creds in gitignored `qa-smoke-credentials.txt`) is **reserved** as the permanent smoke-test
tenant. Future smoke passes reuse it — do NOT mint new prod tenants, do NOT delete it. Its
data: 1 customer, 1 lead, 1 paid invoice (INV-000001, $150) + payment, 1 task.

**Incidents resolved 2026-07-28 (see TEST-REPORT-2026-07-28.md for detail):**

- functions lockfile drift + `functions.config()` v2 container boot crash (lazy reads; 571a6c53).
- Pre-commit hook crash on tracked node_modules (lint-staged `--config`; 7f3e153c).
- 4 scheduled functions silently crashing for want of composite indexes (55490116 + deploy);
  +2 more (leads/payments metrics ASC) found live in the smoke (36bd10e7).
- Duplicate `staff/{uid}` docs on every admin login — root cause of "moaz" (9f0a5feb + dedupe;
  verified live). Invariant: staff docs are keyed by lowercased email and carry `authUid`;
  never key by uid.
- `RESEND_API_KEY` invalid across v1–v3 → v4 + App Hosting rollout; live send 200 + message id.
  NOTE: signup email-verification is Firebase-native — never Resend-dependent.
- Payments list page was hardcoded mock data (EGIC fixtures) → wired to usePayments.
- Provisioning made convergent: idempotent route + signup retry/backoff + login-time
  self-heal guard (`useEnsureProvisioned`) + 5-test emulator convergence suite.

**Standing checks (do these every time):**

1. After changing any scheduled function's query → check its next prod run's logs for
   FAILED_PRECONDITION (missing index errors are silent from the UI).
2. After any dependency edit → resync the matching lockfile in the same commit.
3. After every App Hosting rollout → run the quick smoke against the qa-smoke tenant
   (login, customers/leads/invoices/tasks lists render real data, signup page 200).
4. Emulator suites: tenant-isolation (187) + provisioning-convergence (5) must be green
   before any rules/provisioning commit.

**Remaining ledger (dated):**

- 2026-08-06 (ticket-create defect CLOSED): tickets were uncreatable for every user in every
  tenant. The denial was a READ, not the write: TicketService.createTicket awaits
  getDoc(settings/{tenantId}\_support) first, and the settings rule dereferences
  `resource.data.orgId` — on a MISSING doc `resource` is null, the expression errors, the read
  is denied. Prod's root `settings` collection has 0 docs, so it failed for everyone.
  **TWO standing lessons:**
  (1) **A rule that reads `resource.data.*` DENIES reads of non-existent documents.** Never
  `getDoc` a possibly-absent doc on a critical path without handling the denial — and when
  data is optional, say so in code (try/catch → undefined), not just in intent.
  (2) **Barrel shadowing is real**: `app/dashboard/support/new` imports `useSupportTickets`
  from `@/lib/hooks`, where `export * from "./use-tickets"` (index.ts:23) shadows it —
  it resolves to TicketService/`tickets`+`tenantId`, NOT use-support.ts/`support_tickets`+
  `orgId`. Two rounds were spent analysing the wrong file. When a hook misbehaves, resolve
  the BARREL export before reading any implementation.
  Pinned by tests/firestore-rules/support-ticket-create.test.ts (rules suite now 191).

- 2026-08-07 (ticket saga CLOSED — acceptance MET): the 2026-08-06 fix (53c340b0) shipped to
  prod and changed nothing, because it patched `TicketService.getSettings` — a same-named,
  **unused** duplicate — while `createTicket` awaits `SupportSettingsService.getSettings`.
  Same shadowing trap as the barrel, one level down: _two methods, same name, different class._
  Real fix in `lib/services/support-settings-service.ts` (b4d6c9d0): try/catch → built-in
  defaults. Verified live on qa-smoke post-rollout (`dosory-build-2026-08-07-001`): the
  `tickets` collection gained its first-ever legitimate app-written documents — EN
  (`u2ngJHmBEb08aDWO9qTq`) and AR (`sfYD4kss…`, `dir=rtl`). Evidence:
  test-results/ticket-create-verified-{en,ar}.png.
  **Standing lesson (3):** when a fix produces no behaviour change, verify the patched symbol
  is the one the call path actually invokes _before_ re-diagnosing — pinned by
  tests/unit/ticket-create-call-path.test.ts, which asserts the guard lives on the invoked
  implementation.
  **NEW DEFECT found while confirming dead code — `support_tickets` is NOT dead, it is a
  SPLIT-BRAIN (open, unfixed):** writes go to `tickets`/`tenantId` (support list + new-ticket
  page, via TicketService), but three read surfaces still query `support_tickets`/`orgId` —
  `app/dashboard/customers/[id]/tickets`, `app/dashboard/projects/[id]/tickets` (both via
  use-support's `useTickets`), and the dashboard Today view (`lib/services/today-service.ts:84`
  → `components/dashboard/today/today-view.tsx`). Those three will NEVER show a ticket created
  by the app, silently and without error — confirmed live: 2 open tickets exist, Today renders
  "All Caught Up!". Rules for `support_tickets` were correctly NOT removed this run. Decision
  needed: migrate the 3 readers to `tickets`/`tenantId` (recommended — one write path already
  wins) or migrate the writer back. Generalized as **Sweep E** in §12.
  Scoped cleanup done: the QA probe doc was deleted from `support_tickets` (backup at
  backups/support-tickets-probe-2026-08-07T10-22-22-924Z.json); that collection is now empty.
  Also observed, unrelated and unfixed: dashboard logs "Error fetching tasks" on load.

- 2026-07-28 (client QA round 2, items 4-10): freeze family = effect-dep loops
  (use-contracts `cursors` in deps; estimates/credit-notes amount-sync NaN guard) — the
  standing lesson is **never put state written by a snapshot callback in that effect's deps**,
  and **derive computed row fields at submit, not in an effect**. Dead-submit family = zod
  schema vs rendered form drift (projects status enum; a 4th vocabulary in the EDIT dialog)
  and invisible required fields (HR leave `currentEmployee`) — every form MUST render an
  onInvalid/error for the field that failed. Address OBJECTS must go through
  lib/utils/format-address.ts (React #31). expenseCategories now seeded + backfilled (13 orgs).
  New drift guard: tests/unit/form-select-schema-contract.test.ts scans Select values against
  the zod enum — extend it whenever a new status/enum select ships.

- 2026-07-28 (bug-fix round): dashboard "Add Task" was a decoration button (no onClick —
  wired to /dashboard/tasks/new); "Log Time" quick action removed (route never existed —
  4th route-fall-through incident); leads filters were collected-but-never-applied (status
  → server-side via useLeads, advanced rows → lib/hooks/leads/apply-lead-filters.ts).
  Orphan-org cleanup EXECUTED full-scope by Ahmed (staff invariant saga closed).

- 2026-07-28 (feature round): 4 callables were browser-dead (empty IAM — invoker grant
  restored via gcloud; check IAM after every functions deploy), processPayment had a
  reads-after-writes transaction bug (fixed + deployed), and 4 settings hooks
  (paymentModes/taxes/currencies/emailTemplates) had no composite indexes (added, 108
  total). New standing check: after adding any orgId+orderBy hook, add its composite
  index in the same commit.

- `functions.config()` API is removed in firebase-functions v6+ / deprecated server-side —
  migrate functions/src to env-based config **before 2027-03** (checkReminders,
  emailNotifications, onboarding still read it).
- Cloud Functions Node 20 runtime → upgrade path planned **before 2026-10**.
- `checkReminders` sends inside a single 500-op batch — chunk before any reminder backfill
  or growth makes >500 due at once.
- 5 expired trials will be transitioned by `trialExpiryCheck` at its next 02:00 UTC run
  (first healthy run after the index fix) — expected, not an incident. Expiry sets
  status:"expired", which ensureWriteAccess does NOT currently block (product decision open).

---

## 12. Standing UI-Contract Sweep (Sweeps A–D)

Each sweep generalizes a bug **class** that has already shipped to a client at least once.
Run the full set after any round that touches forms, hooks, or rules; run the single
relevant sweep whenever its trigger pattern is introduced. Every sweep ends in a
_committed test_, not a fixed symptom — the test is what stops the class from returning.

**Sweep A — effect-dependency loops (freeze family).**
Scan every `useEffect` whose dependency array contains state that a Firestore
`onSnapshot`/async callback inside that same effect writes. That is a re-subscribe loop and
it freezes the page (`use-contracts` `cursors`). Also flag computed row fields synced by an
effect (estimates/credit-notes `amount`) — derive them at submit instead.
_Rule:_ never put state written by a snapshot callback in that effect's deps.

**Sweep B — form ↔ schema contract drift (dead-submit family).**
For every form: diff each `<Select>`/radio value set against the zod enum it feeds, in
**every** dialog that writes the entity (the projects EDIT dialog carried a 4th, unique
status vocabulary). Then confirm each required field is actually _rendered_ — HR leave's
`currentEmployee` was required and invisible, so submit silently no-op'd. Guard:
`tests/unit/form-select-schema-contract.test.ts` — **extend it whenever a new status/enum
select ships**.
_Rule:_ every `handleSubmit` MUST pass an `onInvalid` that surfaces the failing field.

**Sweep C — data-layer landmines (permission-denied / render-crash family).**

- Scan every `getDoc`/`getDocs` target whose matching rule dereferences `resource.data.*` —
  each is a missing-doc → permission-denied landmine; fix pattern: guard rule with
  `exists()` or restructure read.
- **Resolve barrel exports to the real implementation file before static analysis.**
  `@/lib/hooks` re-exports collide (`index.ts:23` `export * from "./use-tickets"` shadows
  `useSupportTickets`); two investigation rounds were spent reading the wrong file, and a
  third shipped a fix to a same-named method on the wrong class.
- Any value rendered as a React child that could be an object (Address, etc.) must go
  through a formatter — `lib/utils/format-address.ts` (React #31).

**Sweep D — reference-data seeding (empty-select family).**
For every required `<Select>` sourced from a Firestore collection, confirm that collection
is in `lib/provisioning/seed-tenant-defaults.ts`'s seed set AND backfilled for existing
orgs. `expenseCategories` was in neither, so no tenant — new or old — could file an expense.

**Sweep E — read/write collection agreement (split-brain family, added 2026-08-07).**
For every entity, confirm the collection + tenant key that the _write_ path uses is the one
every _read_ surface queries. `tickets`/`tenantId` (support UI) vs `support_tickets`/`orgId`
(customer tab, project tab, Today view) diverged silently: writes succeed, three read
surfaces stay permanently empty, and nothing errors.
