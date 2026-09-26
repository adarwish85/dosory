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
 *
 * WHAT THIS CANNOT DISTINGUISH, stated rather than papered over. Two situations mean opposite
 * things to the reader:
 *
 *   (a) "your workspace exists but setup did not finish" — help; signing in completes it.
 *   (b) "this email already owns a workspace and cannot own a second" — a refusal.
 *
 * Both arrive as `auth/email-already-in-use` from `createUserWithEmailAndPassword`
 * (app/signup/page.tsx:171), which runs BEFORE the duplicate guard at :186 — so whenever the
 * auth user exists, step 1 throws and the guard, the one component that knows which case it is,
 * never runs. Telling them apart at that moment would need an UNAUTHENTICATED lookup of "does
 * this email own a provisioned workspace", which is an account-enumeration oracle on a public
 * signup page. That is a real security cost for a copy improvement, so it is not done.
 *
 * The copy for that shared case therefore has to be true of both: it says an account exists,
 * sends the reader to sign in, and states the one-email-one-workspace rule so an agency owner
 * understands immediately why a second workspace was refused — instead of promising that "setup
 * will complete", which is case (a)'s words and would send them into the wrong workspace
 * concluding the product is broken.
 *
 * The guard's OWN rejection IS unambiguous and gets its own message — it fires only when the
 * auth user did not exist but the staff key is held, and it knows the holding org by name.
 */

/**
 * A synthetic code for the duplicate-email guard's own rejection, so it can be told apart from
 * Firebase's. See STAFF_KEY_TAKEN_CODE below.
 */
export const STAFF_KEY_TAKEN_CODE = "dosory/staff-key-taken";

export type SignupErrorKey =
    | "auth.signup.emailExistsResumeSetup"
    | "auth.signup.staffKeyTaken"
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
        case STAFF_KEY_TAKEN_CODE:
            // The guard's OWN rejection, and the only one of the two that is unambiguous: it
            // fires when the auth user did NOT exist (so step 1 succeeded) but a staff document
            // for this email already belongs to another org. The guard knows which org, so the
            // copy can be specific.
            return "auth.signup.staffKeyTaken";
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
    const c = codeOf(err);
    return c === "auth/email-already-in-use" || c === STAFF_KEY_TAKEN_CODE;
}

/**
 * The org currently holding the staff key, when the guard is what rejected. Empty otherwise.
 * Safe to show: the caller proved they own the email by presenting a verified token for it.
 */
export function takenByOrg(err: unknown): string {
    if (codeOf(err) !== STAFF_KEY_TAKEN_CODE) return "";
    if (err && typeof err === "object" && "orgId" in err) return String((err as { orgId: unknown }).orgId ?? "");
    return "";
}
