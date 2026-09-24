# Proposal — summary cards under multi-currency

**Status: PROPOSAL. Not implemented.** Raised in review of Batch A, 2026-09-24.

## What the cards do today

Two summary surfaces sit on `/dashboard/invoices`, and **both add every invoice together
regardless of currency, then print the sum under a single symbol.**

**`QuickStatsBar`** — [app/dashboard/invoices/page.tsx:155](../../app/dashboard/invoices/page.tsx)

```ts
const paid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);
```

formatted with a `currency` prop that is the **organisation** default (`settings.currency || "USD"`).

**`InvoiceHeader` chips** — [components/dashboard/invoices/invoice-header.tsx:25](../../components/dashboard/invoices/invoice-header.tsx)

```ts
const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
const pastDueAmount = invoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
```

formatted with a **hardcoded `currency: "EGP"`**.

So on a mixed-currency tenant the Paid card reads `$X` where X is dollars plus pounds, and the
chips read `EGP Y` where Y is the same mixture. Neither figure is a quantity of anything.

## This is live, not hypothetical

From a direct prod query: **`qasmoke20260728131942` holds invoices in both USD and EGP** —
`INV-000001` at USD 150 and USD 50, alongside EGP 412, EGP 275 and EGP 321. Its Outstanding chip
is adding those. `qatestdosory` has one EGP invoice and one with **no `currency` field at all**.

Batch A did not cause this — the cards summed across currencies before. What Batch A changed is
that per-document formatting makes it _visible_: the rows now show their own currencies while the
card above them still shows one blended number.

## Options

### A. Group per currency (recommended)

Each card renders one line per currency present, largest first:

```
OUTSTANDING
EGP 1,008.00
USD   200.00
```

- **For:** never wrong, needs no configuration, degrades to today's single line for the
  single-currency tenants that are the overwhelming majority.
- **Against:** variable card height; needs a sensible cap (show top 2, then "+2 more") so a tenant
  with eight currencies does not get an eight-line card.

### B. Primary currency, exclude and label the rest

Sum only documents in the org's default currency and label the exclusion: `EGP 1,008.00` with
`2 invoices in other currencies not included`.

- **For:** fixed height, one prominent number, which is what a card is for.
- **Against:** the headline understates reality, and the tenant most likely to be multi-currency
  is the one most harmed by a quiet exclusion. The label must never be omitted or truncated.

### C. Convert to a reporting currency

Out of scope and should stay out. There is no FX rate source in this codebase, rates are
date-sensitive, and a converted total is a derived figure that must not be presented as a fact
about what is owed.

## Recommendation

**A, with a cap of two lines plus an overflow count**, and the same treatment applied to both
surfaces so they cannot disagree again.

Two prerequisites that belong with it:

1. **The `InvoiceHeader` chips must stop hardcoding EGP** regardless of which option is chosen —
   that is a straight defect, not a design question.
2. **Decide what a document with no `currency` counts as.** `qatestdosory` already has one.
   Suggested: group it under the org default but count it in the overflow label rather than
   silently folding it into that currency's total.

Also worth settling separately: the two surfaces currently measure **different things**
(`QuickStatsBar`'s "paid" sums `total` of paid invoices; the chip sums `amountPaid` across all
invoices), so they print different numbers under similar words even in a single-currency tenant.

## Queued alongside

- **`lib/hooks/use-contracts.ts:83`** — carries the identical `Date.now()` number fallback removed
  from invoices in Batch A4 (`b5de6953`), for CONTRACT numbers. Same defect class, different
  entity: a failed counter transaction silently produces `CNT-1782922104393`. Queued with the
  numbering work rather than left loose.
