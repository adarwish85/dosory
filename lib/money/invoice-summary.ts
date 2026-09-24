/**
 * What the invoice summary cards mean, and how they survive more than one currency.
 *
 * Two surfaces summarise the same invoices — the QuickStatsBar on /dashboard/invoices and the
 * chips in InvoiceHeader — and they disagreed on every count:
 *
 *   "Paid"        QuickStatsBar summed `total` of invoices whose status is "paid".
 *                 The chip summed `amountPaid` across ALL invoices.
 *                 On any tenant with a partially-paid invoice these are different numbers under
 *                 near-identical words. RULED: one definition — cash actually collected — and the
 *                 card is relabelled "Collected", because that is what it is.
 *
 *   "Outstanding" Both summed `amountDue` across every invoice including drafts and cancelled
 *                 ones, so an abandoned draft inflated the figure a business owner reads as
 *                 money owed to them. RULED: exclude draft and cancelled.
 *
 *   "Overdue"     QuickStatsBar counted invoices whose STATUS is "overdue"; the chip summed
 *                 amountDue for the same status. Status is set by a scheduled job, so an invoice
 *                 past its due date is not overdue until that job next runs. RULED: overdue is a
 *                 fact about the date, not about a field someone remembered to update.
 *
 * They also both added every currency into one figure and printed it under a single symbol —
 * QuickStatsBar using the ORG default, the chip using a hardcoded "EGP". A sum of dollars and
 * pounds is not a quantity of anything. RULED: group per currency, never convert. There is no FX
 * rate source in this codebase, rates are date-sensitive, and a converted total would be a
 * derived figure presented as a fact about what is owed.
 *
 * The definitions live here, beside the calculator, so a third surface cannot invent a fourth
 * meaning for the same word.
 */
import { round2 } from "./compute-invoice-totals";
import { FALLBACK_CURRENCY } from "./format-money";

/** The invoice fields a summary needs. Deliberately narrow so tests can build fixtures. */
export interface SummarisableInvoice {
    currency?: string | null;
    status?: string | null;
    total?: number | null;
    amountPaid?: number | null;
    amountDue?: number | null;
    dueDate?: { toDate?: () => Date } | Date | string | number | null;
}

export interface CurrencyGroup {
    currency: string;
    amount: number;
    count: number;
}

export interface InvoiceSummary {
    collected: CurrencyGroup[];
    outstanding: CurrencyGroup[];
    overdue: CurrencyGroup[];
    /** Documents carrying no currency field at all. Named in the label, never folded in silently. */
    noCurrencyCount: number;
}

/** Statuses that are not money anyone is owed. */
const NOT_OWED = new Set(["draft", "cancelled", "void"]);

function toDate(v: SummarisableInvoice["dueDate"]): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === "object" && typeof (v as { toDate?: () => Date }).toDate === "function") {
        try {
            return (v as { toDate: () => Date }).toDate();
        } catch {
            return null;
        }
    }
    const d = new Date(v as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
}

function add(map: Map<string, CurrencyGroup>, currency: string, amount: number) {
    if (!amount) return;
    const g = map.get(currency) || { currency, amount: 0, count: 0 };
    g.amount = round2(g.amount + amount);
    g.count += 1;
    map.set(currency, g);
}

/** Largest first, so the two lines a card shows are the two that matter. */
function sorted(map: Map<string, CurrencyGroup>): CurrencyGroup[] {
    return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export interface SummariseOptions {
    /**
     * Where a document with no `currency` is counted. It is still reported separately in
     * `noCurrencyCount` so the label can name it rather than pretend it was in this currency.
     */
    orgDefaultCurrency: string;
    /** Injectable for tests; defaults to now. */
    now?: Date;
}

export function summariseInvoices(invoices: SummarisableInvoice[], options: SummariseOptions): InvoiceSummary {
    const fallback = options.orgDefaultCurrency || FALLBACK_CURRENCY;
    const now = options.now ?? new Date();

    const collected = new Map<string, CurrencyGroup>();
    const outstanding = new Map<string, CurrencyGroup>();
    const overdue = new Map<string, CurrencyGroup>();
    let noCurrencyCount = 0;

    for (const inv of invoices || []) {
        const raw = inv.currency;
        const hasCurrency = typeof raw === "string" && raw.trim() !== "";
        if (!hasCurrency) noCurrencyCount += 1;
        const currency = hasCurrency ? (raw as string) : fallback;

        const status = (inv.status || "").toLowerCase();
        const paid = Number(inv.amountPaid) || 0;
        const due = Number(inv.amountDue) || 0;

        // COLLECTED: cash actually received, whatever the document's status.
        add(collected, currency, paid);

        if (NOT_OWED.has(status)) continue;

        // OUTSTANDING: money owed. A draft is not owed, and a cancelled invoice is not owed.
        add(outstanding, currency, due);

        // OVERDUE: a fact about the date, not about a status a scheduled job may not have
        // written yet.
        const dd = toDate(inv.dueDate);
        if (dd && dd.getTime() < now.getTime()) add(overdue, currency, due);
    }

    return {
        collected: sorted(collected),
        outstanding: sorted(outstanding),
        overdue: sorted(overdue),
        noCurrencyCount,
    };
}

export interface GroupDisplay {
    /** The lines to render, largest first. */
    shown: CurrencyGroup[];
    /** How many further currencies exist beyond `shown`. */
    overflowCurrencies: number;
}

/** A card shows at most `max` lines; anything beyond becomes a counted overflow. */
export function topGroups(groups: CurrencyGroup[], max = 2): GroupDisplay {
    const list = groups || [];
    return { shown: list.slice(0, max), overflowCurrencies: Math.max(0, list.length - max) };
}
