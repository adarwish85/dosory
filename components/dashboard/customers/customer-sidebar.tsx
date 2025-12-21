"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCustomer } from "./customer-context";
import {
    User, Users, StickyNote, FileText, Receipt,
    CreditCard, FileSignature, CheckSquare,
    Calculator, Clock, LifeBuoy, Folder, Paperclip,
    Lock, Bell, MapPin, Globe
} from "lucide-react";

export function CustomerSidebar() {
    const pathname = usePathname();
    const { customer, contacts, loading, customerId } = useCustomer();

    const menuItems = [
        { icon: User, label: "Profile", href: `/dashboard/customers/${customerId}` },
        { icon: Globe, label: "Portal Settings", href: `/dashboard/customers/${customerId}/portal` },
        { icon: Users, label: "Contacts", href: `/dashboard/customers/${customerId}/contacts`, badge: contacts.length || undefined },
        { icon: StickyNote, label: "Notes", href: `/dashboard/customers/${customerId}/notes` },
        { icon: FileText, label: "Statement", href: `/dashboard/customers/${customerId}/statement` },
        { icon: Receipt, label: "Invoices", href: `/dashboard/customers/${customerId}/invoices` },
        { icon: CreditCard, label: "Payments", href: `/dashboard/customers/${customerId}/payments` },
        { icon: FileSignature, label: "Proposals", href: `/dashboard/customers/${customerId}/proposals` },
        { icon: FileText, label: "Credit Notes", href: `/dashboard/customers/${customerId}/credit-notes` },
        { icon: Calculator, label: "Estimates", href: `/dashboard/customers/${customerId}/estimates` },
        { icon: Clock, label: "Subscriptions", href: `/dashboard/customers/${customerId}/subscriptions` },
        { icon: Receipt, label: "Expenses", href: `/dashboard/customers/${customerId}/expenses` },
        { icon: FileSignature, label: "Contracts", href: `/dashboard/customers/${customerId}/contracts` },
        { icon: Folder, label: "Projects", href: `/dashboard/customers/${customerId}/projects` },
        { icon: CheckSquare, label: "Tasks", href: `/dashboard/customers/${customerId}/tasks` },
        { icon: LifeBuoy, label: "Tickets", href: `/dashboard/customers/${customerId}/tickets` },
        { icon: Paperclip, label: "Files", href: `/dashboard/customers/${customerId}/files` },
        { icon: Lock, label: "Vault", href: `/dashboard/customers/${customerId}/vault` },
        { icon: Bell, label: "Reminders", href: `/dashboard/customers/${customerId}/reminders` },
        { icon: MapPin, label: "Map", href: `/dashboard/customers/${customerId}/map` },
    ];

    return (
        <div className="w-64 border-r bg-gray-50/50 min-h-screen py-4">
            <div className="px-4 mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {loading ? (
                        <span className="text-gray-400">Loading...</span>
                    ) : (
                        <>
                            {customer?.company || "Unknown Customer"}
                            <span className="text-xs text-gray-400">▼</span>
                        </>
                    )}
                </h2>
            </div>

            <nav className="space-y-1">
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
