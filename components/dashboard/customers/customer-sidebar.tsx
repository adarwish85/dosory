"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCustomer } from "./customer-context";
import {
    User, Users, StickyNote, FileText, Receipt,
    CreditCard, FileSignature, CheckSquare,
    Calculator, LifeBuoy, Folder, Paperclip,
    Lock, Bell, MapPin, Globe, ArrowLeft, ChevronLeft, ChevronRight, LayoutDashboard, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CUSTOMER_SIDEBAR_KEY = "customer_sidebar_collapsed";

export function CustomerSidebar() {
    const pathname = usePathname();
    const { customer, contacts, loading, customerId } = useCustomer();
    const [collapsed, setCollapsed] = useState(true); // Default collapsed

    // Load preference from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(CUSTOMER_SIDEBAR_KEY);
        if (saved !== null) {
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
        { icon: LayoutDashboard, label: "Overview", href: `/dashboard/customers/${customerId}` },
        { icon: User, label: "Profile", href: `/dashboard/customers/${customerId}/profile` },
        { icon: Users, label: "Contacts", href: `/dashboard/customers/${customerId}/contacts`, badge: contacts.length || undefined },
        { icon: StickyNote, label: "Notes", href: `/dashboard/customers/${customerId}/notes` },
        { icon: FileText, label: "Statement", href: `/dashboard/customers/${customerId}/statement` },
        { icon: Receipt, label: "Invoices", href: `/dashboard/customers/${customerId}/invoices` },
        { icon: CreditCard, label: "Payments", href: `/dashboard/customers/${customerId}/payments` },
        { icon: FileText, label: "Credit Notes", href: `/dashboard/customers/${customerId}/credit-notes` },
        { icon: Calculator, label: "Estimates", href: `/dashboard/customers/${customerId}/estimates` },
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
        <TooltipProvider delayDuration={0}>
            <div className={cn(
                "border-r bg-gray-50/50 min-h-screen py-4 flex flex-col transition-all duration-300 relative",
                collapsed ? "w-16" : "w-64"
            )}>
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
                                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 w-full">
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">Back to Customers</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Link href="/dashboard/customers">
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Customers
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
                                    <span className="text-xs font-semibold text-gray-500">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </TooltipProvider>
    );
}
