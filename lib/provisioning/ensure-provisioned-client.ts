"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

/**
 * F1 (self-healing provisioning) — client side.
 *
 * Server truth: /api/tenants/provision is idempotent (check-before-create per doc), so the
 * convergence strategy is simply "call it until it succeeds". Two entry points:
 *
 *  - provisionWithRetry(): used by signup (F1b). The old single fetch could fail client-side
 *    (flaky network, extension/bot interference) and strand a half-provisioned tenant — the
 *    2026-07-28 smoke hit exactly that (set-claims landed, provision never reached the server).
 *
 *  - useEnsureProvisioned(): mounted in the dashboard layout (F1c). If an authenticated
 *    member's org has no subscriptions/{orgId} doc (readable by rule: token orgId == docId),
 *    the tenant is half-provisioned — heal by calling the idempotent route, then re-check.
 *    Healthy tenants pay one cheap getDoc; the "finishing setup" UI only appears when the
 *    doc is confirmed missing.
 */

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

export async function provisionWithRetry(user: User, orgId: string): Promise<{ ok: boolean; lastError?: string }> {
    let lastError = "";
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
            const res = await fetch("/api/tenants/provision", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Fresh token each attempt — the first signup attempt races the claim refresh.
                    Authorization: `Bearer ${await user.getIdToken()}`,
                },
                body: JSON.stringify({ orgId }),
            });
            if (res.ok) return { ok: true };
            lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
            // 4xx (auth/ownership/rate-limit) won't improve by retrying immediately with the
            // same token — but a 401/403 right after signup can be a stale token, so retry
            // those too; only give up early on 400 (malformed request is deterministic).
            if (res.status === 400) break;
        } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
        }
        if (attempt < RETRY_DELAYS_MS.length) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
    }
    return { ok: false, lastError };
}

export type ProvisioningStatus = "checking" | "ok" | "healing" | "failed";

export function useEnsureProvisioned(user: User | null | undefined, orgId: string | undefined): ProvisioningStatus {
    const [status, setStatus] = useState<ProvisioningStatus>("checking");
    const ranForOrg = useRef<string | null>(null);

    useEffect(() => {
        if (!user || !orgId) return;
        if (ranForOrg.current === orgId) return; // once per org per mount
        ranForOrg.current = orgId;

        let cancelled = false;
        (async () => {
            try {
                // Skip when the token's orgId doesn't match (impersonation / claim drift):
                // the provision route would 403, and healing is not this session's job.
                const tokenResult = await user.getIdTokenResult();
                if (tokenResult.claims.orgId !== orgId) {
                    if (!cancelled) setStatus("ok");
                    return;
                }

                const subSnap = await getDoc(doc(db, "subscriptions", orgId));
                if (subSnap.exists()) {
                    if (!cancelled) setStatus("ok");
                    return;
                }

                // Half-provisioned tenant — heal via the idempotent route.
                if (!cancelled) setStatus("healing");
                console.warn(`[provision-heal] subscriptions/${orgId} missing — invoking idempotent provision`);
                const result = await provisionWithRetry(user, orgId);
                if (cancelled) return;
                if (result.ok) {
                    setStatus("ok");
                } else {
                    console.error(`[provision-heal] failed after retries: ${result.lastError}`);
                    // Fail open: a broken-but-visible dashboard beats an infinite setup screen,
                    // and the guard runs again on next login.
                    setStatus("failed");
                }
            } catch (e) {
                // Read failed (offline, rules edge) — don't block the dashboard on the guard.
                console.warn("[provision-heal] check skipped:", e);
                if (!cancelled) setStatus("ok");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, orgId]);

    return status;
}
