"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Building2,
    Users,
    CreditCard,
    ToggleLeft,
    LayoutTemplate,
    LifeBuoy,
    ShieldAlert,
    Activity
} from "lucide-react";

const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/sa" },
    { icon: Building2, label: "Tenants", href: "/sa/tenants" },
    { icon: Users, label: "Users", href: "/sa/users" },
    { icon: CreditCard, label: "Billing & Plans", href: "/sa/billing-plans" },
    { icon: ToggleLeft, label: "Modules", href: "/sa/modules" },
    { icon: LayoutTemplate, label: "Website Builder", href: "/sa/website-builder" },
    { icon: LifeBuoy, label: "Support Center", href: "/sa/support" },
    { icon: ShieldAlert, label: "Security & Audit", href: "/sa/security-audit" },
    { icon: Activity, label: "System Health", href: "/sa/system-health" },
];

export function SuperAdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 border-r bg-muted/10 h-screen flex flex-col">
            <div className="p-6 border-b">
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    Super Admin
                </h1>
                <p className="text-xs text-muted-foreground">Platform Control Plane</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {sidebarItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            pathname === item.href
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t">
                <div className="text-xs text-center text-muted-foreground">
                    Dosory Platform v1.0
                </div>
            </div>
        </div>
    );
}
