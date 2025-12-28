"use client";

import Link from "next/link";
import { PlatformLogo } from "@/lib/hooks/use-platform-settings";
import { Button } from "@/components/ui/button";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import type { SitePage, SiteDesign } from "@/lib/types/site-builder";

interface DynamicPageClientProps {
    page: SitePage;
    design: SiteDesign;
}

export function DynamicPageClient({ page, design }: DynamicPageClientProps) {
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
                            <Link href="/#features" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors">Features</Link>
                            <Link href="/#pricing" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors">Pricing</Link>
                            <Link href="/#testimonials" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors">Testimonials</Link>
                            <Link href="/#faq" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors">FAQ</Link>
                        </nav>

                        <div className="flex items-center gap-3">
                            <Link href="/login">
                                <Button variant="ghost" className="text-gray-700">Sign In</Button>
                            </Link>
                            <Link href="/signup">
                                <Button style={{ backgroundColor: design.primaryColor }} className="text-white hover:opacity-90">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Page Content */}
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
                                            <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
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
                            <Link href="#" className="text-gray-400 hover:text-white text-sm">Privacy Policy</Link>
                            <Link href="#" className="text-gray-400 hover:text-white text-sm">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
