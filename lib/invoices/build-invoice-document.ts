/**
 * THE only way to shape an invoice document. Every writer goes through here.
 *
 * WHY. Three writers shaped invoices by hand and one of them invented its own vocabulary. The
 * onboarding wizard wrote `lineItems` where every reader queries `items`, `tax` where they read
 * `taxTotal`, `invoiceNumber` where they read `number`, a `dueDate` as an ISO STRING where they
 * expect a Timestamp — and **no `date` field at all**.
 *
 * That last omission is not cosmetic. The invoices list orders by `date`, and Firestore silently
 * drops any document that lacks the field named in `orderBy()` — no error, no warning. So the
 * document was counted by the summary (an aggregation has no orderBy) and never appeared in the
 * list. That is the "summary reads 2, list renders 1" defect, verified on prod tenant
 * qatestdosory. The same shape also makes the document unpayable and unfinalizable, because the
 * money callables read fields it does not have.
 *
 * A builder alone would not have prevented it — nothing forces a writer to call one. What makes
 * this hold is the pair: this function, plus tests/unit/invoice-write-contract.test.ts, which
 * finds every write to the invoices collection BY THE WRITE CALL ITSELF and requires its payload
 * to come from here. Keying on the call rather than on a naming convention is the point: a writer
 * that spells everything differently is exactly the one that needs catching (CLAUDE.md standing
 * lesson 9).
 */
import { Timestamp } from "firebase/firestore";
import type { LineItem, DiscountInfo, InvoiceStatus } from "@/lib/types";
import { computeInvoiceTotals } from "@/lib/money/compute-invoice-totals";
import { FALLBACK_CURRENCY } from "@/lib/money/format-money";

/** Totals carried forward from a document a customer already accepted. See `totalsAsIssued`. */
export interface CarriedTotals {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
}

export interface BuildInvoiceInput {
    orgId: string;
    createdBy: string;
    customerId: string;
    customerName?: string;
    projectId?: string | null;

    items: LineItem[];
    discount?: DiscountInfo | null;
    adjustment?: number;

    date: Date;
    dueDate: Date;
    currency?: string | null;

    number: string | number;
    numberFormatted: string;

    status?: InvoiceStatus;
    notes?: string;
    terms?: string;
    tags?: string[];

    /**
     * Supplied only by a conversion from an accepted document. When present these totals are
     * carried through verbatim rather than recomputed, so correcting a calculator never reprices
     * an agreement a customer already made.
     */
    carriedTotals?: CarriedTotals | null;

    /** Extra provenance a conversion wants to record (fromEstimateId and friends). */
    extra?: Record<string, unknown>;
}

/**
 * The canonical stored shape. Every field a reader queries or renders is present, and the two
 * date fields are Timestamps because Firestore cannot order by an ISO string the way the list
 * expects.
 */
export function buildInvoiceDocument(input: BuildInvoiceInput): Record<string, unknown> {
    if (!input.orgId) throw new Error("buildInvoiceDocument: orgId is required");
    if (!(input.date instanceof Date) || Number.isNaN(input.date.getTime())) {
        // Loudly, because a missing or invalid date is precisely the defect this exists to stop:
        // the document would be written, counted, and then never listed.
        throw new Error(
            "buildInvoiceDocument: `date` must be a valid Date — a document without it is invisible to the list"
        );
    }
    if (!(input.dueDate instanceof Date) || Number.isNaN(input.dueDate.getTime())) {
        throw new Error("buildInvoiceDocument: `dueDate` must be a valid Date");
    }

    const totals = computeInvoiceTotals({
        items: input.items || [],
        discount: input.discount,
        adjustment: input.adjustment,
    });

    const subtotal = input.carriedTotals ? input.carriedTotals.subtotal : totals.subtotal;
    const discountTotal = input.carriedTotals ? input.carriedTotals.discountTotal : totals.discountTotal;
    const taxTotal = input.carriedTotals ? input.carriedTotals.taxTotal : totals.taxTotal;
    const total = input.carriedTotals ? input.carriedTotals.total : totals.total;

    return {
        ...(input.extra || {}),

        orgId: input.orgId,
        createdBy: input.createdBy,

        number: input.number,
        numberFormatted: input.numberFormatted,

        customerId: input.customerId,
        customerName: input.customerName || "",
        ...(input.projectId ? { projectId: input.projectId } : {}),

        // `items`, never `lineItems`. Per-line tax is stored so no renderer re-derives a rate.
        items: (input.items || []).map((item, i) => ({
            ...item,
            taxRate: totals.lines[i]?.taxRate ?? item.taxRate ?? 0,
            taxAmount: totals.lines[i]?.taxAmount ?? 0,
            discountAmount: totals.lines[i]?.discountAmount ?? 0,
        })),

        subtotal,
        ...(input.discount ? { discount: input.discount } : {}),
        discountTotal,
        adjustment: input.adjustment ?? 0,
        taxTotal,
        total,

        amountPaid: 0,
        amountDue: total,
        status: input.status || "draft",

        // Timestamps, not ISO strings. The list orders by `date`, and Firestore omits any
        // document that lacks that field entirely.
        date: Timestamp.fromDate(input.date),
        dueDate: Timestamp.fromDate(input.dueDate),

        currency: input.currency || FALLBACK_CURRENCY,
        notes: input.notes ?? "",
        terms: input.terms ?? "",
        tags: input.tags ?? [],
    };
}
