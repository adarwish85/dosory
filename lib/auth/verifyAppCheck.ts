import { NextRequest } from "next/server";
import { getAppCheck } from "firebase-admin/app-check";
import "@/lib/firebase-admin"; // ensure the admin app is initialized

/**
 * Optional App Check verification for custom /api routes.
 *
 * NOTE: this is a ready primitive, NOT wired into any route yet. App Check protects the
 * client→Firebase-SDK path automatically once enabled in the console; custom fetch() calls
 * to our /api routes only carry an App Check token if the client attaches it to the
 * `X-Firebase-AppCheck` header. Enforce this ONLY after App Check is live AND clients send
 * the header, or every request will 403.
 *
 * Returns true when a valid App Check token is present. Set APP_CHECK_ENABLED=true (server
 * env) as the master switch so routes can call `if (appCheckEnabled() && !(await verifyAppCheck(req)))`.
 */
export function appCheckEnabled(): boolean {
    return process.env.APP_CHECK_ENABLED === "true";
}

export async function verifyAppCheck(req: NextRequest): Promise<boolean> {
    const token = req.headers.get("X-Firebase-AppCheck");
    if (!token) return false;
    try {
        await getAppCheck().verifyToken(token);
        return true;
    } catch {
        return false;
    }
}
