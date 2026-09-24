#!/usr/bin/env bash
#
# Post-deploy smoke. Fails the release on any non-200.
#
# Two kinds of route are listed on purpose:
#
#   MUST WORK      - load-bearing surfaces. A regression here is a release-stopper.
#   MUST BE FIXED  - routes PROVEN to 404 on the deployed build today (verified 2026-09-24
#                    against build-2026-08-10-009, commit fa97cb24). They are in the list so a
#                    green smoke is evidence the fix shipped, not an assumption that it did.
#                    Until Batch F lands, this section is EXPECTED to fail — that is the point.
#
# Authenticated routes redirect to /login, which is a 200 after following redirects. A 404 or a
# 5xx is what fails. Note that `/dashboard/setup/help` is a page that EXISTS but which proxy.ts
# redirects to `/dashboard/setup/help-support`, a path with no page — so it is a genuine 404 that
# no amount of building will fix until that redirect entry is corrected (Batch D).
#
# Usage: scripts/ci/smoke.sh https://dosory.com [--allow-known-failures]

set -uo pipefail

BASE="${1:-https://dosory.com}"
ALLOW_KNOWN="${2:-}"

MUST_WORK=(
    "/"
    "/privacy"
    "/terms"
    "/login"
    "/signup"
    "/dashboard/invoices/new"
    "/dashboard/setup/organization/localization"
)

# Placeholder ids: these routes must exist as routes. A missing SEGMENT falls through to the
# tenant catch-all /[...slug] and renders a not-found, which is exactly the defect being proven.
MUST_BE_FIXED=(
    "/dashboard/invoices/smoke-id/edit"
    "/dashboard/customers/smoke-id/edit"
    "/dashboard/setup/help"
)

# Added by Batch G. Kept here, commented, so the list is the single record of what is expected.
# "/robots.txt"
# "/sitemap.xml"

fail=0
check() {
    local path="$1" label="$2"
    local code
    code=$(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 30 "${BASE}${path}" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        printf '  ok    %-3s %s\n' "$code" "$path"
    else
        printf '  FAIL  %-3s %s   [%s]\n' "$code" "$path" "$label"
        return 1
    fi
}

echo "Smoke against ${BASE}"
echo
echo "MUST WORK:"
for p in "${MUST_WORK[@]}"; do check "$p" "load-bearing" || fail=1; done

echo
echo "MUST BE FIXED (404 on the build deployed 2026-08-10; green here proves the fix shipped):"
known_fail=0
for p in "${MUST_BE_FIXED[@]}"; do check "$p" "known 404" || known_fail=1; done

echo
if [ "$known_fail" = "1" ]; then
    if [ "$ALLOW_KNOWN" = "--allow-known-failures" ]; then
        echo "NOTE: known-404 routes still failing, tolerated by --allow-known-failures."
    else
        echo "Known-404 routes are still 404. Batch F/D have not shipped, or have regressed."
        fail=1
    fi
fi

if [ "$fail" != "0" ]; then
    echo "SMOKE FAILED."
    exit 1
fi
echo "Smoke passed."
