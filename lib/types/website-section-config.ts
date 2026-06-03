// Per-type config interfaces for the SA website-builder editor sections.
//
// Designed to be lifted verbatim into a future WebsiteSection discriminated-union
// migration (Phase 2 Option-B follow-up). Once that lands, the goal shape is:
//
//   type WebsiteSection =
//     | (WebsiteSectionBase & { type: "hero";         config: HeroSectionConfig })
//     | (WebsiteSectionBase & { type: "features";     config: FeaturesSectionConfig })
//     | (WebsiteSectionBase & { type: "pricing";      config: PricingSectionConfig })
//     | (WebsiteSectionBase & { type: "cta";          config: CtaSectionConfig })
//     | (WebsiteSectionBase & { type: "testimonials"; config: TestimonialsSectionConfig })
//     | (WebsiteSectionBase & { type: "faq";          config: FaqSectionConfig })
//     | (WebsiteSectionBase & { type: "text";         config: TextSectionConfig })
//     | (WebsiteSectionBase & { type: ...the 4 stub variants })
//
// Scope of this file: only the 7 IMPLEMENTED variants (hero, features, pricing,
// cta, testimonials, faq, text). The 4 stub variants (image, video, form, html)
// are deferred — they have no renderer or inspector yet, so defining their config
// shapes is a product decision, not a typing one.

// --- Nested item types ---
// Prefixed with "Website" to avoid collision with the public-site `FeatureItem` /
// `FaqItem` already defined in `lib/types/site-builder.ts` (a separate DU family).

export interface WebsiteFeatureItem {
    title: string;
    description: string;
}

export interface WebsitePricingPlan {
    name: string;
    price: string;
    features?: string[];
}

export interface WebsiteTestimonialItem {
    name: string;
    role?: string;
    quote: string;
}

export interface WebsiteFaqItem {
    question: string;
    answer: string;
}

// --- Per-type section configs ---
// All fields are optional because the renderers and inspectors all use `|| fallback`
// patterns at every read site. This matches the runtime contract that `getDefaultConfig`
// in `editor-context.tsx` produces only a partial payload (and may be edited live).

export interface HeroSectionConfig {
    headline?: string;
    subheadline?: string;
    backgroundImage?: string;
    ctaText?: string;
    ctaLink?: string;
}

export interface FeaturesSectionConfig {
    title?: string;
    features?: WebsiteFeatureItem[];
}

export interface PricingSectionConfig {
    title?: string;
    description?: string;
    plans?: WebsitePricingPlan[];
}

export interface CtaSectionConfig {
    headline?: string;
    subheadline?: string;
    buttonText?: string;
}

export interface TestimonialsSectionConfig {
    title?: string;
    testimonials?: WebsiteTestimonialItem[];
}

export interface FaqSectionConfig {
    title?: string;
    items?: WebsiteFaqItem[];
}

export interface TextSectionConfig {
    content?: string;
}

// --- Tag → config map ---
// Indexable by WebsiteSectionType for the 7 implemented variants. The DU
// migration will use `Extract<WebsiteSection, { type: K }>["config"]` instead
// (and at that point this map becomes redundant), but for the leaf-typing
// pass this is the canonical lookup.

export type SectionConfigFor = {
    hero: HeroSectionConfig;
    features: FeaturesSectionConfig;
    pricing: PricingSectionConfig;
    cta: CtaSectionConfig;
    testimonials: TestimonialsSectionConfig;
    faq: FaqSectionConfig;
    text: TextSectionConfig;
};
