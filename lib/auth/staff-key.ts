/**
 * The decision behind /api/auth/staff-key-available, as a pure function.
 *
 * Extracted so it can be tested directly rather than through a route that needs a verified
 * token, an Admin SDK and an emulator. The route stays a thin shell: fetch the document, call
 * this, serialise the answer.
 *
 * THE DEFECT IT GUARDS. `staff/{email}` is a ROOT document keyed by lowercased email, so the key
 * is global across every tenant, and signup writes it with a bare `setDoc` — a full replacement
 * including `orgId`. A second signup by the same person rebinds their staff record to the new
 * org, and the first org is left with no staff document at all. Seen in production: `fareed` and
 * `fareedmagdy`, same email, same day, one surviving staff document.
 */

export interface ExistingStaffDoc {
    orgId?: string | null;
}

export interface StaffKeyDecision {
    available: boolean;
    /** True when the existing document already belongs to the caller's own org. */
    sameOrg?: boolean;
    /** The org currently holding the key, when it is not available. */
    existingOrgId?: string;
}

/**
 * @param existing      the `staff/{email}` document, or null when it does not exist
 * @param callerOrgId   the org the caller is currently bound to, if any
 */
export function staffKeyDecision(
    existing: ExistingStaffDoc | null | undefined,
    callerOrgId?: string
): StaffKeyDecision {
    if (!existing) return { available: true };

    const existingOrgId = String(existing.orgId ?? "").trim();

    // An existing document with NO orgId is not a membership anyone would lose, but it is also
    // not something to silently overwrite — it is a malformed record, and replacing it hides
    // whatever produced it. Treat the key as taken and let a human look.
    if (!existingOrgId) return { available: false, existingOrgId: "" };

    // Re-running signup for the SAME org rewrites the document with the same tenant. That is
    // not data loss, and blocking it would break the login-time convergence path.
    if (callerOrgId && existingOrgId === callerOrgId) {
        return { available: true, sameOrg: true };
    }

    return { available: false, existingOrgId };
}
