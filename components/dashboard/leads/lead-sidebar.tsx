"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLead } from "./lead-context";
import {
    User, Users, StickyNote, FileText, Receipt,
    CreditCard, FileSignature, CheckSquare,
    Calculator, Clock, LifeBuoy, Folder, Paperclip,
    Lock, Bell, MapPin, Globe, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LeadSidebar() {
    const pathname = usePathname();
    const { lead, contacts, loading, leadId } = useLead();

    const menuItems = [
        { icon: User, label: "Profile", href: `/dashboard/leads/${leadId}` },
        { icon: Globe, label: "Portal Settings", href: `/dashboard/leads/${leadId}/portal` },
        { icon: Users, label: "Contacts", href: `/dashboard/leads/${leadId}/contacts`, badge: contacts.length || undefined },
        { icon: StickyNote, label: "Notes", href: `/dashboard/leads/${leadId}/notes` },
        { icon: FileText, label: "Statement", href: `/dashboard/leads/${leadId}/statement` },
        { icon: Receipt, label: "Invoices", href: `/dashboard/leads/${leadId}/invoices` },
        { icon: CreditCard, label: "Payments", href: `/dashboard/leads/${leadId}/payments` },
        { icon: FileSignature, label: "Proposals", href: `/dashboard/leads/${leadId}/proposals` },
        { icon: FileText, label: "Credit Notes", href: `/dashboard/leads/${leadId}/credit-notes` },
        { icon: Calculator, label: "Estimates", href: `/dashboard/leads/${leadId}/estimates` },
        { icon: Clock, label: "Subscriptions", href: `/dashboard/leads/${leadId}/subscriptions` },
        { icon: Receipt, label: "Expenses", href: `/dashboard/leads/${leadId}/expenses` },
        { icon: FileSignature, label: "Contracts", href: `/dashboard/leads/${leadId}/contracts` },
        { icon: Folder, label: "Projects", href: `/dashboard/leads/${leadId}/projects` },
        { icon: CheckSquare, label: "Tasks", href: `/dashboard/leads/${leadId}/tasks` },
        { icon: LifeBuoy, label: "Tickets", href: `/dashboard/leads/${leadId}/tickets` },
        { icon: Paperclip, label: "Files", href: `/dashboard/leads/${leadId}/files` },
        { icon: Lock, label: "Vault", href: `/dashboard/leads/${leadId}/vault` },
        { icon: Bell, label: "Reminders", href: `/dashboard/leads/${leadId}/reminders` },
        { icon: MapPin, label: "Map", href: `/dashboard/leads/${leadId}/map` },
    ];

    return (
        <div className="w-64 border-r bg-gray-50/50 min-h-screen py-4 flex flex-col">
            {/* Back Button */}
            <div className="px-4 mb-2">
                <Link href="/dashboard/leads">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Leads
                    </Button>
                </Link>
            </div>

            <div className="px-4 mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {loading ? (
                        <span className="text-gray-400">Loading...</span>
                    ) : (
                        <>
                            {lead?.name || "Unknown Lead"}
                            <span className="text-xs text-gray-400">▼</span>
                        </>
                    )}
                </h2>
                {lead?.company && (
                    <p className="text-sm text-gray-500">{lead.company}</p>
                )}
            </div>

            <nav className="space-y-1 flex-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </div>
                            {item.badge && (
                                <span className="text-xs font-semibold text-gray-500">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
