"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Users, FolderKanban, Receipt, Mail, CalendarPlus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface QuickActionsWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

const QUICK_ACTIONS = [
    { labelKey: "dashboard.quickActions.newInvoice", href: "/dashboard/invoices/new", icon: FileText, color: "bg-blue-500 hover:bg-blue-600" },
    { labelKey: "dashboard.quickActions.addCustomer", href: "/dashboard/customers/new", icon: Users, color: "bg-green-500 hover:bg-green-600" },
    {
        labelKey: "dashboard.quickActions.newProject",
        href: "/dashboard/projects/new",
        icon: FolderKanban,
        color: "bg-purple-500 hover:bg-purple-600",
    },
    {
        labelKey: "dashboard.quickActions.recordExpense",
        href: "/dashboard/expenses/new",
        icon: Receipt,
        color: "bg-amber-500 hover:bg-amber-600",
    },
];

export function QuickActionsWidget({ settings, density }: QuickActionsWidgetProps) {
    const { t } = useTranslation();
    return (
        <div className="h-full flex flex-col gap-2">
            {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                    <Link key={action.href} href={action.href} className="flex-1">
                        <Button
                            className={`w-full h-full ${action.color} text-white flex items-center justify-center gap-2`}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{t(action.labelKey)}</span>
                        </Button>
                    </Link>
                );
            })}
        </div>
    );
}
