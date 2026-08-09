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
- ~~Support tickets read/write split-brain~~ — CLOSED 2026-08-07 (`08839d8b`): all six ticket
  surfaces converged on `tickets`/`tenantId`. Live-verified 12/12 on qa-smoke. See §11.
- **Field-name normalization `tenantId` → `orgId` (OPEN, consolidation item, 2026-08-07)** —
  `tickets` and `kb_articles` are tenant-scoped by `tenantId`; every other collection uses
  `orgId` (the second was found by the 2026-08-08 sweep). That inconsistency is what let the split-brain hide, and it still forces a
  per-collection `tenantField` in the customer-sidebar count loop. Renaming needs a data
  migration + rules + index rebuild, so it is deliberately deferred, not forgotten.
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

**Awaiting Ahmed's go-ahead (approvals):**

- ~~Functions deploy for the `stripUndefined` fix~~ — DONE 2026-08-09, artifact verified
  byte-identical (SHA-256) and 15-min log watch clean.
- ~~Three money-flow rulings~~ — ALL THREE SHIPPED 2026-08-09 (`733586fa`, `4e57e93c`) and
  proven live on qa-smoke.
- ~~Untrack `functions/node_modules`~~ — DONE 2026-08-09 (`ded7786d`), 8282 paths.
- **EXECUTE THE JE CORRECTION PLAN** (`scripts/audit/audit-payment-je-corrections.ts`, dry-run
  only, no `--execute` flag exists). §1: ONE mis-posted entry — qa-smoke, 412.00, "Bank
  Transfer" posted to `1000 Cash on Hand`, should be `1010 Bank Account`; proposed as
  reversal + repost with deterministic ids, never an in-place edit. §2 is empty (prod has zero
  void/cancelled invoices). §3: 3 qa-smoke payments (150/50/275) that never got a journal entry
  at all — a BACKFILL question, same class as the 2026-08-08 expense backfill. §4: 2 `wasiladev`
  entries (6000 + 7400) with no `referenceId`, unmatchable to a payment.
- **Prepayment reclassification.** Killing an invoice with payments applied leaves AR negative
  by the amount received. That is balanced and standard (it represents a customer prepayment),
  and voidInvoice now logs a warning, but whether it should be reclassified into a dedicated
  prepayment account is a product decision.

**Open feature work (designed, not defects):**

- **Invite-time `employees.userId` linking** (opened 2026-08-09). `useCurrentEmployee` matches
  `employees.userId == profile.uid` and NO code path has ever written that field, so every HR
  self-service surface is dark for every user in every tenant. Gated honestly for now
  (`HrSelfServiceUnavailable`); the real fix is to write `userId` when a staff invite is accepted
  and to offer an admin "link to employee" action. Feature work, not a bug fix.
- **Setup → Departments is a second departments surface.** The entity is real (seeded, CRUD'd
  from HR → Settings, rule-scoped); this Setup page is not wired to it and is gated with a
  pointer. Decide: wire it read-only, or retire the route.

**Remaining ledger (dated):**

- 2026-08-09 (money integrity — `ded7786d`, `733586fa`, `4e57e93c`, `7710091a`; two functions
  deploys; rollout `dosory-build-2026-08-09-005`): the three recorded money defects fixed and
  PROVEN LIVE on qa-smoke through the real UI — finalize posts DR AR / CR Income, a "Bank
  Transfer" payment posts to **1010 Bank** (not Cash) with `paymentModeType: "bank"`, and
  "Mark as Cancelled" reverses the receivable to **AR net 0** while keeping the status the user
  chose. Both deploys verified byte-identical to the local build via `generateDownloadUrl`
  (lesson 7 satisfied by SHA-256, not by "Deploy complete!"); 22/22 ACTIVE; two 15-minute log
  watches, zero ERROR lines.
  **Standing lesson (11) — fixing the branch nobody can reach is not a fix.** The void reversal
  shipped in the morning was INERT: nothing in the product ever sets status `void`. The only
  kill action the UI offers is "Mark as Cancelled", which fell through `use-invoices.ts`'s
  callable routing to a bare client-side `updateDoc` — no reversal, `amountDue` left intact so
  the AR aging query (`amountDue > 0`, no status filter) kept billing a killed invoice, and
  analytics kept counting it. **Before fixing a callable, grep for who actually calls it.**
  Found by the panel, not by any gate.
  **A reversal looks exactly like what it reverses.** `je-void-{id}` carries the same
  orgId/referenceType/referenceId as the original, so (a) voidInvoice's own `limit(1)` lookup
  could select its own reversal and write a self-referencing link — hidden because the amounts
  matched and the id is deterministic, so the double-void test still passed — and (b) the
  correction-plan audit counted every reversal as another unreversed receivable, i.e. the
  artifact a human approves would have proposed double-reversing. Both filter reversals out
  **in memory**: a `where("reversesEntryId", …)` filter drops every legitimate original, which
  carries no such field (Sweep C).
  **Payment modes are classified by DATA now.** The picker writes the DISPLAY NAME and the
  server matched `["bank_transfer","cheque","card"]`, so `"bank transfer"` (a SPACE) matched
  nothing and every payment posted to Cash. Order is now: the tenant's `paymentModes` document
  (`type`/`slug`) → the normalized name → `unknown`, which still posts to Cash but is logged and
  stamped on the payment. 24 modes across 12 orgs backfilled additively (re-run is a no-op).
  **The audit disproved the premise a fourth time:** prod has ZERO void/cancelled invoices, so
  the "+250 unreversed receivable" exists only in the emulator, and only ONE of the three
  "Bank Transfer" payments ever got a journal entry — so the correction scope is 1 entry, not 3.
  Corrections are NOT executed; the plan stops for approval (see above).
  Repo hygiene: `functions/node_modules` untracked (8282 paths, files untouched on disk — it was
  never ignored because `.gitignore` has the root-anchored `/node_modules`, and it was already
  stale); the `.git/objects/pack/._*.idx` sidecar deleted (git is quiet again; `git fsck` still
  shows `refs/heads/._main` and friends, same harmless class); `tests/e2e/` gitignored after a
  broad `git add tests` swept it into an unrelated commit for the second time.

- 2026-08-09 (housekeeping — `54cc4eae`): `tests/backend/finance.test.ts` had **never run**
  (`firebase-functions-test` was never a devDependency, so `npx jest` said "Test suite failed to
  run" and it read as noise). Now 22 emulator-backed tests over the real callables; jest is
  **19/19 suites, 374 passed** (was 18 + 1 failed-to-load, 352).
  **The dependency itself was a trap:** `^3.1.1` resolves to 3.5.0, whose peer wants
  firebase-functions >= 4.9.0 — adding a TEST tool would have bumped the DEPLOYED runtime dep
  from 4.3.0. Pinned to exactly 3.1.1. **A test tool must never move a production dependency.**
  **Version fidelity:** the suite imports firebase-admin through `functions/node_modules`, not
  the root. Root is admin 13, functions run admin 11 — two copies means two `Timestamp` classes
  and timestamps silently written as `{_seconds}` maps.
  **Fixed, found on the first run:** Firestore REJECTS `undefined`, and both callables copied
  `invoiceNumber` / `currency` / `entityId` straight off the invoice, so ONE absent field threw
  the whole transaction and surfaced as "Payment processing failed." Prod has one such invoice
  (org `moaz`) that can be neither paid nor finalized. `stripUndefined()` strips rather than
  nulls, so an absent field stays absent and no `!=`/`not-in` query changes meaning (Sweep C).
  processPayment's catch now uses `functions.logger.error`.
  **Standing lesson (10) — `test.failing` passes when the body fails FOR ANY REASON.** A marker
  whose body calls the callable bare stays green both while the defect exists AND after someone
  fixes it by making the callable reject. The panel proved it by applying the prescribed fix and
  watching the marker stay green — **standing lesson 9 reproduced inside the guard written to
  record a money-flow defect.** Capture the rejection so the ASSERTION always decides, accept
  every legitimate resolution, and pin BOTH ends of a two-sided contract. Re-proved by applying
  each fix in turn and reverting the probes.
  **Process lesson — never review a dirty tree with write-capable agents.** The first panel run
  edited the live working tree: `orgId` briefly vanished from `findAccountByCode`'s query (a
  cross-tenant account lookup) before being restored. No gate caught it; reading the diff did.
  Re-run only after committing.
  **Pushing to main auto-triggers an App Hosting rollout** — the docs-only commit `6091560e`
  shipped as `dosory-build-2026-08-09-003` unasked. Verified at the artifact level: the removed
  keys appear in 0 of 36 served chunks while their sibling appears in 2.

- 2026-08-09 (§7 decisions round — `78a8caec`, rollout `dosory-build-2026-08-09-002`): all six
  §7 recommendations implemented + the demo-seed consistency item. 27-agent panel: 23 raised,
  **14 confirmed**, all folded in before commit. Live-verified 12/12 on qa-smoke EN + AR, zero
  console errors.
  **Standing lesson (8) — an untracked file passes every local gate.** Three new modules
  (`components/ui/coming-soon.tsx`, `components/dashboard/hr/self-service-unavailable.tsx`, the
  new activities contract test) were on disk but never `git add`ed. `tsc`, `next build` and jest
  all read the working tree, so all three were green while a clean checkout would have failed
  `next build` on four routes and silently skipped the new guard. **Second occurrence**
  (`identity-keys.ts`, 2026-08-08). Before every commit: every module named in an import must be
  tracked (`git ls-files --error-unmatch`).
  **Standing lesson (9) — a drift guard can fail in only one direction.** The
  form-select-schema guard matched `<SelectItem value="x">{t("<prefix>.…")}</SelectItem>` as one
  pattern, so a MISSING option failed loudly while an EXTRA out-of-enum option (different key
  prefix, literal label, any attribute before `value`) was invisible — and the "exactly the
  enum" assertion passed anyway. Proven by injecting
  `<SelectItem className="x" value="archived">` into `tasks/new`: the old extractor still
  returned exactly the four enum values. **When a guard identifies items by an incidental
  property (a label, a comment, a naming convention), it blesses everything written differently.**
  Extractor is now label-agnostic and emits `<UNPARSEABLE:…>` / `<AMBIGUOUS:…>` markers rather
  than skipping what it cannot read; four tests cover the extractor itself.
  **The audit disproved the migration instruction, for the third round running.** Root
  `activities` had **0 documents** (subcollection: 35 across 6 orgs), so the authorised additive
  copy was a no-op — and would have been WRONG: `activities` names two different entities, the
  audit log (`organizations/{orgId}/activities`, written by `logActivity`, org-scoped by path,
  no `orgId` field) and the CRM Activity entity (root, `relatedTo`/`outcome`/`dateTime`, own CRUD
  UI). Copying either way corrupts the other. Pinned apart by
  `tests/unit/activities-collection-contract.test.ts`.
  **The Today feed's field mapping is part of the collection contract.** Pointing the reader at
  the right collection was not enough: `message` is already a complete phrase naming the entity,
  so mapping `target` to `entityType` rendered "…created project Acme site **project**". `target`
  is now empty for those rows and the renderer omits it. Proven live: a project created through
  the real UI on qa-smoke renders "…created project Feed Proof 135859", and the panel — empty for
  every user before this round — now shows five real audit rows.
  **A fifth Sweep E split-brain, in seed data:** `seed-demo-tenant.ts` wrote `jobTitles` (app
  reads `job_titles`) and `department`/`jobTitle` (list renders `departmentName`/`jobTitleName`).
  Its header also advertised an idempotency guard that never existed while `main()` unconditionally
  wipes the tenant — corrected in capitals. **Seed scripts are read surfaces too; sweep them.**
  Renames were done **by behaviour, not by the brief's guess**: neither `useStaff` twin is
  platform-scoped (both read tenant `staff`), so it became `useAssignableStaff`; only the
  email-template twin is platform-scoped. Verified the sole diff at all 10 import sites is the
  specifier, so no site moved between implementations.
  Also: TaskStatus is **four** values, not five as the brief stated — aligned to the enum rather
  than inventing a fifth. HR backfill: **55 departments + 48 job titles across 12 orgs**, re-run
  is a no-op. `tests/backend/finance.test.ts` cannot load (`firebase-functions-test` was never a
  devDependency) — confirmed pre-existing by stashing; raised separately, not fixed here.

- 2026-08-08 (money close-out — functions deployed + backfill executed):
  **Standing lesson (7) — "Deploy complete!" is not evidence.** `firebase deploy --only
functions` reported 21/21 successful updates while shipping **stale July build output**:
  `firebase.json` had NO `predeploy` hook and `functions/main` is `lib/index.js`, so the deploy
  uploads whatever was last compiled. `functions/lib/finance.js` was dated Jul 28 and still
  contained the old `organizations/{orgId}/accounts` lookup. **Every previous "functions
  deployed" in this project is suspect for the same reason.** A predeploy build hook is now in
  `firebase.json`. Always verify the artifact, not the deploy message.
  Second defect, found only because the bar was a live journal entry: **`finalizeInvoice` had a
  reads-after-writes transaction violation** — `t.update()` ran before `findAccountByCode`'s
  `t.get(query)`, which Firestore rejects, so it 500'd for every invoice, always. Its `catch`
  discarded the error and rethrew a generic message, which is why the cause was invisible.
  `processPayment` had been fixed this way in an earlier round; this callable never was.
  **PROVEN LIVE on qa-smoke:** a new invoice finalized + paid through the real UI produced both
  journal entries — invoice (AR 412 / Sales Income 412) and payment (Cash 412 / AR 412) — each
  balanced, each resolving to root-collection accounts, invoice reconciling to
  `total − payments − amountDue = 0`. 22/22 functions ACTIVE, callable IAM intact, zero
  ERROR-severity logs in the following hour.
  **Backfill executed under the collision policy:** the 2 amount-collisions were resolved by
  LINKING each existing journal entry to its expense (setting the missing `referenceId`,
  backup-first) rather than posting a duplicate; the remaining 6 were backfilled (9,850.00) with
  deterministic ids. 8/8 expenses now have an entry, 0 pending, 14 entries on `wasiladev`, 0
  unbalanced, re-run is a no-op.
  Noted, NOT caused by this round: `wasiladev` has 8 invoices and **0 payment documents**, so
  four seeded invoices carry an `amountDue` no payment explains — an artifact of
  `scripts/seed-demo-tenant.ts`, flagged as demo-data quality.

- 2026-08-08 (money/accounting round — `e586b594`, rollout `dosory-build-2026-08-08-005`):
  **The audit disproved the premise.** The predicted duplicate ledger accounts do not exist —
  0 duplicate codes and 0 duplicates-with-postings across all 14 orgs; only 1 org had any
  accounts at all. Cause: the missing `accounts(orgId, code)` index made the ordered query
  throw into its catch, so the lazy-seed never ran either. No dedupe needed, none performed.
  **Standing lesson (6) — audit before you remediate; the fix for a race is not the same as
  evidence the race happened.**
  **Journal entries were being skipped by THREE paths**, all shaped `if (a && b) { post }` with
  no else: expenses (client — `useFinance` never loaded the chart, so both accounts were always
  undefined) and BOTH Cloud Functions (`findAccountByCode` read
  `organizations/{orgId}/accounts`, a subcollection with **zero documents in every org**, while
  the whole app and every existing journal line use the ROOT `accounts` collection). That is a
  **fourth Sweep E split-brain, in the money module** — and it was not among the 9 reported
  findings. All three now log loudly instead of skipping.
  Chart seeding is idempotent (deterministic `{orgId}__acc-{code}`, R1 pattern) — proven by
  loading the page twice on qa-smoke: 14 accounts, 14 distinct codes, 0 duplicates.
  **Invoice `adjustment` was displayed but never persisted**, while the stored total was
  recomputed without it — screen and billed amount differed by exactly that value, and the
  on-screen formula also omitted tax, so both could be wrong at once. `calculateInvoiceTotals`
  was duplicated byte-for-byte in two files (the ticket-saga trap again) — now single-source,
  with a `subtotal === 0` guard that could otherwise persist NaN.
  **Hardcoded "WasilaDev"/EGIC/Nasr-City addresses** on every tenant's invoice detail replaced
  with that tenant's own org settings; verified live on qa-smoke EN + AR.
  Product: lead "+ Add Status" REMOVED (it wrote free text into a fixed zod enum, bricking Save
  from first use); the "+ Add Source" twin stays because `source` is `z.string()`.
  Guard: `tests/unit/accounting-invariants.test.ts` (14).
  **Two things are deliberately NOT done and are listed under approvals: the expense backfill
  (2 amount collisions could double-post) and the functions deploy (payments/invoices still
  post nothing in prod until it ships).**

- 2026-08-08 (first full-depth Sweeps A–E pass + `support_tickets` retired — `b80810c7`,
  rollout `dosory-build-2026-08-08-001`): 8 lenses, 65 findings raised, **62 confirmed**.
  **Standing lesson (5) — in this rules file you cannot deny a collection by adding a deny.**
  `firestore.rules` ends with a generic `match /{collection}/{docId}` that grants on an orgId
  match, and Firestore grants if ANY matching rule allows. Deleting the `support_tickets`
  block was a no-op; replacing it with `allow read, write: if false` was ALSO a no-op. Only
  excluding the collection INSIDE that catch-all (`isRetiredCollection()`) denies it. Proven
  by three recorded emulator runs — the allowed/denied pair inverted only on the third.
  Retiring a collection now means: a deny block for intent AND a name in that helper.
  **Critical finds:** `useTasks` had the whole `relatedTo` OBJECT in its dep array, so every
  `/dashboard/leads/{id}/*` page re-subscribed its Firestore listener without bound — a freeze,
  not a crash, because the setState came from an async callback (identical to the shipped
  `use-contracts` `cursors` bug, same eslint-autofix origin). Starting a NEW 1:1 chat was
  permission-denied for everyone — the third instance of the missing-doc `resource.data.*`
  landmine, alongside a fourth in the staff self-heal. The notification bell had never worked
  for anyone: producers address notifications with `staff.id` (a lowercased email), the bell
  queried `profile.uid` — now centralised in `lib/utils/identity-keys.ts`, shared with the
  Today view. `firestore.indexes.json` had drifted **22 indexes behind prod**, i.e. the repo
  could not recreate a working environment; synced + 12 new, 148 READY.
  **The adversarial panel caught four regressions in the fixes themselves**, all repaired
  before commit: both new `catch` blocks were unconditional, so a transient read failure would
  fall through to a NON-MERGING `setDoc` and wipe a live conversation's `lastMessage`/unread
  badges (and a staff doc's permissions) — narrowed to `permission-denied`; the new
  identity-keys module was untracked; the task self-notify filter compared `staff.id` to `uid`;
  and the test header credited the wrong enforcement mechanism.
  Money-flow findings were **diagnosis-only by instruction** and are listed under approvals.
  Live-verified EN+AR on qa-smoke: lead-detail listener flat at 0 new streams over 8s, no
  index or permission errors, zero console errors. Evidence: `test-results/sweeps-*.png`.

- 2026-08-07 (tickets split-brain HEALED — commit `08839d8b`, rollout
  `dosory-build-2026-08-07-005`): every ticket surface now reads and writes
  `tickets`/`tenantId`. Migrated: customer-tickets tab, project-tickets tab, Today view
  (`today-service`), **and a fourth reader the first pass missed** — the customer sidebar
  count badge (`customer-context.tsx`), whose shared loop forced `where("orgId")` on every
  collection, so the Tickets badge read 0 forever and its `catch` reported the failure as a
  zero. Both tabs also adopted the canonical `SupportTicket` shape and the shared
  `support.statuses.*` / `support.priorities.*` vocabulary, collapsing two divergent status
  enums into one. `SupportTicket` gained a first-class `projectId`. `use-support.ts`'s
  `useTickets`/`useTicketReplies` were **deleted**, not just unused — an exported hook aimed
  at an abandoned collection is how a fifth surface forks again.
  **Standing lesson (4) — the identity key is a split-brain surface too.** Fixing the
  collection was not enough: the Today view matched assignee fields against
  `profile.uid` (Firebase auth uid) while every assignee picker writes `staff.id`, and staff
  docs are keyed by **lowercased email**. Proven on prod: the qa-smoke ticket's
  `assignedAgentId` is `ahmeddarwesh+…@gmail.com` while `authUid` is
  `mdp62bAtwMg2z7GEjYXjXQunNEB2`. Both Today queries now match the full id set
  (`in [uid, email]`) via `TodayService.assigneeIdsFor`. **Whenever two surfaces exchange an
  entity reference, check the KEY as well as the collection.**
  Also fixed here: `getTasks` had no composite index and a bare `catch {}` that discarded the
  error object — that pair _was_ the "Error fetching tasks" console message on every
  dashboard load (index added, error logged, console now clean). Adversarial panel (34
  agents, 24/28 findings confirmed) additionally caught: the project detail pane unmounting
  on every status change and then rendering a stale ticket; the ticket body written to
  `description` but never displayed; both tabs discarding the hook's `error` so failures
  rendered as "no tickets"; and a missing index for the support list's status+priority
  combination. 4 composite indexes deployed (136 READY).
  Live acceptance on qa-smoke, 12/12 PASS, EN + AR, zero console errors — one ticket created
  through the real UI appears in the support list, the customer tab, the project tab and the
  Today view, and "All Caught Up!" is gone. Evidence: `test-results/split-brain-*.png`.
  Pinned by `tests/unit/ticket-collection-agreement.test.ts` (all six surfaces + tenant key +
  assignee-id contract + index coverage).

- 2026-08-07 (harness note, not a bug): **Radix menus ignore synthetic `element.click()`.**
  The AR language switcher looked broken under automation; a trusted Playwright click opens
  it and flips `dir=rtl` correctly. Radix triggers fire on `pointerdown`, which a synthetic
  `click` never dispatches — this applies to every Radix menu/select in the app. Never file a
  Radix control as broken from a failed `.click()`. Details + the `localStorage` locale
  shortcut: `test-results/qa-smoke-README.md`.

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
_Rule (added 2026-08-09, housekeeping round):_ **`test.failing` passes when the body fails for
ANY reason.** A marker that records a known defect must CAPTURE the rejection so the assertion
decides, and must accept every legitimate resolution — otherwise it stays green after the fix and
the finding is never closed. Prove both directions by applying the prescribed fix and watching it
turn red.
_Rule (added 2026-08-09):_ **a guard that identifies items by an incidental property blesses
everything written differently.** The extractor keyed on the option's translation-key prefix, so
a MISSING option failed loudly while an EXTRA out-of-enum one was invisible — asymmetric, and
invisible in the direction that matters. Identify the BLOCK by the marker, then read every item
in it, and emit a loud marker for anything unparseable instead of skipping it.

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
- **Cross-check every multi-clause query against `firestore.indexes.json`** — any second
  `where()`, any `where`+`orderBy` on different fields, any array-contains/in/!= needs a
  composite index or it throws FAILED_PRECONDITION, which is invisible from the UI. Also
  reconcile the repo file against deployed truth (`firebase firestore:indexes`): on
  2026-08-08 it was 22 indexes behind, so the checked-in file could not rebuild prod.
- **A record that ANNOTATES another record looks exactly like it.** A journal reversal carries
  the same orgId/referenceType/referenceId as the entry it reverses, so every query written for
  the original also matches the annotation — the writer can select its own output, and an
  auditor counts the annotation as another unhandled item. Exclude by the marker field IN MEMORY:
  filtering on `where("marker", "==", null)` drops every legitimate original, which has no such
  field at all.
- **A `!=` / `not-in` filter silently excludes documents that lack the field entirely** —
  prefer an in-memory filter when the field may be absent.

**Sweep D — reference-data seeding (empty-select family).**
For every required `<Select>` sourced from a Firestore collection, confirm that collection
is in `lib/provisioning/seed-tenant-defaults.ts`'s seed set AND backfilled for existing
orgs. `expenseCategories` was in neither, so no tenant — new or old — could file an expense.

**Sweep E — read/write agreement (split-brain family, added 2026-08-07).**
For every entity, confirm the collection + tenant key the _write_ path uses is the one every
_read_ surface queries. `tickets`/`tenantId` (support UI) vs `support_tickets`/`orgId`
(customer tab, project tab, Today view) diverged silently: writes succeed, read surfaces stay
permanently empty, and nothing errors.

- **Enumerate read surfaces exhaustively before declaring the sweep done.** The first pass of
  the 2026-08-07 migration found three readers and missed a fourth — a _count badge_ in
  `customer-context.tsx`. Grep for the collection name AND for every count/aggregate helper.
- **The identity key is a split-brain surface too (lesson 4).** Same collection, same tenant
  key, still zero rows: the Today view matched `assignedAgentId` against the auth uid while
  every picker writes `staff.id` (a lowercased email). Whenever two surfaces exchange an
  entity reference — assignee, owner, agent, author — diff the KEY, not just the collection.
- **A `catch` that returns a default IS the bug.** Every silent-empty in this family was
  wearing a `catch { return [] }` or `catch { count = 0 }`. Log the error object; a swallowed
  failure is indistinguishable from a legitimate zero.
- **Seed and demo scripts are write surfaces too.** `seed-demo-tenant.ts` wrote `jobTitles` while
  every reader queries `job_titles`, and denormalised `department`/`jobTitle` where the list
  renders `departmentName`/`jobTitleName` — invisible because nobody diffs a script against the UI.
- **Deleting the abandoned accessor is part of the fix.** An exported hook still pointing at
  the retired collection is precisely how a fifth surface forks again.
  _Guard:_ `tests/unit/ticket-collection-agreement.test.ts` pins all six ticket surfaces, the
  tenant key, the assignee-id contract, and index coverage — extend it, don't allow-list around it.
