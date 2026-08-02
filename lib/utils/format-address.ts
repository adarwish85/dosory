import type { Address } from "@/lib/types";

/**
 * FAMILY C (#7, client QA 2026-07-28): `Customer.billingAddress` / `shippingAddress` are
 * `Address` OBJECTS ({street, city, state, zipCode, country}), but the invoice create page
 * rendered them straight into JSX. React refuses to render a plain object as a child and
 * throws "Objects are not valid as a React child" (minified error #31) — which the section
 * error boundary caught, so picking a customer blanked the whole invoice form
 * ("Unable to load this page" / «تعذر تحميل هذه الصفحة»).
 *
 * Address is ALSO stored as a plain string on older/imported customer docs (the add-customer
 * panel uses a Textarea for shipping), so this accepts either shape and always returns a
 * string that is safe to render.
 */
export function formatAddress(address: Address | string | null | undefined): string {
    if (!address) return "";
    if (typeof address === "string") return address.trim();
    if (typeof address !== "object") return String(address);

    const { street, city, state, zipCode, country } = address as Address;
    // City/state/zip read naturally on one line; street and country get their own segment.
    const cityLine = [city, state, zipCode].filter((p) => typeof p === "string" && p.trim()).join(", ");
    return [street, cityLine, country]
        .filter((p) => typeof p === "string" && p.trim())
        .map((p) => (p as string).trim())
        .join(", ");
}
