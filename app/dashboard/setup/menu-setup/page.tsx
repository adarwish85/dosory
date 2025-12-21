"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SECTIONS = [
    { label: "Main Menu", href: "/dashboard/setup/menu-setup/main-menu" },
    { label: "Setup Menu", href: "/dashboard/setup/menu-setup/setup-menu" },
];

export default function SetupMenuSetupPage() {
    return (
        <div className="p-6">
            <PageHeader title="Menu Setup" />
            <div className="grid gap-4 mt-6">
                {SECTIONS.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <span className="font-medium text-gray-900">{section.label}</span>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
