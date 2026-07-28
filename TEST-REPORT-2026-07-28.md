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
