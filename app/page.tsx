"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PlatformLogo } from "@/lib/hooks/use-platform-settings";
import { Button } from "@/components/ui/button";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import type { SitePage, SiteDesign } from "@/lib/types/site-builder";

// Default design for fallback
const defaultDesign: SiteDesign = {
    primaryColor: "#0A66C2",
    secondaryColor: "#004182",
    accentColor: "#E7F3FF",
};

export default function Home() {
    const [page, setPage] = useState<SitePage | null>(null);
    const [design, setDesign] = useState<SiteDesign>(defaultDesign);
    const [loading, setLoading] = useState(true);
    const [usingLegacy, setUsingLegacy] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                // Try to load from new pages system (home page has empty slug)
                const pagesQuery = query(
                    collection(db, "platform/pages/items"),
                    where("isHome", "==", true),
                    where("isPublished", "==", true)
                );
                const pagesSnap = await getDocs(pagesQuery);

                if (!pagesSnap.empty) {
                    const pageDoc = pagesSnap.docs[0];
                    setPage({ id: pageDoc.id, ...pageDoc.data() } as SitePage);
                } else {
                    // Fallback: Check for page with empty slug
                    const slugQuery = query(
                        collection(db, "platform/pages/items"),
                        where("slug", "==", ""),
                        where("isPublished", "==", true)
                    );
                    const slugSnap = await getDocs(slugQuery);

                    if (!slugSnap.empty) {
                        const pageDoc = slugSnap.docs[0];
                        setPage({ id: pageDoc.id, ...pageDoc.data() } as SitePage);
                    } else {
                        // No new-style page found, will show migration prompt or legacy
                        setUsingLegacy(true);
                    }
                }

                // Load design settings
                const designDoc = await getDoc(doc(db, "platform/siteDesign"));
                if (designDoc.exists()) {
                    setDesign({ ...defaultDesign, ...designDoc.data() } as SiteDesign);
                }
            } catch (err) {
                console.error("Error loading page:", err);
                setUsingLegacy(true);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // If no page exists in the new system, show a simple fallback
    if (!page || usingLegacy) {
        return <LegacyFallback design={design} />;
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <PlatformLogo size="default" textClassName="text-xl text-gray-900" />
                        </Link>

                        <nav className="hidden md:flex items-center gap-8">
                            <Link
                                href="#features"
                                className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors"
                            >
                                Features
                            </Link>
                            <Link
                                href="#pricing"
                                className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors"
                            >
                                Pricing
                            </Link>
                            <Link
                                href="#testimonials"
                                className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors"
                            >
                                Testimonials
                            </Link>
                            <Link
                                href="#faq"
                                className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors"
                            >
                                FAQ
                            </Link>
                        </nav>

                        <div className="flex items-center gap-3">
                            <Link href="/login">
                                <Button variant="ghost" className="text-gray-700">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button
                                    style={{ backgroundColor: design.primaryColor }}
                                    className="text-white hover:opacity-90"
                                >
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Dynamic Blocks */}
            <main className="pt-16">
                {page.blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} design={design} />
                ))}
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <Link href="/" className="flex items-center gap-2 mb-4">
                                <PlatformLogo size="default" textClassName="text-xl text-white" variant="light" />
                            </Link>
                            <p className="text-gray-400 text-sm">
                                The all-in-one CRM and ERP platform for modern businesses.
                            </p>
                        </div>

                        {[
                            { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
                            { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
                            { title: "Support", links: ["Help Center", "Contact", "Status", "Terms"] },
                        ].map((col, i) => (
                            <div key={i}>
                                <h3 className="font-semibold mb-4">{col.title}</h3>
                                <ul className="space-y-3">
                                    {col.links.map((link, j) => (
                                        <li key={j}>
                                            <Link
                                                href="#"
                                                className="text-gray-400 hover:text-white text-sm transition-colors"
                                            >
                                                {link}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-gray-400 text-sm">
                            © {new Date().getFullYear()} Dosory. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <Link href="#" className="text-gray-400 hover:text-white text-sm">
                                Privacy Policy
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white text-sm">
                                Terms of Service
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// Legacy fallback when no pages exist yet
function LegacyFallback({ design }: { design: SiteDesign }) {
    return (
        <div className="min-h-screen bg-white">
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <PlatformLogo size="default" textClassName="text-xl text-gray-900" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/login">
                                <Button variant="ghost" className="text-gray-700">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button
                                    style={{ backgroundColor: design.primaryColor }}
                                    className="text-white hover:opacity-90"
                                >
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-24">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                        Welcome to{" "}
                        <span
                            className="bg-clip-text text-transparent"
                            style={{
                                backgroundImage: `linear-gradient(to right, ${design.primaryColor}, ${design.secondaryColor})`,
                            }}
                        >
                            Dosory
                        </span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        The all-in-one CRM and ERP platform for modern businesses.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" style={{ backgroundColor: design.primaryColor }} className="text-white">
                                Get Started Free
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button size="lg" variant="outline">
                                Sign In
                            </Button>
                        </Link>
                    </div>
                    <p className="mt-12 text-sm text-gray-500">
                        To customize this page, go to Super Admin → Site Builder and import your existing configuration
                        or create a new home page.
                    </p>
                </div>
            </main>

            <footer className="bg-gray-900 text-white py-8 text-center text-gray-400 text-sm">
                © {new Date().getFullYear()} Dosory. All rights reserved.
            </footer>
        </div>
    );
}
