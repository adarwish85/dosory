
import { Timestamp } from "firebase/firestore";

// --- Website ---
export interface Website {
    id: string; // e.g. "dosory-main"
    name: string;
    primaryDomain: string;
    status: "draft" | "published";
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --- Page ---
export interface WebsitePageSeo {
    title: string;
    description: string;
    ogImage?: string;
    keywords?: string[];
}

export interface WebsitePage {
    id: string;
    websiteId: string;
    slug: string; // e.g. "/" or "/pricing" (unique per website)
    title: string;
    seo: WebsitePageSeo;
    status: "draft" | "published";
    layoutId?: string; // Optional reference to a shared layout
    publishedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

// --- Section (The building block) ---
export type WebsiteSectionType =
    | "hero"
    | "features"
    | "pricing"
    | "cta"
    | "testimonials"
    | "faq"
    | "text"
    | "image"
    | "video"
    | "form"
    | "html";

export interface WebsiteSection {
    id: string;
    pageId: string;
    type: WebsiteSectionType;
    order: number;
    // Config is a flexible map - varies by section type
    // e.g. Hero: { headline, subheadline, ctaLink, bgImage }
    config: Record<string, any>;
    // Styles override standard theme
    styles?: {
        backgroundColor?: string;
        paddingTop?: string;
        paddingBottom?: string;
        className?: string; // Tailwind overrides
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --- Asset ---
export interface WebsiteAsset {
    id: string;
    websiteId?: string;
    url: string;
    fileName: string;
    fileType: string; // MIME type e.g. "image/png"
    size: number; // bytes
    dimensions?: {
        width: number;
        height: number;
    };
    createdAt: Timestamp;
    uploadedBy: string;
}

// --- Versioning ---
export interface WebsiteVersion {
    id: string;
    websiteId: string;
    pageId?: string; // If versioning per page
    // Snapshot of the entire page content (sections config)
    snapshot: {
        page: Partial<WebsitePage>;
        sections: WebsiteSection[];
    };
    createdAt: Timestamp;
    createdBy: string;
    description?: string; // e.g. "Updated Pricing"
}
