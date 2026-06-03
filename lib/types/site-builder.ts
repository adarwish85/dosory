// Site Builder Types
// Defines the data model for pages and blocks in the site builder

import { Timestamp } from "firebase/firestore";

// ============================================
// Block Type Definitions
// ============================================

export type BlockType = "hero" | "features" | "stats" | "testimonial" | "faq" | "cta" | "text" | "pricing";

// Hero Block
export interface HeroBlockData {
    badge?: string;
    headline: string;
    headlineHighlight?: string;
    subheadline?: string;
    ctaPrimaryText?: string;
    ctaPrimaryLink?: string;
    ctaSecondaryText?: string;
    ctaSecondaryLink?: string;
    showSocialProof?: boolean;
}

// Features Block
export interface FeatureItem {
    icon: string;
    title: string;
    description: string;
}

export interface FeaturesBlockData {
    sectionTitle?: string;
    sectionSubtitle?: string;
    items: FeatureItem[];
    columns?: 2 | 3 | 4;
}

// Stats Block
export interface StatItem {
    value: string;
    label: string;
    icon?: string;
}

export interface StatsBlockData {
    items: StatItem[];
    backgroundColor?: "primary" | "secondary" | "white" | "gray";
}

// Testimonial Block
export interface TestimonialBlockData {
    quote: string;
    author: string;
    role?: string;
    company?: string;
    avatarUrl?: string;
    rating?: number;
}

// FAQ Block
export interface FaqItem {
    question: string;
    answer: string;
}

export interface FaqBlockData {
    sectionTitle?: string;
    sectionSubtitle?: string;
    items: FaqItem[];
}

// CTA Block
export interface CtaBlockData {
    headline: string;
    subheadline?: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
    icon?: string;
    backgroundColor?: "primary" | "secondary" | "gray";
}

// Text Block (Rich Content)
export interface TextBlockData {
    content: string; // Markdown or HTML
    alignment?: "left" | "center" | "right";
    maxWidth?: "sm" | "md" | "lg" | "full";
}

// Pricing Block (pulls from subscription plans)
export interface PricingBlockData {
    sectionTitle?: string;
    sectionSubtitle?: string;
    showAnnualToggle?: boolean;
}

// ============================================
// Block Union Type
// ============================================

export type BlockData =
    | { type: "hero"; data: HeroBlockData }
    | { type: "features"; data: FeaturesBlockData }
    | { type: "stats"; data: StatsBlockData }
    | { type: "testimonial"; data: TestimonialBlockData }
    | { type: "faq"; data: FaqBlockData }
    | { type: "cta"; data: CtaBlockData }
    | { type: "text"; data: TextBlockData }
    | { type: "pricing"; data: PricingBlockData };

export type Block = BlockData & { id: string };

// Map each BlockType literal to its specific payload type.
// Lets defaultBlockData / createBlock preserve the tag↔payload pairing that BlockData encodes.
type BlockDataFor<T extends BlockType> = Extract<BlockData, { type: T }>["data"];

// ============================================
// Page Definition
// ============================================

export interface SitePage {
    id: string;
    slug: string; // URL path (e.g., "about-us", "" for home)
    title: string; // Display title in admin
    seoTitle?: string; // <title> tag content
    seoDescription?: string; // <meta name="description">
    isPublished: boolean;
    isHome?: boolean; // Is this the home page?
    sortOrder: number; // For nav menu ordering
    blocks: Block[];
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// ============================================
// Site Design (Global Styles)
// ============================================

export interface SiteDesign {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontHeading?: string;
    fontBody?: string;
    logoUrl?: string;
    faviconUrl?: string;
}

// ============================================
// Default Block Templates
// ============================================

export const defaultBlockData: { [K in BlockType]: BlockDataFor<K> } = {
    hero: {
        badge: "",
        headline: "Your Headline Here",
        headlineHighlight: "Highlighted Text",
        subheadline: "Add a compelling description for your visitors.",
        ctaPrimaryText: "Get Started",
        ctaPrimaryLink: "/signup",
        ctaSecondaryText: "Learn More",
        ctaSecondaryLink: "#features",
        showSocialProof: true,
    },

    features: {
        sectionTitle: "Features",
        sectionSubtitle: "Everything you need",
        items: [
            { icon: "Zap", title: "Feature 1", description: "Description here" },
            { icon: "Users", title: "Feature 2", description: "Description here" },
            { icon: "BarChart3", title: "Feature 3", description: "Description here" },
        ],
        columns: 3,
    },

    stats: {
        items: [
            { value: "10K+", label: "Users", icon: "Users" },
            { value: "99%", label: "Uptime", icon: "Zap" },
            { value: "$1M+", label: "Revenue", icon: "TrendingUp" },
        ],
        backgroundColor: "primary",
    },

    testimonial: {
        quote: "This product changed everything for our business.",
        author: "John Doe",
        role: "CEO",
        company: "Acme Inc.",
        rating: 5,
    },

    faq: {
        sectionTitle: "Frequently Asked Questions",
        items: [
            { question: "How does it work?", answer: "It's simple..." },
            { question: "What's included?", answer: "Everything you need..." },
        ],
    },

    cta: {
        headline: "Ready to get started?",
        subheadline: "Join thousands of happy customers today.",
        ctaText: "Start Free Trial",
        ctaLink: "/signup",
        backgroundColor: "gray",
    },

    text: {
        content: "Add your content here...",
        alignment: "left",
        maxWidth: "lg",
    },

    pricing: {
        sectionTitle: "Pricing",
        sectionSubtitle: "Choose the plan that's right for you",
        showAnnualToggle: true,
    },
};

// Helper to create a new block with a unique ID
export function createBlock<T extends BlockType>(type: T): Extract<Block, { type: T }> {
    return {
        id: crypto.randomUUID(),
        type,
        data: { ...defaultBlockData[type] } as BlockDataFor<T>,
        // Outer cast is unavoidable: TS does not distribute Extract<Block, {type: T}>
        // over generic T, so it cannot recognise the assembled literal as the right variant.
        // The inner `data` cast and the function signature carry the real type safety.
    } as unknown as Extract<Block, { type: T }>;
}
