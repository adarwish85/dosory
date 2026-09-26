/**
 * Maps a signup failure to the message the user should actually see.
 *
 * WHY THIS EXISTS — THE RETRY DEAD END. When provisioning fails, signup now fails visibly but
 * deliberately KEEPS the org and the auth user (deleting them would free the subdomain out from
 * under someone who may simply retry). That leaves the user owning an unprovisioned org, and
 * their instinct is to sign up again. Doing so hits two walls:
 *
 *   1. `createUserWithEmailAndPassword` throws `auth/email-already-in-use` — their account was
 *      kept.
 *   2. Even past that, `/api/organizations/check-subdomain` reports their own subdomain as
 *      taken, because the signup page calls it unauthenticated, so `ownOrg` is undefined and
 *      the org they own counts as a conflict.
 *
 * The recovery that DOES work is signing in: `useEnsureProvisioned` runs on dashboard load,
 * notices the missing subscription, and calls the idempotent provision route. So the fix is not
 * to let signup retry — it is to stop telling the user to pick a different subdomain, and route
 * them to the path that resumes their setup.
 *
 * A generic "email already in use" would be accurate and still unhelpful: it reads as "you
 * already have an account elsewhere", not "your workspace is half-built and signing in finishes
 * it".
 */

export type SignupErrorKey =
    | "auth.signup.emailExistsResumeSetup"
    | "auth.signup.weakPassword"
    | "auth.signup.invalidEmail"
    | "auth.signup.networkFailed"
    | "auth.signup.genericFailure";

/** Firebase Auth error codes arrive on the error object as `.code`. */
function codeOf(err: unknown): string {
    if (err && typeof err === "object" && "code" in err) return String((err as { code: unknown }).code);
    return "";
}

/**
 * @returns the i18n key for the message to show. Never returns a raw Firebase string — those
 *          leak implementation detail and are untranslated.
 */
export function signupErrorKey(err: unknown): SignupErrorKey {
    switch (codeOf(err)) {
        case "auth/email-already-in-use":
            // The load-bearing case: this is what a user hits when retrying after a failed
            // provision, and the message has to send them to sign-in rather than to a new
            // subdomain.
            return "auth.signup.emailExistsResumeSetup";
        case "auth/weak-password":
            return "auth.signup.weakPassword";
        case "auth/invalid-email":
            return "auth.signup.invalidEmail";
        case "auth/network-request-failed":
        case "auth/timeout":
            return "auth.signup.networkFailed";
        default:
            return "auth.signup.genericFailure";
    }
}

/**
 * True when the failure means "you already have an account", which is the state in which the
 * UI should offer a sign-in link rather than a retry.
 */
export function shouldOfferSignIn(err: unknown): boolean {
    return codeOf(err) === "auth/email-already-in-use";
}
