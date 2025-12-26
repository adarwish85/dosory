"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

// Stat Card variants
type StatVariant = "blue" | "green" | "yellow" | "purple" | "orange" | "red" | "gray";

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    variant?: StatVariant;
}

const VARIANT_STYLES: Record<StatVariant, { bg: string; icon: string; label: string; value: string }> = {
    blue: {
        bg: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
        icon: "text-blue-600",
        label: "text-blue-600",
        value: "text-blue-900"
    },
    green: {
        bg: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
        icon: "text-green-600",
        label: "text-green-600",
        value: "text-green-900"
    },
    yellow: {
        bg: "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200",
        icon: "text-yellow-600",
        label: "text-yellow-600",
        value: "text-yellow-900"
    },
    purple: {
        bg: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
        icon: "text-purple-600",
        label: "text-purple-600",
        value: "text-purple-900"
    },
    orange: {
        bg: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
        icon: "text-orange-600",
        label: "text-orange-600",
        value: "text-orange-900"
    },
    red: {
        bg: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
        icon: "text-red-600",
        label: "text-red-600",
        value: "text-red-900"
    },
    gray: {
        bg: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
        icon: "text-gray-600",
        label: "text-gray-600",
        value: "text-gray-900"
    }
};

export function StatCard({ icon: Icon, label, value, variant = "blue" }: StatCardProps) {
    const styles = VARIANT_STYLES[variant];
    return (
        <div className={`${styles.bg} border rounded-lg px-4 py-3`}>
            <div className={`flex items-center gap-2 ${styles.label} mb-1`}>
                <Icon className={`h-4 w-4 ${styles.icon}`} />
                <span className="text-xs font-medium uppercase">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${styles.value}`}>{value}</div>
        </div>
    );
}

interface StatsBarProps {
    children: ReactNode;
    columns?: 2 | 3 | 4;
}

export function StatsBar({ children, columns = 4 }: StatsBarProps) {
    const gridCols = {
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-2 md:grid-cols-4"
    };
    return (
        <div className={`grid ${gridCols[columns]} gap-3`}>
            {children}
        </div>
    );
}
