import Link from "next/link";
import { ReactNode } from "react";

/**
 * Shared chrome for legal documents (/terms, /privacy). Server component — the
 * content is static, crawlable, and cache-friendly. Content is an English
 * SCAFFOLD: every company/jurisdiction-specific value is a <Placeholder> that
 * WasilaDev must confirm with counsel before these are treated as binding.
 */
export function LegalShell({
    title,
    subtitle,
    lastUpdated,
    children,
}: {
    title: string;
    subtitle: string;
    lastUpdated: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white text-gray-800">
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
                    <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
                        Dosory
                    </Link>
                    <nav className="flex items-center gap-5 text-sm text-gray-500">
                        <Link href="/terms" className="hover:text-gray-900">
                            Terms
                        </Link>
                        <Link href="/privacy" className="hover:text-gray-900">
                            Privacy
                        </Link>
                        <Link href="/login" className="hover:text-gray-900">
                            Sign in
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-12">
                <p className="text-sm font-medium uppercase tracking-wider text-blue-600">Legal</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
                <p className="mt-3 text-base text-gray-600">{subtitle}</p>
                <p className="mt-4 text-sm text-gray-400">Last updated: {lastUpdated}</p>

                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <strong>Draft scaffold.</strong> This document is a structural template. Sections marked{" "}
                    <span className="font-mono text-amber-800">[PLACEHOLDER]</span> must be reviewed and completed by
                    WasilaDev with qualified legal counsel before publication. It is not legal advice and is not binding
                    in its current form.
                </div>

                <article className="legal-prose mt-10 space-y-8 leading-relaxed text-gray-700">{children}</article>

                <footer className="mt-16 border-t border-gray-200 pt-8 text-sm text-gray-400">
                    <p>
                        © {new Date().getFullYear()}{" "}
                        <Placeholder>WasilaDev to confirm — registered company legal name</Placeholder>. All rights
                        reserved.
                    </p>
                    <p className="mt-2">
                        <Link href="/terms" className="text-blue-600 hover:underline">
                            Terms of Service
                        </Link>{" "}
                        ·{" "}
                        <Link href="/privacy" className="text-blue-600 hover:underline">
                            Privacy Policy
                        </Link>
                    </p>
                </footer>
            </main>
        </div>
    );
}

/** A visually distinct, un-missable placeholder for a value counsel must supply. */
export function Placeholder({ children }: { children: ReactNode }) {
    return (
        <mark className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[0.85em] text-amber-900 ring-1 ring-amber-300">
            [PLACEHOLDER: {children}]
        </mark>
    );
}

/** Numbered top-level section with an anchor. */
export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
    const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    return (
        <section id={id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-gray-900">
                {n}. {title}
            </h2>
            <div className="mt-3 space-y-3">{children}</div>
        </section>
    );
}
