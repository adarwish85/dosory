/**
 * FAMILY C (#7) — address rendering. An Address OBJECT rendered as a React child threw
 * React #31 and tripped the invoices section error boundary when a customer was selected.
 */
import { formatAddress } from "@/lib/utils/format-address";

describe("formatAddress (FAMILY C)", () => {
    test("formats a full Address object into a renderable string", () => {
        expect(
            formatAddress({ street: "12 Nile St", city: "Cairo", state: "Cairo", zipCode: "11511", country: "Egypt" })
        ).toBe("12 Nile St, Cairo, Cairo, 11511, Egypt");
    });

    test("handles partial objects without stray separators", () => {
        expect(formatAddress({ city: "Cairo", country: "Egypt" })).toBe("Cairo, Egypt");
        expect(formatAddress({ street: "12 Nile St" })).toBe("12 Nile St");
        expect(formatAddress({ city: "Cairo", state: "", zipCode: undefined })).toBe("Cairo");
    });

    test("passes through legacy string addresses (older/imported customer docs)", () => {
        expect(formatAddress("12 Nile St, Cairo")).toBe("12 Nile St, Cairo");
    });

    test("nullish and empty shapes yield an empty string (caller shows its placeholder)", () => {
        expect(formatAddress(undefined)).toBe("");
        expect(formatAddress(null)).toBe("");
        expect(formatAddress({})).toBe("");
        expect(formatAddress("   ")).toBe("");
    });

    test("ALWAYS returns a string — never an object (the React #31 guarantee)", () => {
        const shapes: unknown[] = [{ street: "a" }, "b", null, undefined, {}, { city: "c", country: "d" }];
        for (const s of shapes) {
            expect(typeof formatAddress(s as never)).toBe("string");
        }
    });
});
