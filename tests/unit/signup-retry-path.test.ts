/**
 * After a failed provision, the user must not be dead-ended.
 *
 * THE HOLE. Signup now fails visibly when provisioning does not complete, but it deliberately
 * KEEPS the org and the auth user — deleting them would free the subdomain out from under
 * someone who may simply retry. That leaves the user owning an unprovisioned org, and the
 * natural next move is to sign up again with the same subdomain. That hits TWO walls:
 *
 *   1. `createUserWithEmailAndPassword` throws `auth/email-already-in-use` (their account was
 *      kept on purpose).
 *   2. Past that, `/api/organizations/check-subdomain` reports their OWN subdomain as taken:
 *      the signup page calls it without an Authorization header, so `ownOrg` is `undefined`
 *      (route line 58) and `byId.exists && byId.id !== ownOrg` counts the org they own as a
 *      conflict.
 *
 * So a silent failure would have been replaced with a dead end, which is not an improvement.
 *
 * THE RECOVERY THAT WORKS is signing in: `useEnsureProvisioned` runs on dashboard load, sees
 * `subscriptions/{orgId}` missing, and calls the idempotent provision route. These tests pin
 * that signup says so, rather than telling the user to pick a different subdomain.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { signupErrorKey, shouldOfferSignIn, takenByOrg, STAFF_KEY_TAKEN_CODE } from "@/lib/auth/signup-errors";

const ROOT = join(__dirname, "..", "..");
const err = (code: string) => Object.assign(new Error(code), { code });

describe("the two rejections do NOT share copy", () => {
    // They arrive differently and mean opposite things: one is help, one is a refusal.
    const firebaseDup = err("auth/email-already-in-use");
    const guardDup = Object.assign(new Error("staff key taken"), {
        code: STAFF_KEY_TAKEN_CODE,
        orgId: "beit",
    });

    test("(a) the ambiguous Firebase rejection maps to the resume-setup key", () => {
        expect(signupErrorKey(firebaseDup)).toBe("auth.signup.emailExistsResumeSetup");
    });

    test("(b) the guard's own rejection maps to a DIFFERENT key", () => {
        expect(signupErrorKey(guardDup)).toBe("auth.signup.staffKeyTaken");
    });

    test("they are not the same key — sharing copy is the defect", () => {
        expect(signupErrorKey(firebaseDup)).not.toBe(signupErrorKey(guardDup));
    });

    test("only the guard's rejection can name the holding workspace", () => {
        expect(takenByOrg(guardDup)).toBe("beit");
        expect(takenByOrg(firebaseDup)).toBe("");
        expect(takenByOrg(new Error("x"))).toBe("");
    });

    test("both offer sign-in, because both mean an account exists", () => {
        expect(shouldOfferSignIn(firebaseDup)).toBe(true);
        expect(shouldOfferSignIn(guardDup)).toBe(true);
    });
});

describe("signupErrorKey", () => {
    test("THE RETRY CASE: an existing email routes to resume-setup, not to a generic error", () => {
        expect(signupErrorKey(err("auth/email-already-in-use"))).toBe("auth.signup.emailExistsResumeSetup");
    });

    test("and that case offers a sign-in link", () => {
        expect(shouldOfferSignIn(err("auth/email-already-in-use"))).toBe(true);
    });

    test("other failures do not offer sign-in — it would be wrong advice", () => {
        for (const c of ["auth/weak-password", "auth/invalid-email", "auth/network-request-failed", "boom"]) {
            expect([c, shouldOfferSignIn(err(c))]).toEqual([c, false]);
        }
    });

    test("known codes map to their own message rather than one catch-all", () => {
        expect(signupErrorKey(err("auth/weak-password"))).toBe("auth.signup.weakPassword");
        expect(signupErrorKey(err("auth/invalid-email"))).toBe("auth.signup.invalidEmail");
        expect(signupErrorKey(err("auth/network-request-failed"))).toBe("auth.signup.networkFailed");
        expect(signupErrorKey(err("auth/timeout"))).toBe("auth.signup.networkFailed");
    });

    test("an unknown or malformed error degrades instead of throwing", () => {
        expect(signupErrorKey(err("auth/something-new"))).toBe("auth.signup.genericFailure");
        expect(signupErrorKey(new Error("no code"))).toBe("auth.signup.genericFailure");
        expect(signupErrorKey(null)).toBe("auth.signup.genericFailure");
        expect(signupErrorKey(undefined)).toBe("auth.signup.genericFailure");
        expect(signupErrorKey("a string")).toBe("auth.signup.genericFailure");
    });
});

describe("the signup page routes the user to the working recovery", () => {
    const signup = readFileSync(join(ROOT, "app", "signup", "page.tsx"), "utf8");

    test("it maps the error rather than printing the raw Firebase message", () => {
        expect(signup).toMatch(/signupErrorKey\(err\)/);
    });

    test("it renders a sign-in link when the email already exists", () => {
        expect(signup).toMatch(/offerSignIn && \(/);
        expect(signup).toMatch(/auth\.signup\.goToSignIn/);
        expect(signup).toMatch(/href="\/login"/);
    });
});

describe("the messages exist in both locales and say the right thing", () => {
    const en = JSON.parse(readFileSync(join(ROOT, "lib/i18n/locales/en.json"), "utf8"));
    const ar = JSON.parse(readFileSync(join(ROOT, "lib/i18n/locales/ar.json"), "utf8"));
    const KEYS = [
        "auth.signup.emailExistsResumeSetup",
        "auth.signup.goToSignIn",
        "auth.signup.weakPassword",
        "auth.signup.invalidEmail",
        "auth.signup.networkFailed",
        "auth.signup.genericFailure",
        "auth.signup.provisioningFailed",
        "auth.signup.staffKeyTaken",
    ];

    test.each(KEYS)("%s is present and non-empty in both locales", (k) => {
        expect([k, typeof en[k], String(en[k] || "").trim().length > 0]).toEqual([k, "string", true]);
        expect([k, typeof ar[k], String(ar[k] || "").trim().length > 0]).toEqual([k, "string", true]);
    });

    test("the resume-setup message actually mentions signing in", () => {
        // A generic "email already in use" would be accurate and useless here.
        expect(String(en["auth.signup.emailExistsResumeSetup"]).toLowerCase()).toContain("sign in");
    });

    test("(a) the ambiguous message must be true of BOTH cases", () => {
        const m = String(en["auth.signup.emailExistsResumeSetup"]).toLowerCase();
        // It must NOT promise that setup will complete as though case (a) were certain —
        // an agency owner refused a second workspace would be sent into the wrong one.
        expect(m).toContain("one workspace");
        expect(m).toContain("if your workspace setup did not finish");
    });

    test("(b) the guard message names the workspace and states the rule", () => {
        const m = String(en["auth.signup.staffKeyTaken"]);
        expect(m).toContain("{org}");
        expect(m.toLowerCase()).toContain("one workspace");
    });

    test("the two messages are not the same string in either locale", () => {
        expect(en["auth.signup.emailExistsResumeSetup"]).not.toBe(en["auth.signup.staffKeyTaken"]);
        expect(ar["auth.signup.emailExistsResumeSetup"]).not.toBe(ar["auth.signup.staffKeyTaken"]);
    });

    test("the Arabic guard message keeps the {org} placeholder", () => {
        // interpolate() leaves unknown tokens intact, so a dropped placeholder renders "{org}"
        // to an Arabic-speaking user.
        expect(String(ar["auth.signup.staffKeyTaken"])).toContain("{org}");
    });

    test("the provisioning-failure message does not claim success", () => {
        const m = String(en["auth.signup.provisioningFailed"]).toLowerCase();
        expect(m).toContain("could not");
        expect(m).not.toContain("welcome");
    });
});
