"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SECTIONS = [
    { label: "Departments", href: "/dashboard/setup/support/departments" },
    { label: "Predefined Replies", href: "/dashboard/setup/support/predefined-replies" },
    { label: "Services", href: "/dashboard/setup/support/services" },
    { label: "Spam Filters", href: "/dashboard/setup/support/spam-filters" },
    { label: "Ticket Priority", href: "/dashboard/setup/support/ticket-priority" },
    { label: "Ticket Statuses", href: "/dashboard/setup/support/ticket-statuses" },
];

export default function SetupSupportPage() {
    return (
        <div className="p-6">
            <PageHeader title="Support Setup" />
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
