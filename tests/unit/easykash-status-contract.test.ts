/**
 * The reconciler carries its OWN copy of mapProviderStatus, because functions/ and the Next app
 * cannot share a module — separate tsconfigs, and two different firebase-admin majors. A
 * duplicated mapping with no contract test is exactly how this codebase has shipped a fix to the
 * copy nobody calls (the ticket saga, calculateInvoiceTotals). So: both implementations are
 * loaded and required to agree, over every status the provider documents.
 *
 * The panel caught the original comment claiming this test existed when it did not. It does now.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { mapProviderStatus as appMap } from "@/lib/billing/easykash-core";

const REPO = join(__dirname, "..", "..");
const RECONCILER = join(REPO, "functions", "src", "easykashReconcile.ts");

/** Extract and evaluate the reconciler's copy, so the test runs the REAL source, not a paraphrase. */
function loadReconcilerMap(): (raw: unknown) => string {
    const src = readFileSync(RECONCILER, "utf8");
    const start = src.indexOf("function mapProviderStatus");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("\n}", start);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end + 2).replace(/: unknown|: string/g, "");

    return new Function(`${body}; return mapProviderStatus;`)() as (raw: unknown) => string;
}

describe("mapProviderStatus — the app and the reconciler must agree", () => {
    const reconcilerMap = loadReconcilerMap();

    // Every status EasyKash's Payment Inquiry page documents, plus the shapes a real payload can
    // arrive in and one value they have not invented yet.
    const CASES = [
        "PAID",
        "DELIVERED",
        "FAILED",
        "EXPIRED",
        "NEW",
        "REFUNDED",
        "CANCELED",
        "CANCELLED",
        "  paid  ",
        "Paid",
        "",
        "SOMETHING_NEW",
    ];

    test.each(CASES)("agree on %p", (raw) => {
        expect([raw, reconcilerMap(raw)]).toEqual([raw, appMap(raw)]);
    });

    test("both leave an unrecognised status UNKNOWN rather than guessing a terminal state", () => {
        expect(appMap("WEIRD")).toBe("unknown");
        expect(reconcilerMap("WEIRD")).toBe("unknown");
    });

    test("the app implementation covers every documented status (guards the list itself)", () => {
        const documented = ["DELIVERED", "EXPIRED", "FAILED", "NEW", "PAID", "REFUNDED", "CANCELED"];
        expect(documented.filter((s) => appMap(s) === "unknown")).toEqual([]);
    });
});
