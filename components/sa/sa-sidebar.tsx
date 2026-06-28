"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
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
    { icon: LayoutDashboard, labelKey: "sa.sidebar.overview", href: "/sa" },
    { icon: Building2, labelKey: "sa.sidebar.tenants", href: "/sa/tenants" },
    { icon: Users, labelKey: "sa.sidebar.users", href: "/sa/users" },
    { icon: CreditCard, labelKey: "sa.sidebar.billingPlans", href: "/sa/billing-plans" },
    { icon: ToggleLeft, labelKey: "sa.sidebar.modules", href: "/sa/modules" },
    { icon: LayoutTemplate, labelKey: "sa.sidebar.websiteBuilder", href: "/sa/website-builder" },
    { icon: LifeBuoy, labelKey: "sa.sidebar.supportCenter", href: "/sa/support" },
    { icon: ShieldAlert, labelKey: "sa.sidebar.securityAudit", href: "/sa/security-audit" },
    { icon: Activity, labelKey: "sa.sidebar.systemHealth", href: "/sa/system-health" },
];

export function SuperAdminSidebar() {
    const { t } = useTranslation();
    const pathname = usePathname();

    return (
        <div className="w-64 border-r bg-muted/10 h-screen flex flex-col">
            <div className="p-6 border-b">
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    {t("sa.sidebar.brandTitle")}
                </h1>
                <p className="text-xs text-muted-foreground">{t("sa.sidebar.brandSubtitle")}</p>
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
                        {t(item.labelKey)}
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t">
                <div className="text-xs text-center text-muted-foreground">
                    {t("sa.sidebar.version")}
                </div>
            </div>
        </div>
    );
}
