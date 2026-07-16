import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Firestore-backed fixed-window rate limiter for API routes.
 *
 * Works across App Hosting/Cloud Run instances (shared state in Firestore), unlike
 * an in-memory limiter. It is the "no new dependency" tier — it does NOT protect the
 * client→Firebase-Auth account-creation path (that is App Check's job); it protects
 * our own server routes from bursts.
 *
 * Design: one counter doc per (key, window) at rate_limits/{key}__{windowIndex},
 * incremented in a transaction. FAILS OPEN — if Firestore errors, the request is
 * allowed (a limiter must never take the site down).
 *
 * Old buckets carry `expiresAt`; configure a Firestore TTL policy on
 * `rate_limits.expiresAt` to auto-purge them (a one-time console/gcloud op — the
 * limiter is correct without it, buckets just accumulate).
 */

export interface RateLimitOptions {
    /** Logical bucket name, e.g. "check-subdomain". Combined with the client id. */
    key: string;
    /** Max requests allowed per window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
    /** Override the client identifier (defaults to the caller IP). */
    id?: string;
}

/** Best-effort client IP from the App Hosting / Cloud Run proxy chain. */
export function clientIp(req: NextRequest): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return req.headers.get("x-real-ip") || "unknown";
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    retryAfterSeconds: number;
}

/** Core check. Returns allow/deny; never throws (fails open on Firestore error). */
export async function checkRateLimit(req: NextRequest, opts: RateLimitOptions): Promise<RateLimitResult> {
    const id = opts.id || clientIp(req);
    const windowIndex = Math.floor(Date.now() / opts.windowMs);
    // Sanitize into a safe doc id (no slashes; bounded length).
    const docId = `${opts.key}__${id}__${windowIndex}`.replace(/[/#?\s]/g, "_").slice(0, 400);
    const ref = adminDb.collection("rate_limits").doc(docId);

    try {
        // FieldValue.increment is commutative — concurrent increments never contend or abort
        // (unlike a read-modify-write transaction, which fails open under a real burst). We
        // then read back the running total. The read may lag by a few under heavy concurrency,
        // which only makes the limiter slightly more lenient at the exact boundary — acceptable.
        await ref.set(
            {
                count: FieldValue.increment(1),
                key: opts.key,
                windowIndex,
                // Keep the bucket ~2 windows for TTL cleanup.
                expiresAt: new Date(Date.now() + opts.windowMs * 2),
            },
            { merge: true }
        );
        const snap = await ref.get();
        const count = (snap.data()?.count as number) ?? 1;

        const allowed = count <= opts.limit;
        const windowEndMs = (windowIndex + 1) * opts.windowMs;
        return {
            allowed,
            remaining: Math.max(0, opts.limit - count),
            limit: opts.limit,
            retryAfterSeconds: allowed ? 0 : Math.ceil((windowEndMs - Date.now()) / 1000),
        };
    } catch (err) {
        // Fail open: never block legitimate traffic because the limiter backend hiccuped.
        console.error(`[rate-limit] ${opts.key} check failed (allowing):`, err);
        return { allowed: true, remaining: opts.limit, limit: opts.limit, retryAfterSeconds: 0 };
    }
}

/**
 * Convenience guard: returns a 429 NextResponse if the limit is exceeded, else null.
 * Usage at the top of a route handler:
 *   const limited = await enforceRateLimit(req, { key: "check-subdomain", limit: 30, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export async function enforceRateLimit(req: NextRequest, opts: RateLimitOptions): Promise<NextResponse | null> {
    const result = await checkRateLimit(req, opts);
    if (result.allowed) return null;
    return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        {
            status: 429,
            headers: {
                "Retry-After": String(result.retryAfterSeconds),
                "X-RateLimit-Limit": String(result.limit),
                "X-RateLimit-Remaining": "0",
            },
        }
    );
}
