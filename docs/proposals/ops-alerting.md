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

## Create the alert — runnable, one time

Everything below can be done with `gcloud` by the deploy service account. Nothing here needs the
console. Replace the two placeholders and run it once.

**Placeholders:** `<DEPLOY_SA>` — the service-account email whose key is in the
`GOOGLE_APPLICATION_CREDENTIALS` repo secret. `<OPS_EMAIL>` — where alerts should go.

```bash
set -euo pipefail
PROJECT=goalo-6a269
DEPLOY_SA="<DEPLOY_SA>"          # e.g. deployer@goalo-6a269.iam.gserviceaccount.com
OPS_EMAIL="<OPS_EMAIL>"

gcloud config set project "$PROJECT"

# 1. IAM. The two permissions needed are logging.logMetrics.create and
#    monitoring.alertPolicies.create; these are the smallest predefined roles that carry them.
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${DEPLOY_SA}" --role="roles/logging.configWriter"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${DEPLOY_SA}" --role="roles/monitoring.alertPolicyEditor"

# 2. The log-based metric. Matches the structured line the route emits — on the `alert` KEY,
#    not on prose, so rewording the message never silently breaks the alert.
gcloud logging metrics create signup_blocked \
  --description="Signup duplicate-email guard failed closed; every signup is blocked." \
  --log-filter='resource.type="cloud_run_revision"
resource.labels.service_name="dosory"
severity>=ERROR
jsonPayload.alert="SIGNUP_BLOCKED"'

# 3. Email notification channel. Capture the id it prints.
CHANNEL=$(gcloud beta monitoring channels create \
  --display-name="Dosory ops email" \
  --type=email \
  --channel-labels=email_address="${OPS_EMAIL}" \
  --format="value(name)")
echo "channel: $CHANNEL"

# 4. The policy: count > 0 over 5 minutes.
cat > /tmp/signup-blocked-policy.json <<JSON
{
  "displayName": "Signup blocked (duplicate-email guard failing closed)",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "SIGNUP_BLOCKED errors > 0 in 5 minutes",
      "conditionThreshold": {
        "filter": "metric.type=\"logging.googleapis.com/user/signup_blocked\" AND resource.type=\"cloud_run_revision\"",
        "aggregations": [{ "alignmentPeriod": "300s", "perSeriesAligner": "ALIGN_SUM" }],
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0,
        "duration": "0s",
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": ["${CHANNEL}"],
  "alertStrategy": { "autoClose": "1800s" },
  "documentation": {
    "mimeType": "text/markdown",
    "content": "The duplicate-email guard (/api/auth/staff-key-available) is failing closed, so EVERY signup is being rejected. Failing closed is correct - failing open would allow cross-tenant staff-document overwrites - but it means the funnel has stopped. Check the Firestore read behind the guard. Source: app/api/auth/staff-key-available/route.ts"
  }
}
JSON

gcloud alpha monitoring policies create --policy-from-file=/tmp/signup-blocked-policy.json
rm -f /tmp/signup-blocked-policy.json
```

Two choices worth stating rather than burying:

- **`count > 0`, not a rate.** At current volume a single blocked signup is already worth
  knowing, and a rate threshold needs a baseline nobody has.
- **`duration: "0s"` with a 5-minute alignment window** fires on the first aligned interval
  containing an error, rather than requiring the condition to persist — a funnel outage should
  not have to last ten minutes to be noticed.

A cheaper companion worth adding later: the same shape on **5xx rate for the signup route**,
which catches failures this specific `catch` never sees.

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

### Activating it — the exact command

`OPS_REPORT_EMAIL` is **an email address, not a secret**, so it goes in ordinary Functions
config. Routing it through Secret Manager would add a grant, a version and a deploy step for a
value that is printed in every report it sends.

This project already uses the Firebase `.env.<projectId>` mechanism — `functions/.env.goalo-6a269`
exists and is gitignored — and firebase-functions v4 injects those into `process.env` at deploy,
which is what the function reads:

```bash
cd functions
echo 'OPS_REPORT_EMAIL=<OPS_EMAIL>' >> .env.goalo-6a269
cd .. && npx firebase-tools deploy --only functions:provisioningReconcile --project goalo-6a269
```

Do **not** use `firebase functions:config:set` for this: that populates `functions.config()`,
not `process.env`, and it is the API being removed in firebase-functions v6 (CLAUDE.md §11 has
the migration deadline).

Until it is set, the function logs a warning saying so and falls back to Cloud Logging — which
is to say, to nothing.

## Not proposed

- Paging / on-call rotation. There is no rotation, and inventing one to justify an alert is how
  alerts get muted.
- Sentry. It is already Stage 3.1.3 and has its own placeholder; this should route through it
  once it exists rather than growing a parallel alerting path.
