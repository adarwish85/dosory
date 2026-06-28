import type { Metadata } from "next";
import Link from "next/link";
import { SiteLogo } from "@/components/site/site-logo";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    Users,
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

export const metadata: Metadata = {
    title: "Dosory — The all-in-one CRM & ERP for modern businesses",
    description:
        "Customers, sales, invoicing, projects, finance, and HR in one clean workspace. Double-entry accounting, role-based access, and true multi-tenant isolation — built in.",
};

// Reveal + float keyframes (CSS-only, server-rendered — no client JS)
const css = `
@keyframes riseIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.rise { opacity: 0; animation: riseIn .9s cubic-bezier(.16,.84,.34,1) forwards; }
@media (prefers-reduced-motion: reduce) { .rise { animation: none; opacity: 1; } .floaty { animation: none !important; } }
`;

// --- Browser/app chrome frame — makes screenshots read as the real product ---
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

// --- Content data ------------------------------------------------------------
const features = [
    {
        eyebrow: "Sales & pipeline",
        title: "Turn leads into customers without losing the thread",
        body: "A pipeline that actually reflects how deals move — capture, qualify, and convert with ownership, activity history, and one-click handoff to a customer record.",
        points: ["Drag-through pipeline stages", "Lead scoring & assignment", "Convert to customer in one click"],
        shot: { label: "LEADS PIPELINE", src: "/screenshots/leads.png" as string | undefined },
        icon: Target,
    },
    {
        eyebrow: "Get paid",
        title: "Invoices, estimates, and payments that reconcile themselves",
        body: "Send a branded estimate, convert it to an invoice, take the payment, and watch it post to your books automatically. No spreadsheets, no double entry by hand.",
        points: ["Estimate → invoice → payment", "PayPal & per-tenant gateways", "Auto-posts to the ledger"],
        shot: { label: "INVOICE", src: "/screenshots/invoices.png" as string | undefined },
        icon: Receipt,
    },
    {
        eyebrow: "Delivery",
        title: "Projects and tasks that keep the work honest",
        body: "Plan with milestones, run with task boards, log time against the project, and keep every file and discussion in one place the whole team can see.",
        points: ["Milestones, tasks & timesheets", "Project files & discussions", "Per-member roles"],
        shot: { label: "PROJECTS BOARD", src: "/screenshots/projects.png" as string | undefined },
        icon: FolderKanban,
    },
    {
        eyebrow: "The books",
        title: "Real double-entry accounting, not a money toy",
        body: "A proper chart of accounts with journals, payments, expenses, and credit notes — so the financial picture is one you can actually trust at close.",
        points: ["Double-entry journals", "Chart of accounts & taxes", "Expenses & credit notes"],
        shot: { label: "FINANCE / LEDGER", src: "/screenshots/finance.png" as string | undefined },
        icon: Landmark,
    },
    {
        eyebrow: "Your people",
        title: "HR that lives next to the work, not in another tab",
        body: "Employees, attendance, leave, payroll, performance, and documents — in the same workspace as the customers and projects they serve.",
        points: ["Attendance & leave", "Payroll & performance", "Secure document vault"],
        shot: { label: "HR / EMPLOYEES", src: "/screenshots/hr.png" as string | undefined },
        icon: UserCog,
    },
];

const modules = [
    { icon: Building2, name: "Customers" },
    { icon: Target, name: "Leads" },
    { icon: FileText, name: "Invoices" },
    { icon: Receipt, name: "Estimates" },
    { icon: FolderKanban, name: "Projects" },
    { icon: SquareCheck, name: "Tasks" },
    { icon: Headphones, name: "Support" },
    { icon: FileSignature, name: "Contracts" },
    { icon: BookOpen, name: "Knowledge Base" },
    { icon: UserCog, name: "HR" },
    { icon: Landmark, name: "Finance" },
    { icon: BarChart3, name: "Reports" },
];

const stats = [
    { figure: "12+", label: "modules, one workspace" },
    { figure: "1", label: "shared source of truth" },
    { figure: "∞", label: "tenants, fully isolated" },
    { figure: "RBAC", label: "role-based by default" },
];

const faqs = [
    {
        q: "Is this really one platform, or a bundle of tools?",
        a: "One platform. Customers, leads, invoicing, projects, finance, and HR share the same data model and the same workspace — a customer record links to its invoices, projects, and tickets without any integration to set up.",
    },
    {
        q: "How is my data kept separate from other companies?",
        a: "Every record is scoped to your organization and enforced at the database layer — not just hidden in the UI. Your workspace is isolated by design, with role-based access controlling who on your team sees what.",
    },
    {
        q: "Can I start without talking to sales?",
        a: "Yes. Create your workspace, invite your team, and start working on a free trial. No credit card required to begin.",
    },
    {
        q: "Does the accounting actually balance?",
        a: "It's real double-entry: a chart of accounts, journals, payments, and credit notes. Invoices and expenses post to the ledger automatically, so close is something you can trust.",
    },
];

export default function Home() {
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
                            Product
                        </a>
                        <a href="#modules" className="transition-colors hover:text-[#16171B]">
                            Modules
                        </a>
                        <a href="#pricing" className="transition-colors hover:text-[#16171B]">
                            Pricing
                        </a>
                        <a href="#faq" className="transition-colors hover:text-[#16171B]">
                            FAQ
                        </a>
                    </nav>
                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/login"
                            className="rounded-lg px-3.5 py-2 text-[14px] text-[#16171B] transition-colors hover:bg-[#F0EDE6]"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/signup"
                            className="group flex items-center gap-1.5 rounded-lg bg-[#16171B] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#0A66C2]"
                        >
                            Start free
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ---------------- Hero ---------------- */}
            <section id="product" className="relative overflow-hidden">
                {/* subtle dotted texture */}
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
                        CRM + ERP · ONE PLATFORM
                    </p>
                    <h1
                        className="rise mx-auto max-w-3xl text-[42px] leading-[1.04] tracking-[-0.02em] text-[#16171B] sm:text-[64px]"
                        style={{ ...serif, animationDelay: "80ms" }}
                    >
                        Run the whole business
                        <br className="hidden sm:block" /> from one{" "}
                        <span className="relative whitespace-nowrap text-[#0A66C2]">
                            clean
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
                        place
                    </h1>
                    <p
                        className="rise mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-[#5B5D64] sm:text-[19px]"
                        style={{ animationDelay: "160ms" }}
                    >
                        Customers, sales, invoicing, projects, finance, and HR — sharing one source of truth. No
                        tab-hopping, no integrations to glue together, no spreadsheets to reconcile.
                    </p>
                    <div
                        className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
                        style={{ animationDelay: "240ms" }}
                    >
                        <Link
                            href="/signup"
                            className="group flex items-center gap-2 rounded-xl bg-[#0A66C2] px-6 py-3.5 text-[15px] font-medium text-white shadow-[0_12px_24px_-12px_rgba(10,102,194,0.7)] transition-all hover:bg-[#0a5bad]"
                        >
                            Start free — no card
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="/login"
                            className="flex items-center gap-2 rounded-xl border border-[#E2DFD7] bg-white px-6 py-3.5 text-[15px] font-medium text-[#16171B] transition-colors hover:bg-[#F7F5F1]"
                        >
                            See it live
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {/* Hero product shot with layered depth */}
                    <div className="rise relative mx-auto mt-16 max-w-5xl" style={{ animationDelay: "340ms" }}>
                        <BrowserFrame url="acme.dosory.com/dashboard">
                            <Shot label="DASHBOARD" src="/screenshots/dashboard.png" ratio="aspect-[16/9]" />
                        </BrowserFrame>
                        {/* floating secondary card (e.g. an invoice / today widget) */}
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
                        <div key={s.label} className="px-4 py-8 text-center md:py-10">
                            <div className="text-[34px] leading-none text-[#16171B] sm:text-[40px]" style={serif}>
                                {s.figure}
                            </div>
                            <div className="mt-2 text-[13px] text-[#5B5D64]">{s.label}</div>
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
                            key={f.title}
                            className="grid items-center gap-10 border-b border-[#EAE7E0] py-20 md:grid-cols-2 md:gap-16"
                        >
                            <div className={flip ? "md:order-2" : ""}>
                                <Eyebrow>{f.eyebrow}</Eyebrow>
                                <h2
                                    className="max-w-md text-[28px] leading-[1.12] tracking-[-0.01em] text-[#16171B] sm:text-[36px]"
                                    style={serif}
                                >
                                    {f.title}
                                </h2>
                                <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#5B5D64]">{f.body}</p>
                                <ul className="mt-7 space-y-3">
                                    {f.points.map((p) => (
                                        <li key={p} className="flex items-center gap-3 text-[15px] text-[#2C2E34]">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF2FB] text-[#0A66C2]">
                                                <Check className="h-3 w-3" strokeWidth={3} />
                                            </span>
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={flip ? "md:order-1" : ""}>
                                <div className="relative">
                                    <div className="absolute -inset-3 -z-10 rounded-2xl bg-[#EAF2FB]/60" />
                                    <BrowserFrame url={`acme.dosory.com/${f.eyebrow.toLowerCase().split(" ")[0]}`}>
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
                        <span className="mx-auto">Everything, in one workspace</span>
                    </Eyebrow>
                    <h2
                        className="mx-auto max-w-2xl text-[30px] leading-tight tracking-[-0.01em] text-[#16171B] sm:text-[40px]"
                        style={serif}
                    >
                        One login. Every part of the business.
                    </h2>
                    <p className="mx-auto mt-5 max-w-lg text-[16px] text-[#5B5D64]">
                        Each module shares the same customers, the same people, and the same numbers — so nothing falls
                        between the cracks.
                    </p>
                    <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {modules.map((m) => {
                            const Icon = m.icon;
                            return (
                                <div
                                    key={m.name}
                                    className="group flex items-center gap-3 rounded-xl border border-[#EAE7E0] bg-[#FBFAF7] px-4 py-4 text-left transition-all hover:border-[#CFE0F4] hover:bg-white hover:shadow-[0_14px_28px_-20px_rgba(10,102,194,0.5)]"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0A66C2] shadow-sm ring-1 ring-[#EAE7E0] transition-colors group-hover:bg-[#0A66C2] group-hover:text-white">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="text-[15px] font-medium text-[#16171B]">{m.name}</span>
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
                        <Eyebrow>Pricing</Eyebrow>
                        <h2
                            className="max-w-md text-[30px] leading-tight tracking-[-0.01em] text-[#16171B] sm:text-[40px]"
                            style={serif}
                        >
                            Start free. Grow into it.
                        </h2>
                        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#5B5D64]">
                            Spin up your workspace today on a free trial — every module included. Add seats and upgrade
                            your plan when the business does, not before.
                        </p>
                        <Link
                            href="/signup"
                            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0A66C2] px-6 py-3.5 text-[15px] font-medium text-white shadow-[0_12px_24px_-12px_rgba(10,102,194,0.7)] transition-all hover:bg-[#0a5bad]"
                        >
                            Create your workspace
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                    <div className="rounded-2xl border border-[#E2DFD7] bg-white p-8 shadow-[0_30px_60px_-40px_rgba(20,23,30,0.3)]">
                        <p className="text-[13px] uppercase tracking-[0.16em] text-[#0A66C2]" style={mono}>
                            Free trial
                        </p>
                        <div className="mt-3 flex items-end gap-1">
                            <span className="text-[48px] leading-none text-[#16171B]" style={serif}>
                                $0
                            </span>
                            <span className="mb-1.5 text-[14px] text-[#5B5D64]">to start</span>
                        </div>
                        <ul className="mt-7 space-y-3">
                            {[
                                "All 12+ modules unlocked",
                                "Invite your whole team",
                                "No credit card required",
                                "Your data, isolated & exportable",
                            ].map((p) => (
                                <li key={p} className="flex items-center gap-3 text-[14px] text-[#2C2E34]">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF2FB] text-[#0A66C2]">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </span>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ---------------- FAQ (native details, no JS) ---------------- */}
            <section id="faq" className="border-t border-[#EAE7E0] bg-white py-20">
                <div className="mx-auto max-w-3xl px-5 sm:px-8">
                    <div className="text-center">
                        <Eyebrow>
                            <span className="mx-auto">Questions</span>
                        </Eyebrow>
                        <h2
                            className="text-[30px] leading-tight tracking-[-0.01em] text-[#16171B] sm:text-[38px]"
                            style={serif}
                        >
                            The short answers
                        </h2>
                    </div>
                    <div className="mt-12 divide-y divide-[#EFECE5] border-y border-[#EFECE5]">
                        {faqs.map((f) => (
                            <details key={f.q} className="group py-5">
                                <summary
                                    className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] text-[#16171B]"
                                    style={serif}
                                >
                                    {f.q}
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E2DFD7] text-[#0A66C2] transition-transform group-open:rotate-45">
                                        <span className="text-[18px] leading-none">+</span>
                                    </span>
                                </summary>
                                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#5B5D64]">{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------------- Final CTA (dark band for contrast) ---------------- */}
            <section className="bg-[#16171B] px-5 py-24 text-center sm:px-8">
                <div className="mx-auto max-w-2xl">
                    <h2
                        className="text-[34px] leading-[1.1] tracking-[-0.01em] text-white sm:text-[48px]"
                        style={serif}
                    >
                        Your business, finally in one place.
                    </h2>
                    <p className="mx-auto mt-5 max-w-md text-[17px] text-[#A7A9B0]">
                        Set up your workspace in minutes. Bring your team. Keep everything — and everyone — in sync.
                    </p>
                    <Link
                        href="/signup"
                        className="group mx-auto mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[15px] font-medium text-[#16171B] transition-transform hover:scale-[1.02]"
                    >
                        Start free
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
                                The all-in-one CRM &amp; ERP platform for modern businesses.
                            </p>
                        </div>
                        {[
                            { title: "Product", links: ["Features", "Modules", "Pricing", "Sign in"] },
                            { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
                            { title: "Legal", links: ["Privacy", "Terms", "Security", "Status"] },
                        ].map((col) => (
                            <div key={col.title}>
                                <h3 className="text-[12px] uppercase tracking-[0.14em] text-[#6E7077]" style={mono}>
                                    {col.title}
                                </h3>
                                <ul className="mt-4 space-y-2.5">
                                    {col.links.map((l) => (
                                        <li key={l}>
                                            <span className="cursor-default text-[14px] text-[#A7A9B0] transition-colors hover:text-white">
                                                {l}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
                        <p className="text-[13px] text-[#6E7077]" style={mono}>
                            © {new Date().getFullYear()} Dosory — all rights reserved.
                        </p>
                        <p className="text-[13px] text-[#6E7077]">Built for businesses that hate tab-hopping.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
