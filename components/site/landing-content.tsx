"use client";

import Link from "next/link";
import { SiteLogo } from "@/components/site/site-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    Target,
    FileText,
    FolderKanban,
    SquareCheck,
    Headphones,
    Landmark,
    UserCog,
    BookOpen,
    BarChart3,
    FileSignature,
    Building2,
    Receipt,
    ShieldCheck,
} from "lucide-react";
import { LandingShot as Shot } from "@/components/site/landing-shot";
import { useTranslation } from "@/lib/i18n";

// --- Editorial type system (scoped to the landing) ---------------------------
const fraunces = Fraunces({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-fraunces",
    display: "swap",
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-landing", display: "swap" });

const serif = { fontFamily: "var(--font-fraunces), Georgia, 'Times New Roman', serif" };
const sans = { fontFamily: "var(--font-geist), ui-sans-serif, system-ui, sans-serif" };
const mono = { fontFamily: "var(--font-mono-landing), ui-monospace, SFMono-Regular, monospace" };

const css = `
@keyframes riseIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.rise { opacity: 0; animation: riseIn .9s cubic-bezier(.16,.84,.34,1) forwards; }
@media (prefers-reduced-motion: reduce) { .rise { animation: none; opacity: 1; } .floaty { animation: none !important; } }
`;

function BrowserFrame({
    url = "acme.dosory.com",
    children,
    className = "",
}: {
    url?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`overflow-hidden rounded-xl border border-[#E2DFD7] bg-white shadow-[0_30px_60px_-30px_rgba(20,23,30,0.28)] ${className}`}
        >
            <div className="flex items-center gap-3 border-b border-[#EDEAE3] bg-[#F7F5F1] px-4 py-2.5">
                <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E5594F]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E7B14C]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#56B36B]" />
                </div>
                <div
                    className="mx-auto flex w-full max-w-xs items-center justify-center gap-1.5 rounded-md border border-[#E7E3DB] bg-white px-3 py-1 text-[11px] text-[#8A8C93]"
                    style={mono}
                    dir="ltr"
                >
                    <ShieldCheck className="h-3 w-3 text-[#56B36B]" />
                    {url}
                </div>
            </div>
            {children}
        </div>
    );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p className="mb-4 flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-[#0A66C2]" style={mono}>
            <span className="h-px w-6 bg-[#0A66C2]/50" />
            {children}
        </p>
    );
}

export function LandingContent() {
    const { t } = useTranslation();

    // Feature sections — text comes from t(); icon/slug/screenshot stay static.
    const features = [
        {
            key: "sales",
            slug: "leads",
            icon: Target,
            shot: { label: "LEADS PIPELINE", src: "/screenshots/leads.png" as string | undefined },
        },
        {
            key: "billing",
            slug: "invoices",
            icon: Receipt,
            shot: { label: "INVOICE", src: "/screenshots/invoices.png" as string | undefined },
        },
        {
            key: "delivery",
            slug: "projects",
            icon: FolderKanban,
            shot: { label: "PROJECTS BOARD", src: "/screenshots/projects.png" as string | undefined },
        },
        {
            key: "books",
            slug: "finance",
            icon: Landmark,
            shot: { label: "FINANCE / LEDGER", src: "/screenshots/finance.png" as string | undefined },
        },
        {
            key: "people",
            slug: "hr",
            icon: UserCog,
            shot: { label: "HR / EMPLOYEES", src: "/screenshots/hr.png" as string | undefined },
        },
    ];

    const modules = [
        { icon: Building2, key: "customers" },
        { icon: Target, key: "leads" },
        { icon: FileText, key: "invoices" },
        { icon: Receipt, key: "estimates" },
        { icon: FolderKanban, key: "projects" },
        { icon: SquareCheck, key: "tasks" },
        { icon: Headphones, key: "support" },
        { icon: FileSignature, key: "contracts" },
        { icon: BookOpen, key: "knowledgeBase" },
        { icon: UserCog, key: "hr" },
        { icon: Landmark, key: "finance" },
        { icon: BarChart3, key: "reports" },
    ];

    const stats = [
        { figure: "12+", key: "modules" },
        { figure: "1", key: "truth" },
        { figure: "∞", key: "tenants" },
        { figure: "RBAC", key: "rbac" },
    ];

    const faqs = ["1", "2", "3", "4"];
    const footerCols = [
        { titleKey: "colProduct", links: ["features", "modules", "pricing", "signin"] },
        { titleKey: "colCompany", links: ["about", "blog", "careers", "contact"] },
        { titleKey: "colLegal", links: ["privacy", "terms", "security", "status"] },
    ];

    return (
        <div
            className={`${fraunces.variable} ${geist.variable} ${geistMono.variable} min-h-screen bg-[#FBFAF7] text-[#16171B] antialiased selection:bg-[#0A66C2] selection:text-white`}
            style={sans}
        >
            <style dangerouslySetInnerHTML={{ __html: css }} />

            {/* ---------------- Top bar ---------------- */}
            <header className="sticky top-0 z-50 border-b border-[#EAE7E0] bg-[#FBFAF7]/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
                    <Link
                        href="/"
                        className="flex items-baseline gap-[2px] text-[22px] tracking-tight text-[#16171B]"
                        style={serif}
                    >
                        <SiteLogo
                            variant="dark"
                            className="h-8 w-auto"
                            fallback={
                                <>
                                    Dosory
                                    <span className="text-[#0A66C2]">.</span>
                                </>
                            }
                        />
                    </Link>
                    <nav className="hidden items-center gap-9 text-[14px] text-[#5B5D64] md:flex">
                        <a href="#product" className="transition-colors hover:text-[#16171B]">
                            {t("landing.nav.product")}
                        </a>
                        <a href="#modules" className="transition-colors hover:text-[#16171B]">
                            {t("landing.nav.modules")}
                        </a>
                        <a href="#pricing" className="transition-colors hover:text-[#16171B]">
                            {t("landing.nav.pricing")}
                        </a>
                        <a href="#faq" className="transition-colors hover:text-[#16171B]">
                            {t("landing.nav.faq")}
                        </a>
                    </nav>
                    <div className="flex items-center gap-2.5">
                        <LanguageSwitcher variant="ghost" className="text-[#16171B] hover:bg-[#F0EDE6]" />
                        <Link
                            href="/login"
                            className="rounded-lg px-3.5 py-2 text-[14px] text-[#16171B] transition-colors hover:bg-[#F0EDE6]"
                        >
                            {t("landing.nav.signIn")}
                        </Link>
                        <Link
                            href="/signup"
                            className="group flex items-center gap-1.5 rounded-lg bg-[#16171B] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#0A66C2]"
                        >
                            {t("landing.nav.startFree")}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ---------------- Hero ---------------- */}
            <section id="product" className="relative overflow-hidden">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.5]"
                    style={{
                        backgroundImage: "radial-gradient(#E4E1D8 1px, transparent 1px)",
                        backgroundSize: "26px 26px",
                        maskImage: "linear-gradient(to bottom, black, transparent 70%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
                    }}
                />
                <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-20 text-center sm:px-8 sm:pt-28">
                    <p
                        className="rise mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#E2DFD7] bg-white px-3.5 py-1.5 text-[12px] tracking-wide text-[#5B5D64]"
                        style={{ ...mono, animationDelay: "0ms" }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#56B36B]" />
                        {t("landing.hero.badge")}
                    </p>
                    <h1
                        className="rise mx-auto max-w-3xl text-[42px] leading-[1.04] tracking-[-0.02em] text-[#16171B] sm:text-[64px]"
                        style={{ ...serif, animationDelay: "80ms" }}
                    >
                        {t("landing.hero.titleLead")}{" "}
                        <span className="relative whitespace-nowrap text-[#0A66C2]">
                            {t("landing.hero.titleAccent")}
                            <svg
                                className="absolute -bottom-2 left-0 w-full"
                                viewBox="0 0 200 12"
                                fill="none"
                                preserveAspectRatio="none"
                                aria-hidden
                            >
                                <path
                                    d="M2 9C40 3 160 3 198 9"
                                    stroke="#0A66C2"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    opacity="0.5"
                                />
                            </svg>
                        </span>{" "}
                        {t("landing.hero.titleTrail")}
                    </h1>
                    <p
                        className="rise mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-[#5B5D64] sm:text-[19px]"
                        style={{ animationDelay: "160ms" }}
                    >
                        {t("landing.hero.subtitle")}
                    </p>
                    <div
                        className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
                        style={{ animationDelay: "240ms" }}
                    >
                        <Link
                            href="/signup"
                            className="group flex items-center gap-2 rounded-xl bg-[#0A66C2] px-6 py-3.5 text-[15px] font-medium text-white shadow-[0_12px_24px_-12px_rgba(10,102,194,0.7)] transition-all hover:bg-[#0a5bad]"
                        >
                            {t("landing.hero.ctaPrimary")}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="/login"
                            className="flex items-center gap-2 rounded-xl border border-[#E2DFD7] bg-white px-6 py-3.5 text-[15px] font-medium text-[#16171B] transition-colors hover:bg-[#F7F5F1]"
                        >
                            {t("landing.hero.ctaSecondary")}
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="rise relative mx-auto mt-16 max-w-5xl" style={{ animationDelay: "340ms" }}>
                        <BrowserFrame url="acme.dosory.com/dashboard">
                            <Shot label="DASHBOARD" src="/screenshots/dashboard.png" ratio="aspect-[16/9]" />
                        </BrowserFrame>
                        <div
                            className="floaty absolute -bottom-8 -right-3 hidden w-56 sm:block lg:-right-12 lg:w-64"
                            style={{ animation: "floatY 6s ease-in-out infinite" }}
                        >
                            <BrowserFrame url="invoice">
                                <Shot label="INVOICE" src="/screenshots/invoice.png" ratio="aspect-[4/5]" />
                            </BrowserFrame>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------------- Stat band ---------------- */}
            <section className="border-y border-[#EAE7E0] bg-white">
                <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-[#EFECE5] px-5 sm:px-8 md:grid-cols-4">
                    {stats.map((s) => (
                        <div key={s.key} className="px-4 py-8 text-center md:py-10">
                            <div className="text-[34px] leading-none text-[#16171B] sm:text-[40px]" style={serif}>
                                {s.figure}
                            </div>
                            <div className="mt-2 text-[13px] text-[#5B5D64]">{t(`landing.stats.${s.key}`)}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---------------- Alternating feature sections ---------------- */}
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
                {features.map((f, i) => {
                    const flip = i % 2 === 1;
                    const Icon = f.icon;
                    return (
                        <section
                            key={f.key}
                            className="grid items-center gap-10 border-b border-[#EAE7E0] py-20 md:grid-cols-2 md:gap-16"
                        >
                            <div className={flip ? "md:order-2" : ""}>
                                <Eyebrow>{t(`landing.feat.${f.key}.eyebrow`)}</Eyebrow>
                                <h2
                                    className="max-w-md text-[28px] leading-[1.12] tracking-[-0.01em] text-[#16171B] sm:text-[36px]"
                                    style={serif}
                                >
                                    {t(`landing.feat.${f.key}.title`)}
                                </h2>
                                <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#5B5D64]">
                                    {t(`landing.feat.${f.key}.body`)}
                                </p>
                                <ul className="mt-7 space-y-3">
                                    {["p1", "p2", "p3"].map((p) => (
                                        <li key={p} className="flex items-center gap-3 text-[15px] text-[#2C2E34]">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF2FB] text-[#0A66C2]">
                                                <Check className="h-3 w-3" strokeWidth={3} />
                                            </span>
                                            {t(`landing.feat.${f.key}.${p}`)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={flip ? "md:order-1" : ""}>
                                <div className="relative">
                                    <div className="absolute -inset-3 -z-10 rounded-2xl bg-[#EAF2FB]/60" />
                                    <BrowserFrame url={`acme.dosory.com/${f.slug}`}>
                                        <div className="flex items-center gap-2 px-4 pt-3">
                                            <Icon className="h-3.5 w-3.5 text-[#0A66C2]" />
                                        </div>
                                        <Shot label={f.shot.label} src={f.shot.src} />
                                    </BrowserFrame>
                                </div>
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* ---------------- Module grid ---------------- */}
            <section id="modules" className="bg-white py-20">
                <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
                    <Eyebrow>
                        <span className="mx-auto">{t("landing.modules.eyebrow")}</span>
                    </Eyebrow>
                    <h2
                        className="mx-auto max-w-2xl text-[30px] leading-tight tracking-[-0.01em] text-[#16171B] sm:text-[40px]"
                        style={serif}
                    >
                        {t("landing.modules.title")}
                    </h2>
                    <p className="mx-auto mt-5 max-w-lg text-[16px] text-[#5B5D64]">{t("landing.modules.subtitle")}</p>
                    <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {modules.map((m) => {
                            const Icon = m.icon;
                            return (
                                <div
                                    key={m.key}
                                    className="group flex items-center gap-3 rounded-xl border border-[#EAE7E0] bg-[#FBFAF7] px-4 py-4 text-left transition-all hover:border-[#CFE0F4] hover:bg-white hover:shadow-[0_14px_28px_-20px_rgba(10,102,194,0.5)]"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0A66C2] shadow-sm ring-1 ring-[#EAE7E0] transition-colors group-hover:bg-[#0A66C2] group-hover:text-white">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="text-[15px] font-medium text-[#16171B]">
                                        {t(`landing.modules.items.${m.key}`)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ---------------- Pricing teaser ---------------- */}
            <section id="pricing" className="border-t border-[#EAE7E0] py-20">
                <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 md:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <Eyebrow>{t("landing.pricing.eyebrow")}</Eyebrow>
                        <h2
                            className="max-w-md text-[30px] leading-tight tracking-[-0.01em] text-[#16171B] sm:text-[40px]"
                            style={serif}
                        >
                            {t("landing.pricing.title")}
                        </h2>
                        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#5B5D64]">
                            {t("landing.pricing.body")}
                        </p>
                        <Link
                            href="/signup"
                            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0A66C2] px-6 py-3.5 text-[15px] font-medium text-white shadow-[0_12px_24px_-12px_rgba(10,102,194,0.7)] transition-all hover:bg-[#0a5bad]"
                        >
                            {t("landing.pricing.cta")}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                    <div className="rounded-2xl border border-[#E2DFD7] bg-white p-8 shadow-[0_30px_60px_-40px_rgba(20,23,30,0.3)]">
                        <p className="text-[13px] uppercase tracking-[0.16em] text-[#0A66C2]" style={mono}>
                            {t("landing.pricing.cardEyebrow")}
                        </p>
                        <div className="mt-3 flex items-end gap-1">
                            <span className="text-[48px] leading-none text-[#16171B]" style={serif}>
                                $0
                            </span>
                            <span className="mb-1.5 text-[14px] text-[#5B5D64]">
                                {t("landing.pricing.priceSuffix")}
                            </span>
                        </div>
                        <ul className="mt-7 space-y-3">
                            {["f1", "f2", "f3", "f4"].map((p) => (
                                <li key={p} className="flex items-center gap-3 text-[14px] text-[#2C2E34]">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF2FB] text-[#0A66C2]">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </span>
                                    {t(`landing.pricing.${p}`)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ---------------- FAQ ---------------- */}
            <section id="faq" className="border-t border-[#EAE7E0] bg-white py-20">
                <div className="mx-auto max-w-3xl px-5 sm:px-8">
                    <div className="text-center">
                        <Eyebrow>
                            <span className="mx-auto">{t("landing.faq.eyebrow")}</span>
                        </Eyebrow>
                        <h2
                            className="text-[30px] leading-tight tracking-[-0.01em] text-[#16171B] sm:text-[38px]"
                            style={serif}
                        >
                            {t("landing.faq.title")}
                        </h2>
                    </div>
                    <div className="mt-12 divide-y divide-[#EFECE5] border-y border-[#EFECE5]">
                        {faqs.map((n) => (
                            <details key={n} className="group py-5">
                                <summary
                                    className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] text-[#16171B]"
                                    style={serif}
                                >
                                    {t(`landing.faq.q${n}`)}
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E2DFD7] text-[#0A66C2] transition-transform group-open:rotate-45">
                                        <span className="text-[18px] leading-none">+</span>
                                    </span>
                                </summary>
                                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#5B5D64]">
                                    {t(`landing.faq.a${n}`)}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------------- Final CTA ---------------- */}
            <section className="bg-[#16171B] px-5 py-24 text-center sm:px-8">
                <div className="mx-auto max-w-2xl">
                    <h2
                        className="text-[34px] leading-[1.1] tracking-[-0.01em] text-white sm:text-[48px]"
                        style={serif}
                    >
                        {t("landing.cta.title")}
                    </h2>
                    <p className="mx-auto mt-5 max-w-md text-[17px] text-[#A7A9B0]">{t("landing.cta.subtitle")}</p>
                    <Link
                        href="/signup"
                        className="group mx-auto mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[15px] font-medium text-[#16171B] transition-transform hover:scale-[1.02]"
                    >
                        {t("landing.cta.button")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </section>

            {/* ---------------- Footer ---------------- */}
            <footer className="bg-[#16171B] px-5 pb-14 pt-8 text-white sm:px-8">
                <div className="mx-auto max-w-6xl border-t border-white/10 pt-12">
                    <div className="grid gap-10 md:grid-cols-4">
                        <div>
                            <div className="flex items-baseline gap-[2px] text-[22px]" style={serif}>
                                <SiteLogo
                                    variant="light"
                                    className="h-8 w-auto"
                                    fallback={
                                        <>
                                            Dosory<span className="text-[#4d9bef]">.</span>
                                        </>
                                    }
                                />
                            </div>
                            <p className="mt-3 max-w-[14rem] text-[13px] leading-relaxed text-[#8A8C93]">
                                {t("landing.footer.tagline")}
                            </p>
                        </div>
                        {footerCols.map((col) => (
                            <div key={col.titleKey}>
                                <h3 className="text-[12px] uppercase tracking-[0.14em] text-[#6E7077]" style={mono}>
                                    {t(`landing.footer.${col.titleKey}`)}
                                </h3>
                                <ul className="mt-4 space-y-2.5">
                                    {col.links.map((l) => (
                                        <li key={l}>
                                            <span className="cursor-default text-[14px] text-[#A7A9B0] transition-colors hover:text-white">
                                                {t(`landing.footer.link.${l}`)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
                        <p className="text-[13px] text-[#6E7077]" style={mono}>
                            {t("landing.footer.copyright", { year: new Date().getFullYear() })}
                        </p>
                        <p className="text-[13px] text-[#6E7077]">{t("landing.footer.builtFor")}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
