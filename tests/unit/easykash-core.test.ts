/**
 * EasyKash verifier + billing math.
 *
 * The anchor is the WORKED EXAMPLE from EasyKash's own callback-verification page — payload,
 * secret and expected signatureHash, quoted verbatim below. A signature verifier that has never
 * been checked against a real vector is a guess, and the failure mode is either rejecting every
 * real payment or accepting a forged one.
 */
import {
    addCycle,
    amountsMatch,
    buildSignatureBase,
    computeNextPeriod,
    customerReferenceMatches,
    mapProviderStatus,
    resolvePlanPrice,
    signCallback,
    verifyCallbackSignature,
} from "@/lib/billing/easykash-core";

// Verbatim from the docs (Direct Payment (Hosted) → Callback Service → Callback response verification).
const DOC_PAYLOAD = {
    ProductCode: "EDV4471",
    Amount: "11.00",
    ProductType: "Direct Pay",
    PaymentMethod: "Cash Through Fawry",
    BuyerName: "mee",
    BuyerEmail: "test@mail.com",
    BuyerMobile: "0123456789",
    status: "PAID",
    voucher: "",
    easykashRef: "2911105009",
    VoucherData: "Direct Pay",
    customerReference: "TEST11111",
    signatureHash:
        "0bd9ce502950ffa358314c170dace42e7ba3e0c776f5a32eb15c3d496bc9c294835036dd90d4f287233b800c9bde2f6591b6b8a1f675b6bfe64fd799da29d1d0",
};
const DOC_SECRET = "da9fe30575517d987762a859842b5631";
const DOC_CONCAT = "EDV447111.00Direct PayCash Through FawryPAID2911105009TEST11111";

describe("signature — against EasyKash's own worked example", () => {
    test("the concatenation reproduces the documented string exactly", () => {
        expect(buildSignatureBase(DOC_PAYLOAD)).toBe(DOC_CONCAT);
    });

    test("HMAC-SHA512 hex of that string with the documented secret is the documented hash", () => {
        expect(signCallback(DOC_PAYLOAD, DOC_SECRET)).toBe(DOC_PAYLOAD.signatureHash);
    });

    test("the documented payload verifies", () => {
        expect(verifyCallbackSignature(DOC_PAYLOAD, DOC_SECRET)).toBe(true);
    });

    test("an uppercase signature still verifies (hex case is not meaningful)", () => {
        const upper = { ...DOC_PAYLOAD, signatureHash: DOC_PAYLOAD.signatureHash.toUpperCase() };
        expect(verifyCallbackSignature(upper, DOC_SECRET)).toBe(true);
    });
});

describe("signature — fails closed", () => {
    test("no secret configured → reject (never 'allow because unconfigured')", () => {
        expect(verifyCallbackSignature(DOC_PAYLOAD, undefined)).toBe(false);
        expect(verifyCallbackSignature(DOC_PAYLOAD, "")).toBe(false);
    });

    test("wrong secret → reject", () => {
        expect(verifyCallbackSignature(DOC_PAYLOAD, "not-the-secret")).toBe(false);
    });

    test("missing or malformed signatureHash → reject", () => {
        expect(verifyCallbackSignature({ ...DOC_PAYLOAD, signatureHash: undefined }, DOC_SECRET)).toBe(false);
        expect(verifyCallbackSignature({ ...DOC_PAYLOAD, signatureHash: "" }, DOC_SECRET)).toBe(false);
        expect(verifyCallbackSignature({ ...DOC_PAYLOAD, signatureHash: "deadbeef" }, DOC_SECRET)).toBe(false);
    });

    test("tampering with ANY signed field breaks verification", () => {
        for (const field of [
            "ProductCode",
            "Amount",
            "ProductType",
            "PaymentMethod",
            "status",
            "easykashRef",
            "customerReference",
        ]) {
            const tampered = { ...DOC_PAYLOAD, [field]: "tampered" };
            expect([field, verifyCallbackSignature(tampered, DOC_SECRET)]).toEqual([field, false]);
        }
    });

    test("raising the Amount — the attack that matters — breaks verification", () => {
        expect(verifyCallbackSignature({ ...DOC_PAYLOAD, Amount: "1100.00" }, DOC_SECRET)).toBe(false);
    });

    test("re-formatting the Amount breaks it too, so the raw string must be preserved", () => {
        // "11.00" -> "11" is the same number and a DIFFERENT hash. Anything that normalises the
        // payload before hashing (JSON round-trip through a number, toFixed, locale) rejects
        // every genuine callback.
        expect(buildSignatureBase({ ...DOC_PAYLOAD, Amount: 11 })).not.toBe(DOC_CONCAT);
    });

    test("field ORDER is load-bearing", () => {
        const swapped = buildSignatureBase({
            ...DOC_PAYLOAD,
            ProductCode: DOC_PAYLOAD.Amount,
            Amount: DOC_PAYLOAD.ProductCode,
        });
        expect(swapped).not.toBe(DOC_CONCAT);
    });
});

describe("provider status mapping", () => {
    test.each([
        ["PAID", "paid"],
        ["DELIVERED", "paid"],
        ["FAILED", "failed"],
        ["EXPIRED", "expired"],
        ["CANCELED", "cancelled"],
        ["REFUNDED", "refunded"],
        ["NEW", "pending"],
    ])("%s → %s", (raw, expected) => {
        expect(mapProviderStatus(raw)).toBe(expected);
    });

    test("case and whitespace do not change the meaning", () => {
        expect(mapProviderStatus("  paid ")).toBe("paid");
    });

    test("an unknown status stays UNKNOWN, never a terminal guess", () => {
        // Guessing `failed` would cancel a subscription the customer actually paid for.
        expect(mapProviderStatus("SOMETHING_NEW")).toBe("unknown");
        expect(mapProviderStatus(undefined)).toBe("unknown");
    });
});

describe("amount matching", () => {
    test("string and number forms of the same amount agree", () => {
        expect(amountsMatch(11, "11.00")).toBe(true);
        expect(amountsMatch(11.5, "11.50")).toBe(true);
        expect(amountsMatch(11, 11)).toBe(true);
    });

    test("a different amount is rejected", () => {
        expect(amountsMatch(11, "11.01")).toBe(false);
        expect(amountsMatch(11, "1100")).toBe(false);
    });

    test("garbage is rejected rather than treated as zero", () => {
        expect(amountsMatch(0, "")).toBe(false);
        expect(amountsMatch(11, undefined)).toBe(false);
        expect(amountsMatch(11, "eleven")).toBe(false);
    });
});

describe("period math", () => {
    const at = (s: string) => new Date(s + "T12:00:00.000Z");

    test("renewing early keeps the days already paid for", () => {
        const now = at("2026-03-01");
        const end = at("2026-03-20");
        const p = computeNextPeriod("monthly", now, end);
        expect(p.start.toISOString()).toBe(end.toISOString());
        expect(p.end.toISOString()).toBe(at("2026-04-20").toISOString());
    });

    test("renewing after lapse starts from now, not from the stale end", () => {
        const now = at("2026-05-10");
        const p = computeNextPeriod("monthly", now, at("2026-03-20"));
        expect(p.start.toISOString()).toBe(now.toISOString());
        expect(p.end.toISOString()).toBe(at("2026-06-10").toISOString());
    });

    test("a first subscription with no current period starts now", () => {
        const now = at("2026-05-10");
        expect(computeNextPeriod("annual", now, null).end.toISOString()).toBe(at("2027-05-10").toISOString());
    });

    test("month-end clamps instead of rolling over", () => {
        // 31 Jan + 1 month must be 28 Feb, not 3 March.
        expect(addCycle(at("2026-01-31"), "monthly").toISOString()).toBe(at("2026-02-28").toISOString());
        // 2028 is a leap year.
        expect(addCycle(at("2028-01-31"), "monthly").toISOString()).toBe(at("2028-02-29").toISOString());
    });

    test("29 Feb + 1 year clamps to 28 Feb", () => {
        expect(addCycle(at("2028-02-29"), "annual").toISOString()).toBe(at("2029-02-28").toISOString());
    });
});

describe("plan pricing — fails closed", () => {
    test("plan prices are MINOR units and are converted to major units for the provider", () => {
        // The Super Admin editor labels the field "Monthly Price (cents)" and its placeholder is
        // literally "4900 = $49.00"; the plans table renders `cents / 100`. EasyKash's Pay API
        // takes a MAJOR-unit amount. Passing the stored number through charges 100× — a 49.00
        // plan would bill 4,900. This is the assertion that stops that.
        expect(resolvePlanPrice({ currency: "EGP", billing: { monthlyPrice: 4900 } }, "monthly")).toEqual({
            ok: true,
            amount: 49,
            currency: "EGP",
        });
        expect(
            resolvePlanPrice({ currency: "egp", billing: { monthlyPrice: 500, annualPrice: 54000 } }, "monthly")
        ).toEqual({ ok: true, amount: 5, currency: "EGP" });
        expect(
            resolvePlanPrice({ currency: "EGP", billing: { monthlyPrice: 500, annualPrice: 54000 } }, "annual")
        ).toEqual({ ok: true, amount: 540, currency: "EGP" });
    });

    test("odd cent amounts survive the conversion exactly", () => {
        expect(resolvePlanPrice({ currency: "EGP", billing: { monthlyPrice: 1 } }, "monthly")).toEqual({
            ok: true,
            amount: 0.01,
            currency: "EGP",
        });
        expect(resolvePlanPrice({ currency: "EGP", billing: { monthlyPrice: 12345 } }, "monthly")).toEqual({
            ok: true,
            amount: 123.45,
            currency: "EGP",
        });
    });

    test("a fractional 'cents' value is refused rather than silently rounded", () => {
        // 49.5 cents is not a price anyone meant to set; charging 0.495 or 0.50 both guess.
        expect(resolvePlanPrice({ currency: "EGP", billing: { monthlyPrice: 49.5 } }, "monthly")).toEqual({
            ok: false,
            reason: "no-price",
        });
    });

    test("the plans actually in prod today (no price, no currency) REFUSE to be charged", () => {
        // plan_starter / plan_professional, verified 2026-08-09: name, limits, entitlements and
        // versioning only — no billing block, no currency. Charging 0 would give away paid plans.
        const prodShaped = { id: "plan_starter", name: "Starter", limits: { maxUsers: 3, storageGB: 10 } };
        expect(resolvePlanPrice(prodShaped, "monthly")).toEqual({ ok: false, reason: "no-price" });
    });

    test("a price with no currency is refused", () => {
        expect(resolvePlanPrice({ billing: { monthlyPrice: 500 } }, "monthly")).toEqual({
            ok: false,
            reason: "no-currency",
        });
    });

    test("a currency EasyKash does not support is refused", () => {
        expect(resolvePlanPrice({ currency: "JPY", billing: { monthlyPrice: 500 } }, "monthly")).toEqual({
            ok: false,
            reason: "no-currency",
        });
    });

    test("zero, negative and free are refused", () => {
        expect(resolvePlanPrice({ currency: "EGP", billing: { monthlyPrice: 0 } }, "monthly").ok).toBe(false);
        expect(resolvePlanPrice({ currency: "EGP", billing: { monthlyPrice: -5 } }, "monthly").ok).toBe(false);
        expect(resolvePlanPrice({ isFree: true, currency: "EGP", billing: { monthlyPrice: 9 } }, "monthly")).toEqual({
            ok: false,
            reason: "free-plan",
        });
    });
});

describe("customer reference", () => {
    test("compared as a string, so leading zeros cannot collide", () => {
        expect(customerReferenceMatches(123, "123")).toBe(true);
        expect(customerReferenceMatches(123, 123)).toBe(true);
        expect(customerReferenceMatches(123, " 123 ")).toBe(true);
        expect(customerReferenceMatches(123, "0123")).toBe(false);
    });

    test("a missing reference never matches", () => {
        expect(customerReferenceMatches(123, undefined)).toBe(false);
        expect(customerReferenceMatches(123, "")).toBe(false);
    });
});
