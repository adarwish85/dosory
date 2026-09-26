# Where failure signals actually land — and the two that need a channel

**Status: PROPOSAL for the alert policies. The code side is shipped.** Written 2026-09-26.

The premise, which the guard work made concrete: **a log line in a console nobody opens is not a
signal.** Two failures shipped this batch are invisible-by-default, and both are the kind that
cost money quietly rather than paging anyone.

## What lands where, today

| signal                           | runtime                                           | goes to                                                  | alerts?                             |
| -------------------------------- | ------------------------------------------------- | -------------------------------------------------------- | ----------------------------------- |
| `SIGNUP_BLOCKED` (staff-key 503) | Next route handler on **App Hosting → Cloud Run** | stderr → Cloud Logging, severity ERROR, service `dosory` | **no**                              |
| provisioning orphans             | **Cloud Functions** (`provisioningReconcile`)     | `functions.logger.error/warn/info` → Cloud Logging       | **no**                              |
| provisioning orphans             | same                                              | **daily email via Resend**                               | yes, once `OPS_REPORT_EMAIL` is set |

Note the runtime split, which is the thing that trips people here: `functions.logger` is **not**
available in the Next route handlers, because those run on Cloud Run, not in the Functions
runtime. The route therefore writes a single structured JSON line to stderr with
`severity: "ERROR"` and `alert: "SIGNUP_BLOCKED"`, so a log-based metric can match the key
without parsing prose. Same reason `OPS_REPORT_EMAIL` has to be set on the **Functions** side and
not in `apphosting.yaml` — App Hosting env vars are not Cloud Functions env vars (standing
lesson, 2026-08-10).

## Why `SIGNUP_BLOCKED` needs an alert and not just a log

The duplicate-email guard fails **closed**: if the Firestore read behind it fails, the endpoint
returns 503 and signup aborts. That is the right call — failing open would let the overwrite
through, which is the cross-tenant data loss the guard exists to prevent.

But failing closed means **every signup stops**. A signup funnel that has silently stopped
converting looks exactly like a quiet week. Nobody gets an error; there is simply no new
business. That is the same shape of invisible failure as the three unprovisioned orgs — and those
went unnoticed for three months.

**Proposed policy** (Ahmed to create; needs console access this session does not have):

- **Condition:** log-based metric on the `dosory` Cloud Run service matching
  `jsonPayload.alert = "SIGNUP_BLOCKED"`, **count > 0 over 5 minutes**.
- **Why count > 0 rather than a rate:** at current volume a single blocked signup is already
  worth knowing about, and a rate threshold would need a baseline nobody has.
- **Channel:** email to the same address as `OPS_REPORT_EMAIL`. Not Slack — there is no
  workspace wired to this project, and a channel that does not exist is worse than none.

A useful companion, cheaper to add and harder to get wrong: the same metric on **5xx rate for
the signup route**, which catches failures this specific `catch` never sees.

## The reconciliation report — why it emails on a clean run too

`provisioningReconcile` sends a daily digest **whether or not anything is wrong**, and the
headline always carries the count:

> `OK — all 16 organizations have a subscription document.`

A report that only arrives when something is broken trains its reader to read absence as "fine".
Absence is indistinguishable from the job being unscheduled, erroring on cold start, or quietly
removed from `index.ts`. With a daily line either way, **a quiet inbox means "checked and fine"**,
and a missing email is itself the anomaly.

The non-clean mail is a table built for one decision — customer or shell:

| verdict | orgId | name | created | status | owner | auth user? | last sign-in | docs |

`auth user = NO` **and** `docs = 0` is almost certainly signup debris. That combination described
all three orgs found on 2026-09-26, and it is why the sweep reports instead of repairing: an
auto-repair would have minted three fresh 14-day trials on accounts nobody can sign into, and
buried the signup defect that created them.

**Required to activate:** set `OPS_REPORT_EMAIL` in the **Cloud Functions** environment (not
`apphosting.yaml`). Until it is set the function logs a warning saying so and falls back to
Cloud Logging, which is to say: to nothing.

## Not proposed

- Paging / on-call rotation. There is no rotation, and inventing one to justify an alert is how
  alerts get muted.
- Sentry. It is already Stage 3.1.3 and has its own placeholder; this should route through it
  once it exists rather than growing a parallel alerting path.
