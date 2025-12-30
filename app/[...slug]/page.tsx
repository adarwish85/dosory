// Dynamic Page Route
// Renders site pages based on URL slug

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SitePage, SiteDesign } from "@/lib/types/site-builder";
import { DynamicPageClient } from "./client";

interface PageProps {
    params: Promise<{ slug?: string[] }>;
}

async function getPageBySlug(slug: string): Promise<SitePage | null> {
    try {
        const q = query(
            collection(db, "platform/pages/items"),
            where("slug", "==", slug),
            where("isPublished", "==", true)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as SitePage;
        }
        return null;
    } catch (err) {
        console.error("Error fetching page:", err);
        return null;
    }
}

async function getSiteDesign(): Promise<SiteDesign> {
    const defaultDesign: SiteDesign = {
        primaryColor: "#0A66C2",
        secondaryColor: "#004182",
        accentColor: "#E7F3FF",
    };

    try {
        const designDoc = await getDoc(doc(db, "platform/siteDesign"));
        if (designDoc.exists()) {
            return { ...defaultDesign, ...designDoc.data() } as SiteDesign;
        }
        return defaultDesign;
    } catch (err) {
        console.error("Error fetching design:", err);
        return defaultDesign;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = resolvedParams.slug?.join("/") || "";

    // For home page, let the main page.tsx handle it
    if (!slug) {
        return {};
    }

    const page = await getPageBySlug(slug);

    if (!page) {
        return { title: "Page Not Found" };
    }

    return {
        title: page.seoTitle || page.title,
        description: page.seoDescription,
    };
}

export default async function DynamicPage({ params }: PageProps) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug?.join("/") || "";

    // For empty slug (home page), let the main page.tsx handle it
    if (!slug) {
        notFound();
    }

    const [page, design] = await Promise.all([getPageBySlug(slug), getSiteDesign()]);

    if (!page) {
        notFound();
    }

    return <DynamicPageClient page={page} design={design} />;
}
