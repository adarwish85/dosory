/**
 * Invoice numbers: one generator, no timestamps, one label.
 *
 * Prod evidence this exists for: org "gomla" carries invoices numbered 1782922103813,
 * 1782922102180 and 1782922104393 — Date.now() values, written 2.2 seconds apart on
 * 2026-07-01. The counter transaction was permission-denied for every tenant until the
 * `organizations/{orgId}/counters/{doc}` rule landed on 2026-07-17, and the generator's catch
 * silently returned a timestamp instead of failing. Two of those three documents are also a
 * duplicate submit that no number collision could stop, because timestamps never collide.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { invoiceNumberLabel } from "@/lib/invoices/invoice-number";

const ROOT = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name.startsWith("._") || name === "node_modules" || name === ".next") continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(name)) out.push(full);
    }
    return out;
}

const SOURCES = [...walk(join(ROOT, "lib")), ...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))];

describe("no code path mints an invoice number from the clock", () => {
    test("nothing builds an INV- number out of Date.now()", () => {
        const offenders = SOURCES.filter((f) => /INV-\$\{Date\.now\(\)/.test(readFileSync(f, "utf8"))).map((f) =>
            f.slice(ROOT.length + 1)
        );
        expect(offenders).toEqual([]);
    });

    test("the generator has no timestamp fallback left in its catch", () => {
        const src = readFileSync(join(ROOT, "lib", "services", "invoice-service.ts"), "utf8");
        expect(src).not.toMatch(/fallbackNum/);
        // It must fail loudly instead, so the caller never persists an unusable number.
        expect(src).toMatch(/throw new Error\(\s*"Could not allocate an invoice number/);
    });
});

describe("there is exactly one invoice number generator", () => {
    test("use-invoices does not define its own", () => {
        const src = readFileSync(join(ROOT, "lib", "hooks", "use-invoices.ts"), "utf8");
        expect(src).not.toMatch(/(async )?function generateInvoiceNumber/);
        expect(src).toMatch(/generateInvoiceNumber \} from "@\/lib\/services\/invoice-service"/);
    });

    test("only invoice-service declares it", () => {
        const declarers = SOURCES.filter((f) =>
            /(export )?async function generateInvoiceNumber/.test(readFileSync(f, "utf8"))
        ).map((f) => f.slice(ROOT.length + 1));
        expect(declarers).toEqual(["lib/services/invoice-service.ts"]);
    });
});

describe("invoiceNumberLabel", () => {
    test("prefers the formatted number", () => {
        expect(invoiceNumberLabel({ number: 2, numberFormatted: "INV-000002" })).toBe("INV-000002");
    });

    test("falls back to the raw number for documents written before it was stored", () => {
        expect(invoiceNumberLabel({ number: 2 })).toBe("2");
    });

    test("an empty formatted value does not win over a real raw number", () => {
        expect(invoiceNumberLabel({ number: 7, numberFormatted: "  " })).toBe("7");
    });

    test("falls back to the id rather than rendering blank", () => {
        expect(invoiceNumberLabel({ id: "abc123" })).toBe("abc123");
    });

    test("a null or undefined document renders a dash, not 'undefined'", () => {
        expect(invoiceNumberLabel(null)).toBe("-");
        expect(invoiceNumberLabel(undefined)).toBe("-");
        expect(invoiceNumberLabel({})).toBe("-");
    });

    test("number 0 is not swallowed by a truthiness check", () => {
        expect(invoiceNumberLabel({ number: 0, id: "x" })).toBe("0");
    });
});
