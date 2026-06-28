"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCustomer } from "./customer-context";
import {
    User,
    Users,
    StickyNote,
    FileText,
    Receipt,
    CreditCard,
    FileSignature,
    CheckSquare,
    Calculator,
    LifeBuoy,
    Folder,
    Paperclip,
    Lock,
    Bell,
    MapPin,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n";

const CUSTOMER_SIDEBAR_KEY = "customer_sidebar_collapsed";

export function CustomerSidebar() {
    const { t } = useTranslation();
    const pathname = usePathname();
    const { customerId, recordCounts } = useCustomer();
    const [collapsed, setCollapsed] = useState(true); // Default collapsed

    // Load preference from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(CUSTOMER_SIDEBAR_KEY);
        if (saved !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCollapsed(saved === "true");
        }
    }, []);

    // Save preference to localStorage when changed
    const handleToggleCollapse = () => {
        const newValue = !collapsed;
        setCollapsed(newValue);
        localStorage.setItem(CUSTOMER_SIDEBAR_KEY, String(newValue));
    };

    const menuItems = [
        { icon: LayoutDashboard, label: t("customers.sidebar.overview"), href: `/dashboard/customers/${customerId}` },
        { icon: User, label: t("customers.sidebar.profile"), href: `/dashboard/customers/${customerId}/profile` },
        {
            icon: Users,
            label: t("customers.sidebar.contacts"),
            href: `/dashboard/customers/${customerId}/contacts`,
            badge: recordCounts.contacts || undefined,
        },
        {
            icon: Phone,
            label: t("customers.sidebar.activities"),
            href: `/dashboard/customers/${customerId}/activities`,
            badge: recordCounts.activities || undefined,
        },
        {
            icon: Calculator,
            label: t("customers.sidebar.estimates"),
            href: `/dashboard/customers/${customerId}/estimates`,
            badge: recordCounts.estimates || undefined,
        },
        {
            icon: Receipt,
            label: t("customers.sidebar.invoices"),
            href: `/dashboard/customers/${customerId}/invoices`,
            badge: recordCounts.invoices || undefined,
        },
        {
            icon: CreditCard,
            label: t("customers.sidebar.payments"),
            href: `/dashboard/customers/${customerId}/payments`,
            badge: recordCounts.payments || undefined,
        },
        {
            icon: FileText,
            label: t("customers.sidebar.creditNotes"),
            href: `/dashboard/customers/${customerId}/credit-notes`,
            badge: recordCounts.creditNotes || undefined,
        },
        {
            icon: Receipt,
            label: t("customers.sidebar.expenses"),
            href: `/dashboard/customers/${customerId}/expenses`,
            badge: recordCounts.expenses || undefined,
        },
        { icon: FileText, label: t("customers.sidebar.statement"), href: `/dashboard/customers/${customerId}/statement` },
        {
            icon: FileSignature,
            label: t("customers.sidebar.contracts"),
            href: `/dashboard/customers/${customerId}/contracts`,
            badge: recordCounts.contracts || undefined,
        },
        {
            icon: Folder,
            label: t("customers.sidebar.projects"),
            href: `/dashboard/customers/${customerId}/projects`,
            badge: recordCounts.projects || undefined,
        },
        {
            icon: CheckSquare,
            label: t("customers.sidebar.tasks"),
            href: `/dashboard/customers/${customerId}/tasks`,
            badge: recordCounts.tasks || undefined,
        },
        {
            icon: LifeBuoy,
            label: t("customers.sidebar.tickets"),
            href: `/dashboard/customers/${customerId}/tickets`,
            badge: recordCounts.tickets || undefined,
        },
        {
            icon: Paperclip,
            label: t("customers.sidebar.files"),
            href: `/dashboard/customers/${customerId}/files`,
            badge: recordCounts.files || undefined,
        },
        {
            icon: Bell,
            label: t("customers.sidebar.reminders"),
            href: `/dashboard/customers/${customerId}/reminders`,
            badge: recordCounts.reminders || undefined,
        },
        {
            icon: StickyNote,
            label: t("customers.sidebar.notes"),
            href: `/dashboard/customers/${customerId}/notes`,
            badge: recordCounts.notes || undefined,
        },
        { icon: Lock, label: t("customers.sidebar.vault"), href: `/dashboard/customers/${customerId}/vault` },
    ];

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "border-r bg-gray-50/50 min-h-screen py-4 flex flex-col transition-all duration-300 relative",
                    collapsed ? "w-16" : "w-[200px]"
                )}
            >
                {/* Edge Toggle Button - Fixed Position */}
                <button
                    onClick={handleToggleCollapse}
                    className="absolute -right-3 top-16 z-10 h-6 w-6 bg-white border border-gray-200 rounded-md shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    {collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                        <ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
                    )}
                </button>

                {/* Back Button */}
                <div className={cn("mb-2", collapsed ? "px-2" : "px-4")}>
                    {collapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/dashboard/customers">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-500 hover:text-gray-700 w-full"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">{t("customers.sidebar.backToCustomers")}</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Link href="/dashboard/customers">
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t("customers.sidebar.backToCustomers")}
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Customer Name Removed (Moved to Header) */}

                {/* Navigation */}
                <nav className="space-y-1 flex-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;

                        if (collapsed) {
                            return (
                                <Tooltip key={item.label}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center justify-center py-3 transition-colors relative",
                                                isActive
                                                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent"
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            {item.badge && (
                                                <span className="absolute top-1 right-1 text-[10px] bg-blue-500 text-white rounded-full h-4 w-4 flex items-center justify-center">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">{item.label}</TooltipContent>
                                </Tooltip>
                            );
                        }

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
                                    <span className="text-xs font-semibold text-gray-500">{item.badge}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </TooltipProvider>
    );
}
