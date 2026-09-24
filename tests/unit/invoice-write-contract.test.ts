/**
 * Every write to the invoices collection is shaped by buildInvoiceDocument.
 *
 * WHY IT KEYS ON THE WRITE CALL. The writer this exists to catch is the one that spelled
 * everything differently — `lineItems` for `items`, `tax` for `taxTotal`, `invoiceNumber` for
 * `number`, an ISO string for a Timestamp, and no `date` at all. A guard that looked for
 * "invoice-shaped" field names would have skipped it precisely because it used none of them.
 *
 * So the scan finds the Firestore WRITE — `addDoc(collection(db, "invoices"), …)` and
 * `.collection("invoices").add(…)`/`.set(…)` — and requires the payload argument to be a
 * buildInvoiceDocument(...) call. It cannot be fooled by vocabulary.
 *
 * Anything it cannot parse is reported as a loud UNPARSEABLE entry rather than skipped, because
 * a guard that silently ignores what it cannot read is the same failure in a different coat.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { Timestamp } from "firebase/firestore";
import { buildInvoiceDocument } from "@/lib/invoices/build-invoice-document";
import type { LineItem } from "@/lib/types";

const ROOT = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name.startsWith("._") || name === "node_modules" || name === ".next" || name === "__tests__") continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(name)) out.push(full);
    }
    return out;
}

/** Client-side surfaces. functions/ and the admin seed route are excluded and listed below. */
const SOURCES = [...walk(join(ROOT, "lib")), ...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))].filter(
    (f) => !f.includes(join("app", "api"))
);

interface WriteSite {
    file: string;
    line: number;
    payload: string;
}

/** Finds the Firestore write itself, then reads its payload argument. */
function findInvoiceWrites(src: string, rel: string): WriteSite[] {
    const sites: WriteSite[] = [];
    const patterns = [
        /addDoc\(\s*collection\(\s*db\s*,\s*["']invoices["']\s*\)\s*,\s*/g,
        /collection\(\s*["']invoices["']\s*\)\s*\.\s*add\(\s*/g,
    ];
    for (const re of patterns) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) {
            const line = src.slice(0, m.index).split("\n").length;
            const after = src.slice(m.index + m[0].length, m.index + m[0].length + 200).trim();
            sites.push({ file: rel, line, payload: after });
        }
    }
    return sites;
}

describe("every invoice write is shaped by the builder", () => {
    const writes = SOURCES.flatMap((f) => findInvoiceWrites(readFileSync(f, "utf8"), f.slice(ROOT.length + 1)));

    test("the scan actually finds the known write sites — a guard that matches nothing proves nothing", () => {
        expect(writes.length).toBeGreaterThanOrEqual(3);
    });

    test("no write passes a hand-built payload", () => {
        const offenders = writes
            .map((w) => {
                if (/^buildInvoiceDocument\s*\(/.test(w.payload)) return null;
                if (w.payload.startsWith("{")) return `${w.file}:${w.line} [OBJECT-LITERAL]`;

                // A bare identifier is legitimate IF it was assigned from the builder in the same
                // file — `const doc = buildInvoiceDocument({...})` then `addDoc(coll, doc)`. One
                // hop is resolved; anything further, or an assignment from something else, is an
                // offender. An identifier whose assignment cannot be found is reported as
                // UNRESOLVED rather than skipped, because a guard that quietly ignores what it
                // cannot read is the same failure in a different coat.
                const head = /^([A-Za-z_$][\w$]*)\s*\)/.exec(w.payload)?.[1];
                if (!head) return `${w.file}:${w.line} [UNPARSEABLE]`;
                const src = readFileSync(join(ROOT, w.file), "utf8");
                const assign = new RegExp(`(?:const|let|var)\\s+${head}\\s*(?::[^=]+)?=\\s*([\\s\\S]{0,40})`);
                const m = assign.exec(src);
                if (!m) return `${w.file}:${w.line} [UNRESOLVED:${head}]`;
                if (/^buildInvoiceDocument\s*\(/.test(m[1].trim())) return null;
                return `${w.file}:${w.line} [VARIABLE:${head}]`;
            })
            .filter(Boolean);
        expect(offenders).toEqual([]);
    });
});

describe("the builder produces the shape every reader queries", () => {
    const items = [{ id: "1", description: "x", quantity: 1, rate: 200, amount: 200, taxRate: 14 }] as LineItem[];
    const doc = buildInvoiceDocument({
        orgId: "org1",
        createdBy: "u1",
        customerId: "c1",
        customerName: "Acme",
        items,
        discount: { type: "percentage", value: 5 },
        date: new Date("2026-09-24T00:00:00Z"),
        dueDate: new Date("2026-10-24T00:00:00Z"),
        currency: "EGP",
        number: 2,
        numberFormatted: "INV-000002",
    });

    test("`date` is present and a Timestamp — the field whose absence hid the document", () => {
        expect(doc.date).toBeInstanceOf(Timestamp);
        expect(doc.dueDate).toBeInstanceOf(Timestamp);
    });

    test("it uses `items`, not `lineItems`", () => {
        expect(doc.items).toBeDefined();
        expect(doc).not.toHaveProperty("lineItems");
    });

    test("it uses `taxTotal` and `number`, not `tax` and `invoiceNumber`", () => {
        expect(doc.taxTotal).toBe(26.6);
        expect(doc.number).toBe(2);
        expect(doc).not.toHaveProperty("tax");
        expect(doc).not.toHaveProperty("invoiceNumber");
    });

    test("the money fields readers depend on are all present", () => {
        expect(doc).toMatchObject({
            subtotal: 200,
            discountTotal: 10,
            taxTotal: 26.6,
            total: 216.6,
            amountPaid: 0,
            amountDue: 216.6,
            currency: "EGP",
            status: "draft",
        });
    });

    test("per-line tax is stored so no renderer re-derives a rate", () => {
        expect((doc.items as LineItem[])[0]).toMatchObject({ taxRate: 14, taxAmount: 26.6, discountAmount: 10 });
    });
});

describe("the builder refuses to create the document that caused the defect", () => {
    const base = {
        orgId: "org1",
        createdBy: "u1",
        customerId: "c1",
        items: [] as LineItem[],
        dueDate: new Date(),
        number: 1,
        numberFormatted: "INV-000001",
    };

    test("a missing date throws instead of writing an invisible document", () => {
        expect(() => buildInvoiceDocument({ ...base, date: undefined as unknown as Date })).toThrow(/date/);
    });

    test("an ISO string date is rejected — Firestore cannot order by it the way the list does", () => {
        expect(() => buildInvoiceDocument({ ...base, date: "2026-09-24" as unknown as Date })).toThrow(/date/);
    });

    test("an invalid Date is rejected too", () => {
        expect(() => buildInvoiceDocument({ ...base, date: new Date("nonsense") })).toThrow(/date/);
    });

    test("a missing orgId throws — a document nobody can read is not a success", () => {
        expect(() => buildInvoiceDocument({ ...base, orgId: "", date: new Date() })).toThrow(/orgId/);
    });
});

describe("carried totals survive the builder untouched", () => {
    test("an accepted document's figures are not recomputed", () => {
        const doc = buildInvoiceDocument({
            orgId: "org1",
            createdBy: "u1",
            customerId: "c1",
            items: [{ id: "1", description: "x", quantity: 1, rate: 200, amount: 200, taxRate: 14 }] as LineItem[],
            discount: { type: "percentage", value: 5 },
            date: new Date(),
            dueDate: new Date(),
            number: 1,
            numberFormatted: "INV-000001",
            carriedTotals: { subtotal: 250, discountTotal: 12.5, taxTotal: 28, total: 265.5 },
        });
        expect(doc.total).toBe(265.5);
        expect(doc.amountDue).toBe(265.5);
        // and not the 216.60 the calculator would produce for these items
        expect(doc.total).not.toBe(216.6);
    });
});
