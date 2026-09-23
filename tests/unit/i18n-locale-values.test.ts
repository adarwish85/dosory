/**
 * No locale value may be an empty string.
 *
 * WHY THIS EXISTS. `useTranslation`'s lookup is `if (translation) return …` — a truthiness
 * check — so a key whose value is "" is treated as MISSING and falls through to the English
 * fallback (lib/i18n/use-translation.ts). That is how the Arabic hero rendered
 * "…مكان واحد أنيق place": `landing.hero.titleTrail` was "" in ar.json, so the English word
 * leaked into an otherwise-Arabic headline.
 *
 * An empty value is therefore never "intentionally blank" — it is an English string waiting to
 * appear in the middle of another language. If a language genuinely does not need a fragment,
 * restructure the KEY (as landing.hero.title now does with its {accent} placeholder) rather
 * than blanking it.
 */
import en from "@/lib/i18n/locales/en.json";
import ar from "@/lib/i18n/locales/ar.json";

const LOCALES: Record<string, Record<string, unknown>> = {
    en: en as unknown as Record<string, unknown>,
    ar: ar as unknown as Record<string, unknown>,
};

/** Flattens nested objects so both the flat migration keys and any nested blocks are checked. */
function flatten(obj: Record<string, unknown>, prefix = ""): [string, unknown][] {
    return Object.entries(obj).flatMap(([k, v]) => {
        const path = prefix ? `${prefix}.${k}` : k;
        return v && typeof v === "object" && !Array.isArray(v)
            ? flatten(v as Record<string, unknown>, path)
            : [[path, v] as [string, unknown]];
    });
}

describe.each(Object.keys(LOCALES))("%s.json", (locale) => {
    const entries = flatten(LOCALES[locale]);

    test("has translations at all (guards against an empty or renamed file)", () => {
        expect(entries.length).toBeGreaterThan(1000);
    });

    test("no value is an empty or whitespace-only string", () => {
        const blank = entries.filter(([, v]) => typeof v === "string" && (v as string).trim() === "").map(([k]) => k);
        expect(blank).toEqual([]);
    });
});

describe("the hero headline is one template per language", () => {
    test("both locales carry landing.hero.title with an {accent} placeholder", () => {
        for (const locale of Object.keys(LOCALES)) {
            const title = LOCALES[locale]["landing.hero.title"];
            expect([locale, typeof title]).toEqual([locale, "string"]);
            expect([locale, String(title).includes("{accent}")]).toEqual([locale, true]);
        }
    });

    test("the split fragments are gone, so neither can be blanked again", () => {
        for (const locale of Object.keys(LOCALES)) {
            expect([locale, "landing.hero.titleLead" in LOCALES[locale]]).toEqual([locale, false]);
            expect([locale, "landing.hero.titleTrail" in LOCALES[locale]]).toEqual([locale, false]);
            // The accent word stays its own key — it is styled separately in the H1.
            expect([locale, typeof LOCALES[locale]["landing.hero.titleAccent"]]).toEqual([locale, "string"]);
        }
    });
});
