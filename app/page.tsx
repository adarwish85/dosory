import type { Metadata } from "next";
import { LandingContent } from "@/components/site/landing-content";

export const metadata: Metadata = {
    title: "Dosory — The all-in-one CRM & ERP for modern businesses",
    description:
        "Customers, sales, invoicing, projects, finance, and HR in one clean workspace. Double-entry accounting, role-based access, and true multi-tenant isolation — built in.",
};

// Thin server shell — keeps metadata/SEO server-rendered; the bilingual marketing UI
// lives in the client LandingContent so it can use the t() translation hook.
export default function Home() {
    return <LandingContent />;
}
