// Site Pages Hook
// CRUD operations for site builder pages

"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    doc,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SitePage, Block, SiteDesign } from "@/lib/types/site-builder";

const PAGES_COLLECTION = "platform/pages/items";
const DESIGN_DOC = "platform/siteDesign";

// ============================================
// usePages - List all pages
// ============================================

export function usePages() {
    const [pages, setPages] = useState<SitePage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const q = query(collection(db, PAGES_COLLECTION), orderBy("sortOrder", "asc"));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as SitePage[];
                setPages(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching pages:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const createPage = useCallback(async (page: Omit<SitePage, "id" | "createdAt" | "updatedAt">) => {
        const docRef = await addDoc(collection(db, PAGES_COLLECTION), {
            ...page,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    }, []);

    const updatePage = useCallback(async (id: string, data: Partial<SitePage>) => {
        await updateDoc(doc(db, PAGES_COLLECTION, id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deletePage = useCallback(async (id: string) => {
        await deleteDoc(doc(db, PAGES_COLLECTION, id));
    }, []);

    const reorderPages = useCallback(async (orderedIds: string[]) => {
        const batch: Promise<void>[] = orderedIds.map((id, index) =>
            updateDoc(doc(db, PAGES_COLLECTION, id), { sortOrder: index })
        );
        await Promise.all(batch);
    }, []);

    return {
        pages,
        loading,
        error,
        createPage,
        updatePage,
        deletePage,
        reorderPages,
    };
}

// ============================================
// usePage - Single page by ID
// ============================================

export function usePage(pageId: string | null) {
    const [page, setPage] = useState<SitePage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!pageId) {
            setPage(null);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(db, PAGES_COLLECTION, pageId),
            (snapshot) => {
                if (snapshot.exists()) {
                    setPage({ id: snapshot.id, ...snapshot.data() } as SitePage);
                } else {
                    setPage(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching page:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [pageId]);

    const updateBlocks = useCallback(
        async (blocks: Block[]) => {
            if (!pageId) return;
            await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
                blocks,
                updatedAt: serverTimestamp(),
            });
        },
        [pageId]
    );

    const updatePageData = useCallback(
        async (data: Partial<SitePage>) => {
            if (!pageId) return;
            await updateDoc(doc(db, PAGES_COLLECTION, pageId), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        [pageId]
    );

    return { page, loading, error, updateBlocks, updatePageData };
}

// ============================================
// usePageBySlug - For public rendering
// ============================================

export function usePageBySlug(slug: string) {
    const [page, setPage] = useState<SitePage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                const q = query(
                    collection(db, PAGES_COLLECTION),
                    where("slug", "==", slug),
                    where("isPublished", "==", true)
                );
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    setPage({ id: doc.id, ...doc.data() } as SitePage);
                } else {
                    setPage(null);
                }
            } catch (err) {
                console.error("Error fetching page by slug:", err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
    }, [slug]);

    return { page, loading, error };
}

// ============================================
// useSiteDesign - Global design settings
// ============================================

const defaultDesign: SiteDesign = {
    primaryColor: "#0A66C2",
    secondaryColor: "#004182",
    accentColor: "#E7F3FF",
    fontHeading: "Inter",
    fontBody: "Inter",
};

export function useSiteDesign() {
    const [design, setDesign] = useState<SiteDesign>(defaultDesign);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, DESIGN_DOC),
            (snapshot) => {
                if (snapshot.exists()) {
                    setDesign({ ...defaultDesign, ...snapshot.data() } as SiteDesign);
                }
                setLoading(false);
            },
            (err) => {
                console.warn("Error fetching site design:", err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const updateDesign = useCallback(
        async (data: Partial<SiteDesign>) => {
            const { setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, DESIGN_DOC), { ...design, ...data }, { merge: true });
        },
        [design]
    );

    return { design, loading, updateDesign };
}

// ============================================
// Migration Helper - Convert old landing config
// ============================================

export async function migrateOldLandingConfig(): Promise<string | null> {
    try {
        // Check if migration already happened
        const pagesSnapshot = await getDocs(collection(db, PAGES_COLLECTION));
        if (!pagesSnapshot.empty) {
            console.log("Pages already exist, skipping migration");
            return null;
        }

        // Fetch old landing config
        const oldConfigDoc = await getDoc(doc(db, "platform", "landing"));

        let homePageBlocks: Block[] = [];
        let migratedFromOld = false;

        if (oldConfigDoc.exists()) {
            const oldConfig = oldConfigDoc.data();
            migratedFromOld = true;

            // Hero block
            if (oldConfig.hero) {
                homePageBlocks.push({
                    id: crypto.randomUUID(),
                    type: "hero",
                    data: {
                        badge: oldConfig.hero.badge || "",
                        headline: oldConfig.hero.headline || "",
                        headlineHighlight: oldConfig.hero.headlineHighlight || "",
                        subheadline: oldConfig.hero.subheadline || "",
                        ctaPrimaryText: oldConfig.hero.ctaPrimary || "Get Started",
                        ctaPrimaryLink: "/signup",
                        ctaSecondaryText: oldConfig.hero.ctaSecondary || "Learn More",
                        ctaSecondaryLink: "#features",
                        showSocialProof: true,
                    },
                });
            }

            // Features block
            if (oldConfig.features?.length) {
                homePageBlocks.push({
                    id: crypto.randomUUID(),
                    type: "features",
                    data: {
                        sectionTitle: "What Can Our CRM Do For You?",
                        sectionSubtitle: "Everything you need to manage and grow your business",
                        items: oldConfig.features,
                        columns: 3,
                    },
                });
            }

            // Stats block
            if (oldConfig.stats?.length) {
                homePageBlocks.push({
                    id: crypto.randomUUID(),
                    type: "stats",
                    data: {
                        items: oldConfig.stats,
                        backgroundColor: "primary",
                    },
                });
            }

            // Testimonial block
            if (oldConfig.testimonial) {
                homePageBlocks.push({
                    id: crypto.randomUUID(),
                    type: "testimonial",
                    data: {
                        quote: oldConfig.testimonial.quote || "",
                        author: oldConfig.testimonial.author || "",
                        role: oldConfig.testimonial.role || "",
                        rating: 5,
                    },
                });
            }

            // FAQ block
            if (oldConfig.faqs?.length) {
                homePageBlocks.push({
                    id: crypto.randomUUID(),
                    type: "faq",
                    data: {
                        sectionTitle: "CRM Sales FAQs",
                        sectionSubtitle: "Got questions? We've got answers.",
                        items: oldConfig.faqs,
                    },
                });
            }

            // Migrate design settings
            if (oldConfig.design) {
                const { setDoc } = await import("firebase/firestore");
                await setDoc(doc(db, DESIGN_DOC), {
                    ...oldConfig.design,
                });
            }
        } else {
            // No old config found - create sample blocks
            console.log("No old landing config found, creating sample home page");
            homePageBlocks = [
                {
                    id: crypto.randomUUID(),
                    type: "hero",
                    data: {
                        badge: "✨ Welcome",
                        headline: "Build Your Business",
                        headlineHighlight: "with Dosory",
                        subheadline:
                            "The all-in-one CRM and ERP platform for modern businesses. Manage customers, invoices, projects, and more.",
                        ctaPrimaryText: "Get Started Free",
                        ctaPrimaryLink: "/signup",
                        ctaSecondaryText: "Learn More",
                        ctaSecondaryLink: "#features",
                        showSocialProof: true,
                    },
                },
                {
                    id: crypto.randomUUID(),
                    type: "features",
                    data: {
                        sectionTitle: "Everything You Need",
                        sectionSubtitle: "Powerful features to grow your business",
                        items: [
                            {
                                icon: "Users",
                                title: "Customer Management",
                                description: "Track leads and customers in one place.",
                            },
                            {
                                icon: "FileText",
                                title: "Invoicing",
                                description: "Create and send professional invoices.",
                            },
                            {
                                icon: "CheckSquare",
                                title: "Tasks & Projects",
                                description: "Organize work with tasks and projects.",
                            },
                        ],
                        columns: 3,
                    },
                },
                {
                    id: crypto.randomUUID(),
                    type: "cta",
                    data: {
                        headline: "Ready to Get Started?",
                        subheadline: "Start your free trial today. No credit card required.",
                        ctaText: "Start Free Trial",
                        ctaLink: "/signup",
                        secondaryCtaText: "Contact Sales",
                        secondaryCtaLink: "/login",
                        backgroundColor: "gray",
                    },
                },
            ];
        }

        // Always add CTA block at end if we migrated from old config
        if (migratedFromOld) {
            homePageBlocks.push({
                id: crypto.randomUUID(),
                type: "cta",
                data: {
                    headline: "Ready to Transform Your Business?",
                    subheadline: "Start your 14-day free trial today. No credit card required.",
                    ctaText: "Get Started Free",
                    ctaLink: "/signup",
                    secondaryCtaText: "Contact Sales",
                    secondaryCtaLink: "/login",
                    backgroundColor: "gray",
                },
            });
        }

        // Create home page
        const homePageRef = await addDoc(collection(db, PAGES_COLLECTION), {
            slug: "",
            title: "Home",
            seoTitle: "Dosory - CRM & ERP Platform",
            seoDescription: "The all-in-one CRM and ERP platform for modern businesses.",
            isPublished: true,
            isHome: true,
            sortOrder: 0,
            blocks: homePageBlocks,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        console.log("Migration complete! Home page created:", homePageRef.id);
        return homePageRef.id;
    } catch (err) {
        console.error("Migration error:", err);
        throw err;
    }
}
