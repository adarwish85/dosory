# Migration proposal — existing invoices under the new totals contract

**Status: PROPOSAL. Nothing here has been executed. A prod data write is Ahmed-trigger.**

Written 2026-09-24 alongside Batch A (`f921f2d4`, `5045c3e5`, `8e2bdc9b`, `b5de6953`).

## What changed, and what it means for documents already issued

Batch A introduced one calculator (`lib/money/compute-invoice-totals.ts`) and made three
additions to what a new invoice stores: `discountTotal`, and `taxAmount` + `discountAmount`
per line.

**No existing invoice was repriced, and that is asserted, not assumed.** The LEGACY PARITY block
in `tests/unit/money-contract.test.ts` compares the new calculator against a frozen verbatim copy
of the pre-refactor arithmetic across six input shapes and requires identical
subtotal/taxTotal/total. Invoices were always taxed on the net amount; only the _estimate_ path
was wrong, and only estimates converted **from today onward** get the corrected figure.

So there is no correctness emergency. The open question is narrower:

> Existing invoices have no `discountTotal` and no per-line tax. Renderers currently recompute
> those at read time. Should the values be backfilled instead?

## The three options

### A. Leave historical documents alone; recompute on read (SHIPPED, current behaviour)

The detail page recomputes from the items a document does carry, and every `??` falls through to
the stored value for current documents.

- **For:** zero prod writes. Historical documents keep exactly the bytes they were issued with,
  which is the conservative answer for a financial record — an invoice is a statement of what was
  billed, not a view that should change under the customer.
- **Against:** every renderer needs the fallback branch forever, and each new renderer is a fresh
  chance to forget it. A reader that only looks at stored fields sees `discountTotal: undefined`
  and can silently print a document that does not add up — the exact defect Batch A closed.

### B. Backfill `discountTotal` and per-line tax onto existing invoices

Deterministic, derived entirely from fields the documents already carry (`items[].amount`,
`items[].taxRate`, `discount`), so it computes the same values the renderer computes today.

- **For:** renderers can drop the fallback; the stored document becomes self-describing.
- **Against:** it writes to issued financial records. If any document's stored `total` disagrees
  with the recomputed one, the backfill has found a pre-existing inconsistency and must **stop on
  that document**, not overwrite it.

### C. Backfill only documents whose stored totals already reconcile

Option B with a precondition: only write where
`round2(subtotal − computedDiscount + taxTotal + adjustment) === total`. Everything else is
reported for a human.

This is the recommended shape if a backfill is wanted at all.

## Recommendation

**Stay on A for now; run the AUDIT half of C immediately.** The audit is read-only and answers
the question that actually matters, which nobody currently knows: _how many live invoices do not
reconcile?_ Until that number is known, choosing between A and B is guesswork.

Precedent in this repo: the 2026-08-08 expense round and the 2026-08-09 JE round both had their
premise **disproved by the audit** — the predicted duplicate accounts did not exist, and the
correction scope turned out to be 1 entry rather than 3. Audit first.

## The audit script (to be written, read-only, no `--execute` flag)

For every org, for every invoice:

1. Recompute with `computeInvoiceTotals` from the document's own `items` + `discount` +
   `adjustment`.
2. Compare against stored `subtotal` / `taxTotal` / `total`.
3. Bucket each document:
    - **reconciles** — safe to backfill under option C
    - **drifts** — stored total ≠ recomputed; report with both figures, never touch
    - **unshaped** — no `items` array at all (the onboarding-writer documents; see Batch B)
4. Report counts per org and the full drift list.

Known members of the third bucket already, found by direct prod query:
`qatestdosory/eixKmrrn3RnEFp3JeWrZ` and `moaz/t2WoqbmauMnLaPg8hbXP` — both written by the
onboarding wizard with `lineItems`/`tax`/`invoiceNumber` and no `date`. Those are a **writer**
problem (Batch B), not a totals problem, and must not be swept into a totals backfill.

## Explicitly out of scope

- **Estimates are not backfilled.** An estimate issued under the old gross-basis arithmetic said
  218.00 to a customer. Rewriting it to 216.60 changes a quoted price after the fact. Converting
  such an estimate now produces a correctly-priced invoice (conversion recomputes), and the
  estimate keeps what it said.
- **`use-contracts.ts` contract numbering** carries the same `Date.now()` fallback removed from
  invoices in A4. Different entity; raised, not folded in.
