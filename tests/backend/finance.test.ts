/**
 * FINANCE CALLABLES — behavioural, against the Firestore emulator.
 *
 * This suite existed since the Serverless Financial Engine commit but had NEVER RUN:
 * `firebase-functions-test` was never a devDependency, so `npx jest` reported it as
 * "Test suite failed to run" and everyone read that as noise. Everything below the import
 * line was therefore unverified while `processPayment` / `finalizeInvoice` shipped two
 * separate production defects (reads-after-writes; the wrong accounts collection).
 *
 * WHAT THIS ADDS over tests/unit/accounting-invariants.test.ts: that suite asserts the pure
 * calculators and greps the source. This one EXECUTES the deployed callables against a real
 * (emulated) Firestore and asserts what ends up in the books.
 *
 * VERSION FIDELITY. The imports below deliberately reach into `functions/node_modules`
 * instead of the repo root. The root has firebase-admin 13 and no firebase-functions; the
 * deployed functions run firebase-admin 11 + firebase-functions 4.3. Importing the root copy
 * would give the test a DIFFERENT admin SDK instance from the code under test — two Timestamp
 * classes, two app registries — and the mismatch shows up as data written as `{_seconds}`
 * maps rather than timestamps. One copy, the same one production uses.
 *
 * Run (skipped without the emulator, so `npx jest` alone stays green):
 *   npm --prefix functions ci        # ONCE — see the note below
 *   firebase emulators:exec --only firestore "npx jest tests/backend/finance.test.ts"
 *
 * The install step is not optional on a fresh checkout. `functions/node_modules` is TRACKED in
 * git (.gitignore only ignores the root `/node_modules`), but the tracked copy is already
 * stale — `jest`, `ts-jest` and `@babel/*` are declared in functions/package.json and were
 * absent from it — so it cannot be relied on. Adding this suite's dependency would have meant
 * committing ~18k files, so it is NOT vendored; run the install instead. Untracking
 * functions/node_modules entirely is the real fix and is listed for Ahmed.
 */
import type * as AdminNS from "../../functions/node_modules/firebase-admin";

// Must be set BEFORE functions/src/index.ts runs `admin.initializeApp()`. A demo project id
// keeps this pointed at the emulator even if someone's ADC happens to be live.
const PROJECT_ID = "demo-finance-callables";
process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: PROJECT_ID });

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const d = emulator ? describe : describe.skip;

if (!emulator) {
    // A silent skip is how a suite rots for a year. Say why, out loud.
    console.warn(
        "[finance.test] FIRESTORE_EMULATOR_HOST is not set — skipping. " +
            'Run: firebase emulators:exec --only firestore "npx jest tests/backend/finance.test.ts"'
    );
}

d("finance callables (emulator)", () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let admin: typeof AdminNS;
    let db: AdminNS.firestore.Firestore;
    let testEnv: any;
    let processPayment: any;
    let finalizeInvoice: any;
    let voidInvoice: any;
    let onInvoiceWrite: any;

    const ORG = "org_finance_test";
    const AUTH = { auth: { uid: "user_123" } };

    /** The four accounts every posting path resolves by code. */
    const CHART = [
        { code: "1000", name: "Cash", type: "asset" },
        { code: "1010", name: "Bank", type: "asset" },
        { code: "1200", name: "Accounts Receivable", type: "asset" },
        { code: "4000", name: "Sales Income", type: "income" },
    ];

    const seedChart = async (orgId = ORG) => {
        await Promise.all(
            CHART.map((a) =>
                db
                    .collection("accounts")
                    .doc(`${orgId}__acc-${a.code}`)
                    .set({ orgId, ...a })
            )
        );
    };

    const wipe = async () => {
        for (const c of ["invoices", "payments", "journal_entries", "accounts"]) {
            const snap = await db.collection(c).get();
            await Promise.all(snap.docs.map((doc) => doc.ref.delete()));
        }
        // Analytics totals live in a SUBCOLLECTION (analytics/{orgId}/monthly/{period}).
        // Deleting the parent document does not delete them — Firestore subcollections are
        // independent of their parent's existence — so a plain collection wipe leaked
        // FieldValue.increment() state into the next test and made the aggregation assertions
        // report failures that were mine, not the code's.
        for (const parent of await db.collection("analytics").listDocuments()) {
            for (const sub of await parent.listCollections()) {
                const snap = await sub.get();
                await Promise.all(snap.docs.map((doc) => doc.ref.delete()));
            }
            await parent.delete();
        }
    };

    const makeInvoice = async (data: Record<string, unknown>) => {
        const ref = db.collection("invoices").doc();
        const merged: Record<string, unknown> = { orgId: ORG, currency: "USD", ...data };
        // `currency: undefined` in a caller means "this invoice has no currency" — Firestore
        // rejects undefined, so drop the key rather than writing it.
        for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
        await ref.set(merged);
        return ref;
    };

    const journalFor = async (referenceType: string, referenceId: string) => {
        const snap = await db
            .collection("journal_entries")
            .where("referenceType", "==", referenceType)
            .where("referenceId", "==", referenceId)
            .get();
        return snap.docs.map((doc) => doc.data());
    };

    /** The invariant every entry must satisfy: sum(debit) === sum(credit). */
    const balanced = (entry: any) => {
        const debit = entry.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
        const credit = entry.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
        return Math.abs(debit - credit) < 0.005;
    };

    const arNetOf = async () =>
        (await db.collection("journal_entries").get()).docs
            .flatMap((doc) => doc.data().lines)
            .filter((l: any) => l.accountName === "Accounts Receivable")
            .reduce((s: number, l: any) => s + (l.debit || 0) - (l.credit || 0), 0);

    const lineFor = (entry: any, code: string) => {
        const account = CHART.find((a) => a.code === code)!;
        return entry.lines.find((l: any) => l.accountName === account.name);
    };

    beforeAll(async () => {
        // Deferred imports: the env vars above must be in place before initializeApp() runs,
        // and a top-level `import` would hoist above them (same reason as
        // tests/unit/provisioning-convergence.test.ts).
        admin = await import("../../functions/node_modules/firebase-admin");
        const functionsTest = (await import("../../functions/node_modules/firebase-functions-test")).default;
        testEnv = functionsTest({ projectId: PROJECT_ID });

        // Import through the real entry point, not the leaf module — index.ts is what gets
        // deployed, and an import-time landmine there is worth catching here.
        ({ processPayment, finalizeInvoice, voidInvoice, onInvoiceWrite } = await import("../../functions/src/index"));

        db = admin.firestore();
    });

    afterAll(() => testEnv?.cleanup());
    beforeEach(wipe);

    // ------------------------------------------------------------------
    // processPayment
    // ------------------------------------------------------------------
    describe("processPayment", () => {
        it("records a partial payment atomically: invoice, payment doc and journal entry", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({
                total: 100,
                amountPaid: 0,
                amountDue: 100,
                status: "sent",
                number: "INV-000001",
                customerId: "cust_1",
            });

            await testEnv.wrap(processPayment)(
                {
                    invoiceId: invoiceRef.id,
                    amount: 50,
                    paymentMode: "bank_transfer",
                    date: new Date().toISOString(),
                },
                AUTH
            );

            const invoice = (await invoiceRef.get()).data()!;
            expect(invoice.amountPaid).toBe(50);
            expect(invoice.amountDue).toBe(50);
            expect(invoice.status).toBe("partial");
            // The reconciliation identity the money round verified by hand on prod.
            expect(invoice.total - invoice.amountPaid - invoice.amountDue).toBeCloseTo(0, 6);

            const payments = await db.collection("payments").where("invoiceId", "==", invoiceRef.id).get();
            expect(payments.size).toBe(1);
            expect(payments.docs[0].data().amount).toBe(50);
            expect(payments.docs[0].data().orgId).toBe(ORG);

            const entries = await journalFor("payment", payments.docs[0].id);
            expect(entries).toHaveLength(1);
            expect(balanced(entries[0])).toBe(true);
            expect(entries[0].totalAmount).toBe(50);
            // Cash/bank is DEBITED, receivable is CREDITED — reversing these silently inverts
            // the balance sheet, and nothing downstream would notice.
            expect(lineFor(entries[0], "1010").debit).toBe(50); // bank_transfer → bank
            expect(lineFor(entries[0], "1200").credit).toBe(50);
        });

        it("survives an invoice missing `number` / `currency` (prod has one)", async () => {
            // FIXED 2026-08-09, found by this suite's first ever run. The payment document
            // copied `invoiceNumber: invoice?.number` and `currency: invoice?.currency`
            // straight through, and Firestore REJECTS undefined — so the whole transaction
            // threw and the user got "Payment processing failed." with the cause only in an
            // unstructured console line. Prod has exactly one such invoice (org `moaz`).
            await seedChart();
            const invoiceRef = await makeInvoice({ total: 100, amountPaid: 0, status: "sent", currency: undefined });

            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 100, paymentMode: "cash", date: new Date().toISOString() },
                AUTH
            );

            const payment = (await db.collection("payments").get()).docs[0].data();
            expect(payment.amount).toBe(100);
            // Absent stays absent — the fix strips undefined rather than substituting null,
            // so no `!=`/`not-in` query changes meaning (Sweep C).
            expect("invoiceNumber" in payment).toBe(false);
            expect((await invoiceRef.get()).data()!.status).toBe("paid");
        });

        it("attributes the receivable line to the customer, and omits the pair when there is none", async () => {
            await seedChart();
            const withCustomer = await makeInvoice({ total: 10, amountPaid: 0, status: "sent", customerId: "cust_1" });
            await testEnv.wrap(processPayment)(
                { invoiceId: withCustomer.id, amount: 10, paymentMode: "cash", date: new Date().toISOString() },
                AUTH
            );
            const withEntity = (await db.collection("journal_entries").get()).docs[0].data();
            expect(lineFor(withEntity, "1200").entityId).toBe("cust_1");
            expect(lineFor(withEntity, "1200").entityType).toBe("customer");

            await wipe();
            await seedChart();
            const without = await makeInvoice({ total: 10, amountPaid: 0, status: "sent" });
            await testEnv.wrap(processPayment)(
                { invoiceId: without.id, amount: 10, paymentMode: "cash", date: new Date().toISOString() },
                AUTH
            );
            const noEntity = (await db.collection("journal_entries").get()).docs[0].data();
            expect("entityId" in lineFor(noEntity, "1200")).toBe(false);
        });

        it("classifies the payment mode the PICKER actually writes", async () => {
            // FIXED 2026-08-09. /dashboard/payments/new writes the mode's DISPLAY NAME
            // ("Bank Transfer"); the old code matched ["bank_transfer","cheque","card"] against
            // paymentMode.toLowerCase(), and "bank transfer" has a SPACE — so it matched nothing
            // and EVERY payment posted to Cash. Audited on prod: all 12 orgs offer exactly
            // "Bank Transfer"/"Cash", and all 3 real payments carried "Bank Transfer".
            await seedChart();
            const invoiceRef = await makeInvoice({ total: 100, amountPaid: 0, status: "sent" });

            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 100, paymentMode: "Bank Transfer", date: new Date().toISOString() },
                AUTH
            );

            const entry = (await db.collection("journal_entries").get()).docs[0].data();
            expect(lineFor(entry, "1010")?.debit).toBe(100); // Bank
            expect(lineFor(entry, "1000")).toBeUndefined(); // not Cash
            expect((await db.collection("payments").get()).docs[0].data().paymentModeType).toBe("bank");
        });

        it("prefers the paymentModes DOCUMENT over the display name", async () => {
            // The document is the authority precisely because a tenant can rename a mode. Here
            // the name is deliberately unclassifiable; only `type` can resolve it.
            await seedChart();
            await db.collection("paymentModes").doc(`${ORG}__pm-wallet`).set({
                orgId: ORG,
                name: "محفظة إلكترونية",
                slug: "e_wallet",
                type: "bank",
                isActive: true,
            });
            const invoiceRef = await makeInvoice({ total: 80, amountPaid: 0, status: "sent" });

            await testEnv.wrap(processPayment)(
                {
                    invoiceId: invoiceRef.id,
                    amount: 80,
                    paymentMode: "محفظة إلكترونية",
                    date: new Date().toISOString(),
                },
                AUTH
            );

            const entry = (await db.collection("journal_entries").get()).docs[0].data();
            expect(lineFor(entry, "1010")?.debit).toBe(80);
            expect((await db.collection("payments").get()).docs[0].data().paymentModeType).toBe("bank");
        });

        it("posts an unrecognised mode to Cash but STAMPS it, instead of silently calling it cash", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ total: 10, amountPaid: 0, status: "sent" });

            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 10, paymentMode: "Barter", date: new Date().toISOString() },
                AUTH
            );

            const entry = (await db.collection("journal_entries").get()).docs[0].data();
            expect(lineFor(entry, "1000")?.debit).toBe(10); // unchanged default
            expect((await db.collection("payments").get()).docs[0].data().paymentModeType).toBe("unknown");
        });

        it("marks the invoice paid when the balance reaches zero", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ total: 100, amountPaid: 40, amountDue: 60, status: "partial" });

            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 60, paymentMode: "cash", date: new Date().toISOString() },
                AUTH
            );

            const invoice = (await invoiceRef.get()).data()!;
            expect(invoice.status).toBe("paid");
            expect(invoice.amountDue).toBeCloseTo(0, 6);
        });

        it("rejects an overpayment AND writes nothing at all", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ total: 100, amountPaid: 0, status: "sent" });

            await expect(
                testEnv.wrap(processPayment)(
                    { invoiceId: invoiceRef.id, amount: 150, paymentMode: "cash", date: new Date().toISOString() },
                    AUTH
                )
            ).rejects.toThrow(/exceeds amount due/);

            // A rejected payment that still wrote a payment row or a journal line would be
            // worse than no check at all.
            expect((await db.collection("payments").get()).size).toBe(0);
            expect((await db.collection("journal_entries").get()).size).toBe(0);
            expect((await invoiceRef.get()).data()!.amountPaid).toBe(0);
        });

        it("refuses to pay an already-paid or voided invoice", async () => {
            await seedChart();
            for (const status of ["paid", "void", "cancelled"]) {
                const ref = await makeInvoice({ total: 100, amountPaid: 100, status });
                await expect(
                    testEnv.wrap(processPayment)(
                        { invoiceId: ref.id, amount: 1, paymentMode: "cash", date: new Date().toISOString() },
                        AUTH
                    )
                ).rejects.toThrow(/already fully paid or voided/);
            }
        });

        it("requires authentication", async () => {
            const ref = await makeInvoice({ total: 100, amountPaid: 0, status: "sent" });
            await expect(
                testEnv.wrap(processPayment)(
                    { invoiceId: ref.id, amount: 10, paymentMode: "cash", date: new Date().toISOString() },
                    {}
                )
            ).rejects.toThrow(/logged in/);
        });

        it("rejects a non-positive amount", async () => {
            const ref = await makeInvoice({ total: 100, amountPaid: 0, status: "sent" });
            for (const amount of [0, -10]) {
                await expect(
                    testEnv.wrap(processPayment)(
                        { invoiceId: ref.id, amount, paymentMode: "cash", date: new Date().toISOString() },
                        AUTH
                    )
                ).rejects.toThrow(/positive amount/);
            }
        });

        it("still records the payment when the chart of accounts is incomplete — money first, books flagged", async () => {
            // DOCUMENTED behaviour, not an accident: a tenant with no chart must still be able
            // to take money. finance.ts logs an error instead of skipping silently (2026-08-08).
            // The consequence — a payment with no ledger entry — is listed for Ahmed in the
            // round report; it is a product call, not a bug this test may decide.
            const invoiceRef = await makeInvoice({ total: 100, amountPaid: 0, status: "sent" });

            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 25, paymentMode: "cash", date: new Date().toISOString() },
                AUTH
            );

            expect((await invoiceRef.get()).data()!.amountPaid).toBe(25);
            expect((await db.collection("payments").get()).size).toBe(1);
            expect((await db.collection("journal_entries").get()).size).toBe(0);
        });

        it("resolves accounts from the ROOT `accounts` collection, scoped by orgId", async () => {
            // The 2026-08-08 defect: findAccountByCode read organizations/{orgId}/accounts,
            // which is empty in every org, so every posting path skipped its entry.
            await seedChart();
            await seedChart("some_other_org");
            const invoiceRef = await makeInvoice({ total: 100, amountPaid: 0, status: "sent" });

            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 100, paymentMode: "cash", date: new Date().toISOString() },
                AUTH
            );

            const entries = (await db.collection("journal_entries").get()).docs.map((doc) => doc.data());
            expect(entries).toHaveLength(1);
            expect(entries[0].orgId).toBe(ORG);
            // Every line must point at an account belonging to THIS org.
            const ids = entries[0].lines.map((l: any) => l.accountId);
            for (const id of ids) expect((await db.collection("accounts").doc(id).get()).data()!.orgId).toBe(ORG);
        });

        it("resolves every mode the provisioning seeds create, in the intended direction", async () => {
            // CONTRACT: what seed-tenant-defaults writes must classify to a real account, in
            // every org. Mirrors lib/provisioning/seed-tenant-defaults.ts.
            const SEEDED = [
                { name: "Bank Transfer", slug: "bank_transfer", type: "bank", expect: "1010" },
                { name: "Cash", slug: "cash", type: "cash", expect: "1000" },
            ];
            for (const org of [ORG, "org_second_tenant"]) {
                for (const m of SEEDED) {
                    await wipe();
                    await seedChart(org);
                    await db
                        .collection("paymentModes")
                        .doc(`${org}__pm-${m.slug}`)
                        .set({ orgId: org, name: m.name, slug: m.slug, type: m.type, isActive: true });
                    const ref = db.collection("invoices").doc();
                    await ref.set({ orgId: org, total: 25, amountPaid: 0, status: "sent", currency: "USD" });

                    await testEnv.wrap(processPayment)(
                        { invoiceId: ref.id, amount: 25, paymentMode: m.name, date: new Date().toISOString() },
                        AUTH
                    );

                    const entry = (await db.collection("journal_entries").get()).docs[0].data();
                    const debited = entry.lines.find((l: any) => (l.debit || 0) > 0);
                    const account = await db.collection("accounts").doc(debited.accountId).get();
                    expect([org, m.name, account.data()!.code]).toEqual([org, m.name, m.expect]);
                }
            }
        });
    });

    // ------------------------------------------------------------------
    // finalizeInvoice
    // ------------------------------------------------------------------
    describe("finalizeInvoice", () => {
        it("locks a draft invoice and posts AR / Sales Income", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 412, customerId: "cust_1" });

            await testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH);

            const invoice = (await invoiceRef.get()).data()!;
            expect(invoice.status).toBe("sent");
            expect(invoice.isFinalized).toBe(true);

            const entries = await journalFor("invoice", invoiceRef.id);
            expect(entries).toHaveLength(1);
            expect(balanced(entries[0])).toBe(true);
            expect(entries[0].totalAmount).toBe(412);
            expect(lineFor(entries[0], "1200").debit).toBe(412);
            expect(lineFor(entries[0], "4000").credit).toBe(412);
        });

        it("does not 500 on a transaction-ordering violation (the 2026-08-08 regression)", async () => {
            // Every finalizeInvoice call used to fail because findAccountByCode's query ran
            // AFTER t.update(). The generic catch reported it as "Could not finalize invoice."
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 10 });
            await expect(testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH)).resolves.toEqual({
                success: true,
            });
        });

        it("refuses to finalize anything that is not a draft", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "sent", total: 10 });
            await expect(testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH)).rejects.toThrow(
                /Only draft invoices/
            );
        });

        it("is not idempotent by accident — a second call cannot double-post revenue", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 100 });
            await testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH);
            await expect(testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH)).rejects.toThrow();
            expect(await journalFor("invoice", invoiceRef.id)).toHaveLength(1);
        });
    });

    // ------------------------------------------------------------------
    // Cross-callable invariant: the full invoice → payment lifecycle
    // ------------------------------------------------------------------
    describe("lifecycle invariants", () => {
        it("finalize then pay in full leaves AR net zero and the books balanced", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 412, customerId: "cust_1" });

            await testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH);
            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 412, paymentMode: "bank_transfer", date: new Date().toISOString() },
                AUTH
            );

            const entries = (await db.collection("journal_entries").get()).docs.map((doc) => doc.data());
            expect(entries).toHaveLength(2);
            for (const e of entries) expect(balanced(e)).toBe(true);

            // AR debited by the invoice, credited by the payment → nets to zero.
            const arNet = entries
                .flatMap((e: any) => e.lines)
                .filter((l: any) => l.accountName === "Accounts Receivable")
                .reduce((s: number, l: any) => s + (l.debit || 0) - (l.credit || 0), 0);
            expect(arNet).toBeCloseTo(0, 6);

            const invoice = (await invoiceRef.get()).data()!;
            expect(invoice.status).toBe("paid");
            expect(invoice.total - invoice.amountPaid - invoice.amountDue).toBeCloseTo(0, 6);
        });

        it("REJECTS a payment against a draft invoice, and writes nothing", async () => {
            // FIXED 2026-08-09. finalizeInvoice is the only path that DEBITS Accounts
            // Receivable, so paying a draft credited AR with no matching debit — measured at
            // -100 before the fix. The rejection is keyed on `status`, not `isFinalized`:
            // that flag is only written by finalizeInvoice, which itself failed for every
            // tenant until 2026-08-08, so most legitimately-sent prod invoices lack it and
            // requiring it would block real payments.
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 100, amountPaid: 0 });

            await expect(
                testEnv.wrap(processPayment)(
                    { invoiceId: invoiceRef.id, amount: 100, paymentMode: "cash", date: new Date().toISOString() },
                    AUTH
                )
            ).rejects.toThrow(/still a draft/i);

            expect((await db.collection("payments").get()).size).toBe(0);
            expect((await db.collection("journal_entries").get()).size).toBe(0);
            expect(await arNetOf()).toBeCloseTo(0, 6);
            expect((await invoiceRef.get()).data()!.status).toBe("draft");
        });

        it("finalize THEN pay: the receivable is debited and cleared, and the books balance", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 100, customerId: "cust_1" });

            await testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH);
            await testEnv.wrap(processPayment)(
                { invoiceId: invoiceRef.id, amount: 100, paymentMode: "Bank Transfer", date: new Date().toISOString() },
                AUTH
            );

            const entries = (await db.collection("journal_entries").get()).docs.map((d) => d.data());
            expect(entries).toHaveLength(2);
            for (const e of entries) expect(balanced(e)).toBe(true);
            expect(await arNetOf()).toBeCloseTo(0, 6);

            const invoice = (await invoiceRef.get()).data()!;
            expect(invoice.status).toBe("paid");
            expect(invoice.total - invoice.amountPaid - invoice.amountDue).toBeCloseTo(0, 6);
        });

        it("the STUCK PROD INVOICE shape (org moaz: no number, currency, amountPaid or amountDue) finalizes and pays", async () => {
            // Faithful clone of invoice t2WoqbmauMnLaPg8hbXP, captured read-only by
            // scripts/audit/inspect-stuck-invoice.ts — a draft with total 60000 and NO
            // `number`, `currency`, `amountPaid`, `amountDue` or `isFinalized`. Every one of
            // those absent fields used to make the callables throw on an undefined write, so
            // that invoice could be neither finalized nor paid. Values other than the shape
            // are redacted; the shape is what reproduces the crash.
            await seedChart();
            const invoiceRef = db.collection("invoices").doc();
            await invoiceRef.set({
                orgId: ORG,
                status: "draft",
                total: 60000,
                subtotal: 60000,
                tax: 0,
                customerId: "redacted_customerId",
                invoiceNumber: "redacted_invoiceNumber", // NOTE: the writer's field name, not `number`
                lineItems: [],
                isOnboardingDemo: true,
            });

            await expect(testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH)).resolves.toEqual({
                success: true,
            });
            await testEnv.wrap(processPayment)(
                {
                    invoiceId: invoiceRef.id,
                    amount: 60000,
                    paymentMode: "Bank Transfer",
                    date: new Date().toISOString(),
                },
                AUTH
            );

            const invoice = (await invoiceRef.get()).data()!;
            expect(invoice.status).toBe("paid");
            expect(invoice.amountPaid).toBe(60000);
            expect(invoice.amountDue).toBeCloseTo(0, 6);
            expect(await arNetOf()).toBeCloseTo(0, 6);
            const payment = (await db.collection("payments").get()).docs[0].data();
            expect("invoiceNumber" in payment).toBe(false); // absent stays absent
            expect("currency" in payment).toBe(false);
        });

        it("voiding a finalized invoice REVERSES the receivable it created", async () => {
            // FIXED 2026-08-09. Voiding zeroed `amountDue` and stopped there, so the AR debit
            // stayed on the books forever: aging showed nothing while the balance sheet still
            // carried it. Measured at +250.
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 250, customerId: "cust_1" });
            await testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH);
            await testEnv.wrap(voidInvoice)({ invoiceId: invoiceRef.id, reason: "test" }, AUTH);

            const invoice = (await invoiceRef.get()).data()!;
            expect(invoice.status).toBe("void");
            expect(invoice.amountDue).toBe(0); // aging report agrees with the ledger

            const entries = (await db.collection("journal_entries").get()).docs.map((d) => d.data());
            expect(entries).toHaveLength(2);
            for (const e of entries) expect(balanced(e)).toBe(true);
            expect(await arNetOf()).toBeCloseTo(0, 6);

            const reversal = entries.find((e) => e.reversesEntryId)!;
            expect(reversal.description).toMatch(/^Void of Invoice/);
            expect(lineFor(reversal, "1200").credit).toBe(250); // CR Accounts Receivable
            expect(lineFor(reversal, "4000").debit).toBe(250); // DR Sales Income
            const original = (await db.collection("journal_entries").doc(reversal.reversesEntryId).get()).data()!;
            expect(original.referenceId).toBe(invoiceRef.id);
        });

        it("voiding twice cannot double-reverse (deterministic reversal id)", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "draft", total: 90, customerId: "cust_1" });
            await testEnv.wrap(finalizeInvoice)({ invoiceId: invoiceRef.id }, AUTH);
            await testEnv.wrap(voidInvoice)({ invoiceId: invoiceRef.id, reason: "one" }, AUTH);
            await testEnv.wrap(voidInvoice)({ invoiceId: invoiceRef.id, reason: "two" }, AUTH);

            expect((await db.collection("journal_entries").get()).size).toBe(2);
            expect(await arNetOf()).toBeCloseTo(0, 6);
        });

        it("voiding an invoice that was never finalized posts nothing and is not an error", async () => {
            await seedChart();
            const invoiceRef = await makeInvoice({ status: "sent", total: 40 });
            await expect(
                testEnv.wrap(voidInvoice)({ invoiceId: invoiceRef.id, reason: "never posted" }, AUTH)
            ).resolves.toEqual({ success: true });
            expect((await db.collection("journal_entries").get()).size).toBe(0);
            expect((await invoiceRef.get()).data()!.status).toBe("void");
        });
    });

    // ------------------------------------------------------------------
    // onInvoiceWrite — analytics aggregation
    // ------------------------------------------------------------------
    describe("onInvoiceWrite (analytics aggregation)", () => {
        const period = () => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        };
        const stats = async () =>
            (await db.collection("analytics").doc(ORG).collection("monthly").doc(period()).get()).data();

        const snap = (data: Record<string, unknown>, path = "invoices/inv_1") =>
            testEnv.firestore.makeDocumentSnapshot(data, path);
        const empty = (path = "invoices/inv_1") => testEnv.firestore.makeDocumentSnapshot({}, path);

        it("counts a new invoice's revenue and receivable", async () => {
            await testEnv.wrap(onInvoiceWrite)(
                testEnv.makeChange(
                    empty(),
                    snap({
                        orgId: ORG,
                        total: 500,
                        amountPaid: 200,
                        status: "sent",
                        date: admin.firestore.Timestamp.now(),
                    })
                )
            );
            const s = await stats();
            expect(s!.invoiceCount).toBe(1);
            expect(s!.totalRevenue).toBe(200);
            expect(s!.outstandingReceivables).toBe(300);
        });

        it("ignores drafts and voids", async () => {
            for (const status of ["draft", "void"]) {
                await testEnv.wrap(onInvoiceWrite)(
                    testEnv.makeChange(
                        empty(),
                        snap({ orgId: ORG, total: 500, amountPaid: 0, status, date: admin.firestore.Timestamp.now() })
                    )
                );
            }
            expect(await stats()).toBeUndefined();
        });

        it("applies only the DELTA when an invoice is paid down, never the whole amount twice", async () => {
            const base = { orgId: ORG, total: 500, status: "sent", date: admin.firestore.Timestamp.now() };
            await testEnv.wrap(onInvoiceWrite)(testEnv.makeChange(empty(), snap({ ...base, amountPaid: 200 })));
            await testEnv.wrap(onInvoiceWrite)(
                testEnv.makeChange(snap({ ...base, amountPaid: 200 }), snap({ ...base, amountPaid: 500 }))
            );
            const s = await stats();
            expect(s!.invoiceCount).toBe(1); // NOT 2 — an update is not a new invoice
            expect(s!.totalRevenue).toBe(500);
            expect(s!.outstandingReceivables).toBe(0);
        });

        it("reverses the aggregate when an invoice is voided", async () => {
            const base = { orgId: ORG, total: 500, amountPaid: 200, date: admin.firestore.Timestamp.now() };
            await testEnv.wrap(onInvoiceWrite)(testEnv.makeChange(empty(), snap({ ...base, status: "sent" })));
            await testEnv.wrap(onInvoiceWrite)(
                testEnv.makeChange(snap({ ...base, status: "sent" }), snap({ ...base, status: "void" }))
            );
            const s = await stats();
            expect(s!.invoiceCount).toBe(0);
            expect(s!.totalRevenue).toBe(0);
            expect(s!.outstandingReceivables).toBe(0);
        });
    });
});
