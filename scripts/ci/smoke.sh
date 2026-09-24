#!/usr/bin/env bash
#
# Post-deploy smoke.
#
# TWO LISTS WITH DIFFERENT EXIT BEHAVIOUR, and the split is the whole point.
#
#   MUST_PASS  - load-bearing routes. A non-200 FAILS the release.
#   PENDING    - routes PROVEN to 404 on production today. A non-200 is reported and does NOT
#                fail the release.
#
# The first version of this script put both in one list, so the very first production release
# would have failed its own smoke job. That trains everyone to ignore a red smoke, which is worse
# than having no smoke at all: the next red one — a real one — gets waved through too.
#
# THE LIST CANNOT ROT IN EITHER DIRECTION:
#
#   * a MUST_PASS route that breaks        -> fails the release  (the obvious direction)
#   * a PENDING route that starts PASSING  -> fails the release  (the direction everyone forgets)
#
# The second is deliberate. A PENDING route going green means someone fixed it and did not move
# it to MUST_PASS in the same commit, so nothing is holding the fix in place and it can silently
# regress later. The failure message says exactly which line to move. This is the same
# one-directional-guard trap that has bitten this codebase repeatedly (CLAUDE.md standing lesson
# 9): a check that can only fail one way blesses everything that drifts the other.
#
# Authenticated routes redirect to /login, which is a 200 after following redirects. A 404 or a
# 5xx is what matters.
#
# Usage: scripts/ci/smoke.sh https://dosory.com

set -uo pipefail

BASE="${1:-https://dosory.com}"

# ---------------------------------------------------------------------------
# MUST_PASS — a non-200 here fails the release.
# ---------------------------------------------------------------------------
MUST_PASS=(
    "/"
    "/privacy"
    "/terms"
    "/login"
    "/signup"
    "/dashboard/invoices/new"
    "/dashboard/setup/organization/localization"
)

# ---------------------------------------------------------------------------
# PENDING — known 404 on the build deployed 2026-08-10 (commit fa97cb24), verified by hand.
# Move a line UP to MUST_PASS in the same commit that fixes it. The job tells you when.
#
#   /dashboard/invoices/<id>/edit   no such route exists          -> Batch F
#   /dashboard/customers/<id>/edit  no such route exists          -> Batch F
#   /dashboard/setup/help           page EXISTS, but proxy.ts redirects it to
#                                   /dashboard/setup/help-support, which has no page
#                                                                 -> Batch D
#
# Batch G adds:  /robots.txt  /sitemap.xml
# ---------------------------------------------------------------------------
PENDING=(
    "/dashboard/invoices/smoke-id/edit"
    "/dashboard/customers/smoke-id/edit"
    "/dashboard/setup/help"
)

status_of() {
    curl -sS -L -o /dev/null -w '%{http_code}' --max-time 30 "${BASE}$1" 2>/dev/null || echo "000"
}

fail=0
summary=()

echo "Smoke against ${BASE}"
echo
echo "MUST PASS — a non-200 fails this release:"
for p in "${MUST_PASS[@]}"; do
    code=$(status_of "$p")
    if [ "$code" = "200" ]; then
        printf '  ok    %-3s %s\n' "$code" "$p"
    else
        printf '  FAIL  %-3s %s\n' "$code" "$p"
        summary+=("BROKEN: $p returned $code")
        fail=1
    fi
done

echo
echo "PENDING — known 404s. Reported, not release-blocking:"
promoted=()
for p in "${PENDING[@]}"; do
    code=$(status_of "$p")
    if [ "$code" = "200" ]; then
        printf '  FIXED %-3s %s  <-- move this to MUST_PASS\n' "$code" "$p"
        promoted+=("$p")
    else
        printf '  todo  %-3s %s\n' "$code" "$p"
        summary+=("still pending: $p ($code)")
    fi
done

echo
if [ ${#promoted[@]} -gt 0 ]; then
    echo "SMOKE FAILED — a PENDING route is now passing but was never promoted."
    echo
    echo "  These routes work now. Nothing is holding them that way, so they can regress"
    echo "  silently. Move each one from PENDING to MUST_PASS in scripts/ci/smoke.sh, in the"
    echo "  same commit as the fix:"
    echo
    for p in "${promoted[@]}"; do echo "      $p"; done
    echo
    fail=1
fi

if [ "$fail" != "0" ]; then
    echo "SMOKE FAILED."
    for s in "${summary[@]}"; do echo "  - $s"; done
    exit 1
fi

echo "Smoke passed."
if [ ${#summary[@]} -gt 0 ]; then
    echo
    echo "Still pending (expected, not blocking):"
    for s in "${summary[@]}"; do echo "  - $s"; done
fi
exit 0
