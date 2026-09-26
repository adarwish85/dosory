# Scope — server-side, atomic signup provisioning (Proposal 1)

**Status: SCOPE ONLY. Not implemented, not started.** Its own batch, recon first, per the
2026-09-26 ruling. Written 2026-09-26.

This is the fix that actually closes the class. The guards shipped in `0ad3f4f8` and `69f62502`
catch the failure and report it; they do not make it impossible.

## What is wrong today

Signup is **seven sequential client-side writes with no transaction**
([app/signup/page.tsx:167-290](../../app/signup/page.tsx)):

1. `createUserWithEmailAndPassword` → Auth user
2. `setDoc(organizations/{subdomain})` → sets `orgCreated = true`
3. `setDoc(users/{uid})`
4. `setDoc(staff/{email})`
5. `POST /api/auth/set-claims`
6. `getIdToken(true)`
   6b. `POST /api/tenants/provision` → the subscription, **last**

Any failure between 2 and 6b leaves an org with no subscription. The rollback
(`if (auth.currentUser && !orgCreated) deleteUser(...)`) deliberately will not fire once the org
exists, because deleting the user would strand the subdomain. Sound reasoning — but it makes a
half-provisioned org a _designed_ outcome, recoverable only by `useEnsureProvisioned`, which runs
in `app/dashboard/layout.tsx` and therefore **only when someone loads the dashboard**. An owner
who never returns never triggers it.

Three prod orgs are in that state: `chicago`, `fareedmagdy`, `saad99`.

## The three questions that must be answered before any code

### 1. What happens to in-flight signups during the change?

A signup in progress when the new build starts serving is running the OLD client against the NEW
backend — a half-old, half-new sequence. Specifically:

- A client that already created its org under the old flow will call the old provision route. If
  that route has been changed or removed, its signup fails **after** the org exists.
- A new client calling an old still-cached route does the reverse.

**This is the same ordering hazard as the rules deploy**, and the answer is probably the same
shape: the new server path must be **additive and backward-compatible** for at least one release.
Concretely — keep `POST /api/tenants/provision` working unchanged, add the new atomic path
alongside it, move the client over, and only then retire the old route in a later release.

Open question for recon: is there any window in which BOTH paths could run for one org, and is
the result still idempotent? (`provisionTenant` is idempotent today; the new path must be too,
against itself and against the old one.)

### 2. Can the Admin-SDK path run before the auth user has a token?

This is the crux, and the answer decides the whole design.

The transaction must create the org, and the org needs an `ownerId` — so the Auth user must exist
first. But the current route authorises with `getAuthenticatedUser(request)`, which needs a
**bearer token**, and the token's `orgId` claim does not exist until `set-claims` has run, which
happens at step 5, _after_ the org. The present code works around this: `getAuthenticatedUser`
falls back to `users/{uid}.orgId` "when the token claim hasn't refreshed yet" — a fallback that
only works because `users/{uid}` was written at step 3.

So an atomic route cannot authorise the same way, because none of those documents exist yet.

Three candidate answers, to be evaluated in recon:

- **(a) Create the Auth user server-side too.** The route takes email + password, calls
  `admin.auth().createUser`, then transacts the org, user, staff and subscription documents, then
  returns a custom token the client signs in with. One call, genuinely atomic for the Firestore
  half. Cost: the password crosses our API rather than going straight to Firebase Auth, which is
  a meaningful change in what the signup endpoint handles and needs its own security review.
- **(b) Client creates the Auth user; route authorises on the raw ID token only.** No `orgId`
  claim needed — the route verifies the token, takes `uid` and `email` from it, and refuses if
  the uid already owns an org. Smaller change, keeps the password out of our hands. The Auth user
  is then still created outside the transaction, so "atomic" covers Firestore only — an Auth user
  with no org remains possible, though that is the _harmless_ direction (the existing rollback
  already handles it).
- **(c) Keep the client sequence, wrap only the Firestore writes in one transaction.** Smallest
  change; does not fix the case where the client dies between Auth creation and the transaction.

**(b) is the likely answer** — it fixes the damaging direction (org without subscription) without
taking on password handling. Recon should confirm the failure modes of (b) rather than assume.

### 3. How does subdomain reservation interact with a transaction that can roll back?

Today the subdomain **is** the org id (`const orgId = subdomain`), and availability is checked by
`/api/organizations/check-subdomain` before signup proceeds. That check is a read; the claim
happens when the org document is written. Between the two there is a race, and a rollback frees
the name.

Questions:

- **If the transaction aborts, is the subdomain free again?** With subdomain-as-document-id, yes
  automatically — nothing was committed. That is a genuine advantage of the atomic design over
  today's, where a failed signup can leave the name permanently taken by a shell org.
- **Does anything else already depend on the name being reserved?** `check-subdomain` queries both
  `organizations` by field and by document id. A transaction that creates the org by id makes the
  id itself the lock, which is the strongest available primitive here — Firestore transactions
  fail on a document that was created concurrently.
- **What about the three existing shell orgs?** They currently hold `chicago`, `fareedmagdy` and
  `saad99` with no owner able to sign in. Releasing those names is a separate data decision and
  must NOT be folded into this change.

## Recommendation for the batch

Recon first, answering the three questions above with code references rather than reasoning.
Then implement (b) if recon supports it, additively, keeping the old route alive for one release.

**Do not start by writing the transaction.** Start by establishing what authorises the call
before any document exists — question 2 determines the shape of everything else.

## Product fork this forecloses — flagged, not blocking

The duplicate-email guard (`0ad3f4f8`) makes **one email = one workspace**. That is correct
today, and not by preference: `staff/{email}` is a root document keyed by email, so two orgs for
one person are impossible _without data loss_ — the second signup overwrites the first org's
staff record. The guard is the honest expression of a constraint the data model already imposes.

But it does foreclose a real product shape: **one person owning several workspaces** (an agency
with a workspace per client, a founder with two companies). Today that person must use
`name+client1@` style aliases, which is a workaround they will feel.

**The enabler is re-keying staff by `uid` rather than email** — `staff/{uid}` (or an
`orgId__uid` composite) makes membership per-tenant and lets one identity hold several. That is
a data migration touching every staff read: `use-permissions`, the `set-claims` fallback, the
dashboard self-heal, `user-profile-provider`, the easykash checkout lookup, and the documented
"staff docs are keyed by lowercased email and carry authUid" invariant in CLAUDE.md §11.

**Not to be built now**, and deliberately not folded into the atomic-signup batch either — it is
a separate decision with its own migration, and doing it under cover of a provisioning fix is
how a data model changes without anyone deciding to change it. Recorded here so that when
multi-workspace is wanted, the blocker is already named.

## Not in this batch

- Releasing the three shell subdomains.
- Anything about expired trials (recorded as an open commercial decision in CLAUDE.md §11).
- Auto-repair of orphaned orgs — the reconciliation sweep is report-only by design, and
  2026-09-26 is the case that proves why.
