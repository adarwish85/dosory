# Dosory / Goalo — Exhaustive Test Pass

**Date:** 2026-07-28
**Project:** `goalo-6a269` (prod) · domain `*.dosory.com`
**Branch:** `main` @ `55490116` (== `origin/main`, pushed)
**Run mode:** autonomous · fix-what-is-safe · no data deletion · no secret writes · no App Hosting deploy

---

## 1. Executive summary

The build is fundamentally healthy — all 21 source Cloud Functions are deployed and
ACTIVE, the app builds clean, and tenant-isolation rules hold. **Three fixes were made,
committed, and pushed this pass.** The single most important discovery: **four scheduled
Cloud Functions have been silently failing on every run in production** because their
queries have no backing composite index. That is now fixed in source and is waiting only
on your one-command index deploy.

The two standing blockers to a real paying customer are unchanged and both need you:
**(1)** the `RESEND_API_KEY` value is invalid across all three secret versions, so _all_
transactional email — including the signup email-verification wall — is dead; **(2)** a
systemic duplicate-`staff` doc bug (a code path, not a data glitch) keeps writing a
malformed `staff/{uid}` record on every admin login.

### Fixed & pushed this pass

| Commit     | Fix                                                                                                          | Phase       |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| `7f3e153c` | Pre-commit hook no longer crashes on tracked `node_modules` (explicit `lint-staged.config.mjs` + `--config`) | 1           |
| `70fc1c32` | `/dashboard/leads/import` + `/dashboard/customers/import` routes (stop `[id]` "not found" fall-through)      | 2           |
| `55490116` | 4 missing composite indexes for the crashing scheduled functions                                             | 4 (finding) |

---

## 2. Phase-by-phase results

| #   | Phase / test                    | Result          | Notes                                                                                                                                                                  |
| --- | ------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `git status` baseline           | ⚠️ dirty        | Build artifacts (`functions/lib`) + **tracked** `functions/node_modules` (8k+ files) + uncommitted E2E harness. Read-only continued.                                   |
| 0   | 21 functions ACTIVE             | ✅ PASS         | 21/21 source fns deployed + `ssrgoalo6a269` (SSR) = 22 total ACTIVE.                                                                                                   |
| 1   | Pre-commit hook fix             | ✅ PASS         | Reproduced crash on `bs-logger/package.json`; fixed; **verified on a real commit** (`55490116` ran the hook clean, no `--no-verify`).                                  |
| 2   | Leads `/import` routing         | ✅ PASS         | Root cause: `[id]` captured literal `"import"`. Added static route pages (static wins over `[id]`) for leads **and** customers. `npm run build` passed at commit time. |
| 3A  | Functions `npm test` (emulator) | ⚠️ INCONCLUSIVE | Jest hangs on a functions-emulator connection (only Firestore emulator was up). Not a code failure — suite needs the full emulator.                                    |
| 3A  | Rules test suite                | ✅ PASS (prior) | 187/187 tenant-isolation tests green (last run this engagement).                                                                                                       |
| 3A  | Playwright E2E harness          | ✅ PRESENT      | Suite exists (`tests/e2e/`, uncommitted). Not re-run this pass.                                                                                                        |
| 3B  | Live prod UI smoke              | ⛔ NOT EXECUTED | **Deviation** — see §6. Blocked at signup by the invalid-Resend verification wall (Finding H2); harness already covers these flows. `qa-smoke` tenant **not** created. |
| 4.1 | Function error logs             | ✅ DONE         | 4 broken scheduled fns found (now fixed), 1 benign per-record error. See §3.                                                                                           |
| 4.2 | `bulkDeleteLeads` health        | ✅ PASS         | Cloud Run Ready/ACTIVE. Not invoked.                                                                                                                                   |
| 4.3 | moaz diagnosis (read-only)      | ✅ DONE         | Provisioning intact; systemic dup-staff **code** bug. See §4. No writes made.                                                                                          |
| 4.4 | `RESEND_API_KEY` versions       | ✅ DONE         | v1, v2 (2025-12-27), v3 (2026-07-19). v3 pinned by serving revision but **value invalid**. Read-only.                                                                  |
| 5   | Commit + push fixes             | ✅ DONE         | 3 commits pushed. No functions **source** changed → no `firebase deploy --only functions` needed.                                                                      |

---

## 3. Findings, ranked by severity

### 🔴 H1 — Four scheduled functions crash on every run in prod _(FIXED in source; deploy pending)_

Confirmed live in function logs over the smoke window (`FAILED_PRECONDITION: The query
requires an index`):

| Function                  | Collection      | Required index (added)       |
| ------------------------- | --------------- | ---------------------------- |
| `checkReminders`          | `reminders`     | `emailSent, sendEmail, date` |
| `trialExpiryCheck`        | `subscriptions` | `status, trialEndsAt`        |
| `subscriptionAutoBilling` | `subscriptions` | `status, nextBillingDate`    |
| `contractAutoExpiry`      | `contracts`     | `status, endDate`            |

These queries were introduced/changed by the WS2 logic fix, but the indexes were never
added — so **reminder emails, trial expiry, auto-billing, and contract expiry have all
been no-op'ing** (each throws before doing any work). Field order mirrors the exact index
Firestore requested. Fix committed in `55490116`. **Action: deploy the indexes (§5.1).**

### 🔴 H2 — All transactional email is dead (`RESEND_API_KEY` invalid) _(Ahmed only)_

A live send test returns `500 "API key is invalid"`. All three secret versions are
enabled; the serving App Hosting revision pins **v3**, but v3's _value_ is invalid (same
as v2 before it). This kills: invoice-sent emails, contract-created emails, reminder
emails, onboarding emails, **and the signup email-verification link** — which is why the
self-serve funnel can't complete (see §6). **Action: add a valid key + rollout (§5.2).**

### 🟠 M1 — `checkReminders` latent no-op even after the index _(Ahmed decision)_

The query filters `emailSent == false`. Firestore's `==` **excludes documents missing the
field**, and existing reminders were created without `emailSent`. So even with H1's index
and a valid Resend key, the function will match **zero** existing reminders. The function's
own source comments flag this. **Action: backfill `emailSent: false` on existing reminders,
or change the query to tolerate the missing field (§5.4).**

### 🟠 M2 — Systemic duplicate `staff/{uid}` doc _(code bug, not data; Ahmed)_

`components/user-profile-provider.tsx:133-152` and `app/dashboard/layout.tsx:195` both do
`setDoc(doc(db,"staff",user.uid), {...})` for admins/superadmins **without `authUid`**,
duplicating the correct `staff/{email}` doc that signup creates (which _does_ set
`authUid`). Confirmed present on **moaz** and **e2etesta**, and it re-creates on every
admin/superadmin login. This is the real "moaz" issue — **not** a provisioning gap.
**Action: fix the two write paths + clean up existing UID-keyed dups (§5.3).**

### 🟡 L1 — `sendOnboardingEmails` throws for a stale uid _(benign, noisy)_

`FirebaseAuthError: There is no user record corresponding to the provided identifier` —
a deleted/stale user id. It's caught per-record and does not crash the function; cosmetic
log noise. Low priority; consider a guard/skip.

### 🟡 L2 — `functions/node_modules` is tracked in git _(root cause of the hook crash; Ahmed)_

8k+ vendored files are committed. This is _why_ lint-staged walked into
`bs-logger/package.json` and crashed (Phase 1 defended against it, but the tree is still
dirty from these). Untracking them is a large, separate op — flagged, not done here.

### 🟡 L3 — E2E harness uncommitted in the working tree

`playwright.config.ts`, `tests/e2e/`, `scripts/seed-demo-tenant.ts`,
`scripts/backfill-provision.ts`, `test-results/` and `package.json`/`.gitignore` edits are
present but never committed. Left as-is (committing them is out of scope for a fix pass);
commit them if they're meant to be kept.

---

## 4. moaz diagnosis (read-only — no writes made)

**Verdict: provisioning is intact.** Compared against a fresh tenant's expected shape,
moaz has its org doc, its `subscriptions/{orgId}` doc, custom claims, and a correct
email-keyed `staff/{email}` doc **with** `authUid`. No missing or malformed provisioning
document.

**The only anomaly is an _extra_ doc:** a second `staff/{uid}`-keyed record with
`authUid: undefined`, written by the M2 code path above. It is a duplicate, not a gap.

**Implication:** "delete + recreate moaz" would **not** fix this — the duplicate reappears
the next time an admin logs in, until the M2 write paths are corrected. The correct
remediation is the code fix + a one-time cleanup of the stray UID-keyed docs.

---

## 5. Ahmed-approval checklist (things I could not / should not do autonomously)

1. **Deploy the 4 new composite indexes** — unbreaks H1. Safe/additive; non-destructive:
    ```bash
    firebase deploy --only firestore:indexes --project goalo-6a269
    ```
2. **Add a valid `RESEND_API_KEY` (new version) + fresh App Hosting rollout** — unbreaks
   H2. The rollout is required because App Hosting pins the secret version at rollout time.
   (I cannot see or write secret values.)
3. **Fix the duplicate-staff-doc write path** (`components/user-profile-provider.tsx` +
   `app/dashboard/layout.tsx`) and clean up existing UID-keyed `staff` dups (moaz,
   e2etesta, any others). `scripts/backfill-provision.ts` already exists as a starting
   point — review it. I did **not** run any backfill.
4. **Decide `checkReminders` missing-field handling** (M1) — backfill `emailSent:false` vs
   query change. Index alone won't make reminders send.
5. **(Optional) Live prod UI smoke** — I did not mint the `qa-smoke` tenant (§6). Say the
   word and I'll create it and screenshot the funnel up to the verification wall.
6. **(Housekeeping)** Untrack `functions/node_modules` (L2); commit or discard the
   uncommitted E2E harness (L3).

---

## 6. Deviation: Phase 3B live prod smoke not executed

I did **not** create the `qa-smoke-<timestamp>` prod tenant. Rationale:

- **It's blocked at step one.** Signup lands in `pending_verification` and the app gates on
  a verification email that cannot be delivered (Finding H2, invalid Resend key). The live
  UI flow can't proceed past signup without either a valid key or an Admin-SDK write to
  force-verify the account — the latter is a data write I was asked not to make and would
  make the "smoke test" unrepresentative of the real path.
- **The blocker is already proven** without minting a tenant — via a direct Resend send
  test (`API key is invalid`) and by tracing the verification code path.
- **Coverage already exists.** The completed Playwright harness exercises
  signup/provisioning/CRUD/invoice against prod Firebase using throwaway tenants (bypassing
  the UI email wall via Admin-SDK test helpers).

Minting a permanent, undeletable prod tenant to screenshot a wall I've already confirmed is
low value. Happy to do it if you want the artifact (item §5.5).

---

## 7. What did not change

- No accounts or data deleted.
- No secrets written or read for value.
- No App Hosting deploy, no functions deploy (no functions **source** changed), no rules
  or index **deploy** (source only).

---

# Remediation pass — 2026-07-28 (part 2)

Authorized follow-up: deploy the committed indexes, fix the duplicate-staff-doc bug + clean
up the data, backfill reminder `emailSent`, and commit/push. Constraints held: no secrets
touched, no App Hosting deploy, nothing deleted beyond the defined scope.

## R1 — Indexes deployed & verified ✅ (Finding H1 CLOSED)

- `firebase deploy --only firestore:indexes` → all 4 new composite indexes reached **READY**
  (no `--force`; the 23 console-only indexes were left intact).
- **`checkReminders` confirmed green in prod logs**: the 09:36 UTC run still errored
  (mid-build), the **09:51 UTC run finished `ok`** (1574 ms).
- The 3 daily functions last ran 00:00–02:00 UTC (before the deploy). Rather than force-run
  `subscriptionAutoBilling` (real billing side-effects), the fix was proven **read-only** by
  executing each function's exact query against prod — all four resolve with **no
  FAILED_PRECONDITION**:

    | Query                                                                 | Result                                 |
    | --------------------------------------------------------------------- | -------------------------------------- |
    | trialExpiryCheck (subscriptions: trialing & trialEndsAt<now)          | OK — 5 would act on next 02:00 UTC run |
    | subscriptionAutoBilling (subscriptions: active & nextBillingDate≤now) | OK — 0                                 |
    | contractAutoExpiry (contracts: active & endDate<now)                  | OK — 0                                 |
    | checkReminders (reminders: sendEmail & !emailSent & date≤now)         | OK — 0                                 |

## R2 — Duplicate staff docs: code fixed + data cleaned ✅ (Finding M2 CLOSED)

**Code fix.** `components/user-profile-provider.tsx` no longer mints `staff/{uid}`: it looks a
staff doc up by `authUid` (the canonical, forgery-resistant key) and bails if found; if a
stale email-keyed doc lacks `authUid` it repairs it in place; only otherwise does it create
the canonical `staff/{email}` doc. `app/dashboard/layout.tsx` now reads the canonical
email-keyed doc instead of `staff/{uid}` (also fixes the sidebar for non-admin staff, whose
uid-keyed doc never existed). `npm run build` → exit 0.

**Cleanup script** (`scripts/dedupe-staff-docs.ts`, backup→dry-run→`--execute`, staff-only).
It was adversarially reviewed by a 4-lens agent panel before running; the review confirmed 2
real issues in the first draft (uid/orgId-drift dups missed by (orgId,email) grouping; and
potential data-loss on auto-ID `staff-form` docs). Both were fixed by rewriting the delete
predicate to the **exact, unforgeable invariant**: delete an authUid-less doc **iff its id
equals some keeper's `authUid`**. That can never match an admin-added auto-ID staff row and
catches drift-orgId dups regardless of orgId.

**Executed against prod:**

- Deleted **9** duplicate uid-keyed docs (each id == its keeper's authUid); **0** merges
  needed; backup written to `backups/staff-dedupe-<ts>.json` (gitignored — contains PII).
- Total staff docs **20 → 11** (10 canonical keepers + 1 protected doc).
- **moaz now has exactly ONE staff doc** (`mohamedmoaaz100@gmail.com`, with authUid); the
  duplicate `t3Rr…` is gone.
- **1 doc left untouched**: `uI7Ufzr4bXZLYQXLpfruSEXPKAI2` — authUid-less and not any keeper's
  authUid (likely an orphan whose keeper differs). The script deliberately never deletes what
  it can't prove is a duplicate. → **flagged for Ahmed to inspect** (§ below).
- Rules regression suite re-run: **187/187 pass**.

## R3 — Reminder `emailSent` backfill ✅ (Finding M1 addressed)

`scripts/backfill-reminder-emailsent.ts` (same backup→dry-run→`--execute` pattern): recent
(≥ now−30d) missing-flag reminders → `emailSent:false` (eligible); older → `true` (consumed),
preventing an ancient-send burst. **Prod result: 0 rows** — only one `sendEmail==true`
reminder exists and it already carries the flag. The script is committed for future/other
data; it is a no-op today.

## R4 — Functions redeploy: not needed

No `functions/src` file changed (only client code, `scripts/`, and `firestore.indexes.json`).
`firebase deploy --only functions` intentionally skipped.

## Status of findings after this pass

| Finding                                    | Before  | Now                                           |
| ------------------------------------------ | ------- | --------------------------------------------- |
| H1 — scheduled fns crash (missing indexes) | 🔴 open | ✅ **closed** (deployed + verified)           |
| M2 — duplicate staff docs                  | 🟠 open | ✅ **closed** (code fixed + 9 dups removed)   |
| M1 — checkReminders emailSent no-op        | 🟠 open | ✅ addressed (backfill ready; 0 rows today)   |
| H2 — `RESEND_API_KEY` invalid              | 🔴 open | 🔴 **still open — the one remaining blocker** |

## New items for Ahmed

1. **RESEND_API_KEY (the only remaining blocker).** Value is invalid across v1/v2/v3. Add a
   valid version and trigger a fresh App Hosting rollout (App Hosting pins the secret version
   at rollout). Until then: no invoice/contract/onboarding/reminder email, and signup email
   verification can't complete. _(I cannot see/write secrets or deploy App Hosting.)_
2. **Inspect 1 orphan staff doc** `uI7Ufzr4bXZLYQXLpfruSEXPKAI2` — authUid-less, matches no
   keeper. Decide: repair (attach the right authUid) or delete. Left untouched by design.
3. **Latent (pre-existing) in `functions/src/reminders.ts`:** `checkReminders` sends inside a
   single Firestore batch (500-op hard limit). Harmless today (≤1 eligible), but if a backfill
   or growth ever makes >500 reminders eligible at once, the run would fail — chunk the batch.
4. **Pre-existing uncommitted E2E harness** (`playwright.config.ts`, `tests/e2e/`,
   `scripts/seed-demo-tenant.ts`, `scripts/backfill-provision.ts`, and the `package.json`/
   `package-lock.json` playwright dep) remains uncommitted — left as-is (predates this pass;
   committing unreviewed dependency changes was out of scope). Commit or discard as you see fit.

---

# Resend key + rollout + Phase 3B prod smoke — 2026-07-28 (part 3)

Ahmed added `RESEND_API_KEY` **v4** himself (value never entered this session's context);
everything downstream ran autonomously. Constraint note: the single App Hosting rollout below
was explicitly requested this turn for the new key — no other App Hosting deploys were made.

## R5 — Rollout + live email: H2 CLOSED ✅

- **Secret:** v4 confirmed enabled (created 10:11 UTC). IAM already correct (compute SA
  `secretAccessor`, App Hosting service agent `secretVersionManager`) — no grants needed.
- **Rollout:** `firebase apphosting:rollouts:create dosory -g 9f0a5feb -f` → "Successfully
  created a new rollout"; backend serving (signup + root HTTP 200). Pinning to `9f0a5feb`
  also put the staff-dup code fix into prod.
- **Live send — the money shot:** authenticated POST to prod `/api/email/send` (welcome
  template) → **HTTP 200, Resend message id `eb6f089d-9db0-4a73-a93a-504931542615`**.
  Transactional email is live. (The same endpoint returned `500 "API key is invalid"` in
  part 1.)
- **Correction to part 1:** signup email-verification uses **Firebase Auth's own email
  infra** (`sendEmailVerification`, signup/page.tsx) — it was never Resend-dependent, and the
  dashboard does not hard-gate on `emailVerified`. Verification-link generation confirmed
  working. What the invalid key actually killed was invoice/contract/reminder/onboarding/
  welcome mail — all Resend paths, now live.

## R6 — Phase 3B prod smoke (tenant `qasmoke20260728131942`) — PASS with findings

Additive only; nothing deleted. Credentials in gitignored `qa-smoke-credentials.txt`.

| Flow                                           | Result                                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signup form (real browser, prod)               | ✅ subdomain "Available!" check, account + org + claims created (`set-claims` 200 ×3)                                                                             |
| Tenant-subdomain login + dashboard             | ✅ onboarding wizard shows; sidebar/stats render                                                                                                                  |
| Customer create (UI, client SDK through rules) | ✅ "QA Smoke Customer Ltd" — list Total 1, seeded USD currency visible in form                                                                                    |
| Lead create (UI, client SDK through rules)     | ✅ "QA Smoke Lead" — list Total 1                                                                                                                                 |
| Invoice + payment + task                       | ✅ created in client shape (INV-000001 via the counters path, paid, $150) — invoices list renders **PAID $150.00**; tasks list renders after a field fix (see F4) |
| Email verification                             | ✅ Firebase-native link generates; not a Resend dependency                                                                                                        |
| Staff-dup regression check                     | ✅ **exactly 1 staff doc** (email-keyed, authUid set) after admin login on the fixed build — the 9f0a5feb fix is verified live                                    |
| checkReminders post-index                      | ✅ 3 consecutive `ok` runs (10:21, 10:36, 10:51 UTC)                                                                                                              |

Screenshots: every flow captured live in the headed browser session (embedded in the session
transcript). Headless file re-capture was blocked — prod login silently resets for headless
Chromium while identical credentials work headed (bot/App-Check protection working as
intended; evidence at `test-results/qa-smoke-headless-login-blocked.png`, notes in
`test-results/qa-smoke-README.md`).

## New findings from the smoke

**F1 — HIGH · Signup can strand a half-provisioned tenant.** During the automated signup the
client-side `await fetch("/api/tenants/provision")` never reached the server (Cloud Run logs
show set-claims ×3 at 10:23 but zero provision calls until my manual one at 10:27), yet the
user was NOT rolled back — the tenant landed with **no subscription doc and no seeded
defaults** (every write would 403). Provisioning itself is healthy: calling the route with
the user's own token returned 200 and fully seeded the tenant (trialing subscription, 1 tax,
1 currency, 2 payment modes, 2 templates). Likely automation-environment interference
(App Check), but the failure mode is real for flaky networks: **recommend making
`/api/tenants/provision` idempotently callable on first dashboard load** (self-heal), or
moving provisioning server-side into signup.

**F2 — HIGH (product, not security) · Payments page is 100% hardcoded mock data.**
`app/dashboard/accounting/payments/page.tsx` renders a literal array (EGIC, INV-000111–119,
EGP amounts) for every tenant — it looked like a cross-tenant leak until source inspection.
Firestore rules are fine (scoped `payments` rule verified; an unscoped client query would be
denied). Same class as the A8 mock-Reports issue: **gate it "coming soon" or wire
`usePayments`**. The real payment I created renders nowhere on this page.

\*\*F3 — MEDIUM · `/dashboard/customers/new` fell through to `[id]` ("Loading overview…" hang

- permission-denied console noise). FIXED this pass\*\* — created
  `app/dashboard/customers/new/page.tsx` opening the existing `AddCustomerPanel` (mirrors
  `leads/new`, same pattern as the committed `/import` fixes). `tsc --noEmit` clean. Lands on
  prod with the next rollout (not rolled out this turn — the authorized rollout predates the fix).

**F4 — LOW · Tasks page crashes on one malformed doc.** `task.name.toLowerCase()`
(tasks/page.tsx:283) took down the whole page behind the error boundary when my QA task
initially used `title` instead of `name` (my data error, fixed). A defensive
`(task.name ?? "")` would keep one bad doc from blanking the module.

**F5 — MEDIUM · Two more missing composite indexes (H1 class), found live: FIXED + DEPLOYED**
— the dashboard "today" metrics query (`today-service.ts`) needs `leads (orgId ASC,
createdAt ASC)` (console showed `failed-precondition`; only DESC variants existed) and its
sibling payments query needs `payments (orgId ASC, date ASC)`. Both added to
`firestore.indexes.json` (now 102) and deployed to prod.

## Status after part 3

| Blocker                 | Status                                                  |
| ----------------------- | ------------------------------------------------------- |
| H1 scheduled-fn indexes | ✅ closed (part 2) + F5 sweep deployed                  |
| H2 RESEND_API_KEY       | ✅ **CLOSED — live 200 + message id**                   |
| M1 reminders backfill   | ✅ addressed (0 rows)                                   |
| M2 duplicate staff docs | ✅ closed + **verified live on prod** (qa-smoke: 1 doc) |

**No platform blockers remain.** Open items for Ahmed, by priority: F2 payments mock page
(fake financial data in front of real tenants), F1 provisioning self-heal, qa-smoke tenant
disposition (left in place per instructions), orphan staff doc `uI7Ufz…`, F4 hardening,
next App Hosting rollout to ship the F3 route fix.

---

# Remediation round 4 — 2026-07-28 (F2/F1/F4 + orphan verdict + reserved QA tenant)

## F2 — Payments page de-mocked ✅

`app/dashboard/accounting/payments/page.tsx` rewritten: the hardcoded EGIC/INV-0001xx fixture
array is deleted; the table now renders the tenant's real payments via `usePayments`
(orgId-scoped `onSnapshot`, date desc — served by the existing `payments(orgId,date DESC)`
index). Loading state, "No payments yet" empty state (EN+AR keys added), error state, live
search, real pagination. Renders both real write shapes (processPayment callable:
`paymentMode`; client records: `method`/`customerName`). Verified post-rollout against
qa-smoke (§ verification below).

## F1 — Provisioning made convergent ✅ (5/5 emulator tests)

- **(a) Idempotent route** — `/api/tenants/provision` → `provisionTenant` was already
  check-before-create per doc (subscription existence check; `seedIfEmpty` per collection;
  settings merge). Verified by test rather than rewritten.
- **(b) Signup retry** — `provisionWithRetry` (new `lib/provisioning/ensure-provisioned-client.ts`):
  4 attempts, 1s/2s/4s backoff, fresh token per attempt (first attempt races claim refresh),
  fail-fast only on deterministic 400. **Deliberate change:** total provision failure no longer
  deletes the just-created auth user — claims + org already exist and rollback could itself
  fail; instead the login-time guard converges the tenant. Logged, not fatal.
- **(c) Login-time guard** — `useEnsureProvisioned` mounted in the dashboard layout: one cheap
  `getDoc(subscriptions/{orgId})` per session (readable by the tenant per rules); if missing →
  "Finishing your workspace setup…" screen (EN+AR) while the idempotent route is invoked with
  backoff; re-checks, then falls open on persistent failure (broken-but-visible beats an
  infinite spinner). Skips cleanly under impersonation/claim-drift (token orgId mismatch).
- **Emulator convergence suite** — `tests/unit/provisioning-convergence.test.ts` (5 tests,
  all green): stranded tenant converges; killed-after-subscription converges;
  killed-after-partial-defaults converges without double-seeding; second call is a byte-level
  no-op (createdAt unchanged, zero duplicate seeds); no cross-org namespace leakage.

## F4 — Tasks page hardened ✅

`(task.name ?? "").toLowerCase()` — one malformed doc can no longer blank the tasks module.
(Sibling fields in the same filter — `status` — are enum-compared, no crash surface.)

## Orphan staff doc `uI7Ufzr4bXZLYQXLpfruSEXPKAI2` — verdict (read-only, nothing deleted)

It is **Ahmed's own account**: auth user `ahmeddarwesh@gmail.com` (uid == doc id, created
2025-12-16). The doc was minted 2026-01-11 by the old dup-writing provider code, keyed by uid,
no `authUid`, and points at legacy org `org_uI7Ufz…_1765902729459` (org doc exists but has no
name/ownerId — pre-current-signup format). It is that account's ONLY staff doc (no email-keyed
canonical exists), which is exactly why the dedupe invariant spared it.
**Recommendation: delete both the staff doc and the empty legacy org** — it's an abandoned
dev-era artifact; the account's real workspace access doesn't route through it (authUid
lookups can't match it). If you instead want this gmail account usable as staff somewhere,
say which org and I'll migrate it properly (create `staff/{email}` with authUid, then retire
the uid-keyed doc). Ahmed's trigger either way.

## qa-smoke tenant — now reserved infrastructure ✅

`qasmoke20260728131942` is the permanent standing smoke-test tenant (creds in gitignored
`qa-smoke-credentials.txt`). Recorded in CLAUDE.md §11. Future smoke passes reuse it.

## New finding

**F6 — `/dashboard/payments/new` does not exist** — the "Record Payment" quick action
(invoices sidebar) links to it and 404s. Needs a record-payment form page (real feature work,
not a route shim — it should drive the processPayment callable). Logged in CLAUDE.md §7.

## Ship gate

- `npm run build` → exit 0 (189 pages).
- ESLint on changed files → 0 errors.
- Rules suite 187/187; provisioning convergence 5/5.
- CLAUDE.md updated (§7 gaps, route-fall-through rule, §11 ops log / standing checks /
  dated ledger: functions.config() migration <2027-03, Node 20 <2026-10, checkReminders
  500-op batch, 5 expired trials transitioning at next 02:00 UTC — expected).

## Round-4 post-ship adversarial review → hotfix (same day)

A 3-lens adversarial review panel (16 agents, refute-style verification) ran against
`301a6a4b` while the rollout built. **4 findings confirmed; all fixed** in the follow-up
commit and shipped with the final rollout:

| #   | Sev  | Finding                                                                                                                                                                                                              | Fix                                                                                                                                                                                                      |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | HIGH | `seedIfEmpty` check-then-write with auto-IDs duplicates seeds under CONCURRENT provision calls (signup retry racing a still-running handler; two healing tabs)                                                       | Deterministic org-scoped seed doc IDs (`{orgId}__cur-usd` …) — concurrent writers converge on the same docs. New emulator test: 3 concurrent `provisionTenant` calls → exact seed counts. Suite now 6/6. |
| R2  | MED  | No fetch timeout — a stalled provision request pins the "finishing setup" screen for minutes                                                                                                                         | `AbortSignal.timeout(15s)` per attempt, then backoff/retry as designed                                                                                                                                   |
| R3  | MED  | `failed` status was consumed nowhere → silent broken dashboard (every write 403s "No subscription found")                                                                                                            | Amber banner + "Retry setup" button in the dashboard layout when status === failed (EN+AR keys)                                                                                                          |
| R4  | MED  | Signup's catch-all rollback survived the removed throw: a post-provisioning throw (e.g. token refresh during welcome email) would `deleteUser` against a FULLY provisioned org — permanently stranding the subdomain | Rollback now gated on `orgCreated` flag (only before the org doc exists) and `deleteUser` wrapped so rollback failure can't freeze the form                                                              |

## Post-rollout verification (revision @ 301a6a4b, then hotfix rollout)

| Check                      | Result                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Payments page on qa-smoke  | ✅ **exactly 1 real payment** — #1, INV-000001, Bank, QA Smoke Customer Ltd, $150.00, "Showing 1 to 1 of 1 entries"; server HTML contains 0 mock strings                       |
| `/dashboard/customers/new` | ✅ opens AddCustomerPanel directly (no `[id]` hang)                                                                                                                            |
| Signup                     | ✅ HTTP 200                                                                                                                                                                    |
| Leads page                 | ✅ lead renders; the `failed-precondition` metrics console error is GONE (F5 index). Residual: this page's own stat cards read 0 from a separate source — pre-existing, logged |
| Tasks                      | ✅ renders; QA task status normalized `todo`→`to_do` (valid TaskStatus enum)                                                                                                   |

---

# Orphan cleanup — EXECUTION BLOCKED by pre-flight (2026-07-28, round 5)

The approved two-doc deletion (staff `uI7Ufz…` + legacy org `org_uI7Ufz…_1765902729459`)
was dry-run and then **deliberately NOT executed**. The script's pre-flight found the §4
premise incomplete in two ways, and the approval's own condition — "verify my real
account's login is unaffected" — cannot be certified under them:

1. **The live superadmin account still routes through the legacy org.**
   `users/{uI7Ufz…}.orgId == org_uI7Ufz…` (the auth claims are pure
   `{isSuperAdmin, PlatformAdmin}` — no tenant orgId — but `useUserProfile` reads the
   users doc, so the tenant-dashboard view of Ahmed's own account resolves through this
   org, including its live `settings/general` subcollection doc). Deleting the org would
   leave the profile dangling in the known orgId-drift state.
2. **The org is not empty at the root level.** 7 root-collection docs carry its orgId —
   `subscriptions/{orgId}` plus seeded `currencies`(1)/`taxes`(1)/`paymentModes`(2)/
   `emailTemplates`(2), created by the A2/A3 backfill. A two-doc deletion would orphan
   them all.

**Nothing was deleted. No data changed.** Rules suite re-run anyway: 187/187.

## The corrected cleanup (one approval away)

`scripts/cleanup-legacy-orphan-org.ts` (committed) encodes both scopes:

- Default / `--execute`: the approved two-doc scope — but it **refuses to run** while the
  account routes through the org (the exact guard that fired today).
- `--execute --full-scope` (needs your approval): first clears the legacy `orgId` field
  from `users/{uid}` (your SA access is claims-based; the field is a relic of the old
  signup flow), then deletes the staff doc, the org doc recursively, and the 7 root
  strays. Everything is exported to `backups/orphan-cleanup-<ts>.json` before any write,
  and post-verify confirms the auth account intact with unchanged claims.

**To execute after approving:**

```
npx tsx scripts/cleanup-legacy-orphan-org.ts --execute --full-scope
```

If you'd rather keep a tenant workspace attached to your gmail account, say which orgId
and the users-doc step becomes a repoint instead of a field removal.

---

# Feature round — 2026-07-28 (F6 record-payment + leads stat cards)

## F6 — /dashboard/payments/new ✅

Real record-payment form (was a 404ing quick action). Deliberately THIN over the existing
payment path: submission goes through `useInvoices().recordPayment` → the **processPayment
callable**, which owns the whole data contract (transactional payment doc in the exact shape
`usePayments` reads, invoice `amountPaid/amountDue/status` transitions paid/partial, auto
journal entry vs AR). The page never writes Firestore directly.

- Invoice picker: org-scoped, filtered to payable invoices (`lib/payments/record-payment-utils.ts`
  — excludes paid/void/cancelled and zero-balance; tolerates legacy docs without `amountDue`).
- Amount: prefilled with remaining balance; validated > 0 and ≤ balance with the server's own
  0.01 epsilon; server still re-validates.
- Mode from seeded `paymentModes`; date picker; note; EN+AR keys (13 new); `?invoiceId=` deep-link
  support for the invoice-detail quick action.
- Tests: 5/5 pure-logic suite (`tests/unit/record-payment-utils.test.ts`).

## Leads stat cards showing 0 ✅ (root cause found + fixed)

**Root cause** (proved live on qa-smoke via REST aggregation): the cards' combined
`getAggregateFromServer(q, {count(), sum("value")})` **excludes every doc missing the summed
field from the whole aggregation** — leads created without a `value` field (like qa-smoke's)
were excluded from `totalCount` too → TOTAL 0 while the table (plain query) showed rows. The
silent fallback masked nothing because the call _succeeded_ — with the wrong semantics.
**Fix**: `lib/hooks/leads/fetch-lead-stats.ts` splits count from sum (count() counts all docs)
and adds real org-scoped server counts for starred/qualified (previously computed from the
current page slice — under-counted beyond page 1). QuickStatsBar now renders all four numbers
from this single source; view-own scoping preserved. New index `leads(orgId,isStarred)`
(104th) for the starred count; qualified rides the existing `(orgId,status,createdAt)` prefix.

- Tests: 3/3 emulator suite (`tests/unit/lead-stats.test.ts`) — pins the exact regression
  (combined aggregation would return 2; split returns 4), org isolation, view-own scoping.

## Ship gate

- Build exit 0 (**190 pages** — new route). ESLint changed files: 0 errors.
- Rules 187/187 · convergence 6/6 (prior) · payment utils 5/5 · lead stats 3/3.
- Index deploy + App Hosting rollout: below (post-rollout verification appended after).

## Post-rollout live verification (qa-smoke) — and 3 more prod bugs found & fixed

Exercising the new form end-to-end flushed out three pre-existing prod defects that had
never been hit because no one could reach this flow before:

1. **4 callables had EMPTY IAM policies** (`processPayment`, `finalizeInvoice`,
   `voidInvoice`, `recalculateAnalytics`) — no `allUsers` invoker, so every browser call
   403'd at preflight without CORS headers → the SDK surfaced "internal". This is the
   grant `firebase deploy` normally sets automatically; restored via
   `gcloud functions add-invoker-policy-binding` (auth still enforced in-function via
   `context.auth` — the standard callable model). **Every callable-backed flow (record
   payment, finalize/void invoice) was browser-dead until today.**
2. **`processPayment` itself was broken**: its transaction ran the journal-entry account
   lookups (`t.get`) AFTER the payment/invoice writes — Firestore forbids reads-after-writes
   in a transaction, so EVERY payment 500'd ("Payment processing failed"). Fixed by moving
   the account reads before the writes (`functions/src/finance.ts`); deployed
   (`--only functions:processPayment`).
3. **4 settings hooks had NO composite index** (`paymentModes/taxes/currencies/emailTemplates`
   × orgId+orderBy; + `customFields(orgId,order)`) — their onSnapshots have been silently
   erroring for every tenant (stuck "loading", empty settings pages, disabled payment-mode
   pickers). 5 indexes added + deployed + READY (113 total... 108 report: 103+5).

**E2E result (all live on qa-smoke):**
| Check | Result |
|---|---|
| /dashboard/payments/new renders | ✅ form with picker/amount/mode/date/note |
| Picker scoping | ✅ shows ONLY "INV-000002 — $50.00 due"; paid INV-000001 excluded |
| Amount prefill + balance hint | ✅ 50 / "Remaining balance: $50.00" |
| Payment modes load | ✅ seeded "Bank Transfer"/"Cash" (post-index) |
| Submit → processPayment | ✅ "Payment recorded" toast |
| Invoice contract | ✅ INV-000002 → status=paid, amountPaid=50, amountDue=0 |
| Payments list | ✅ 2 real rows ($50 Bank Transfer + $150 legacy) |
| Leads stat cards | ✅ TOTAL **1** (was 0), VALUE $0 (no value field — correct), STARRED/QUALIFIED 0 |

Residual (cosmetic): the new payment row shows the customerId (processPayment's contract
stores no customerName) — the list's tolerant renderer falls back correctly; enrich later.
