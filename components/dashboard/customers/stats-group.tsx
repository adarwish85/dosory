import { LucideIcon, FileText, Send, Clock, XCircle, CheckCircle } from "lucide-react";

interface StatItem {
    label: string;
    amount: string;
    color?: "default" | "orange" | "green" | "red" | "blue" | "purple" | "gray";
    icon?: LucideIcon;
}

interface StatsGroupProps {
    items: StatItem[];
}

// Default icons for common labels
const DEFAULT_ICONS: Record<string, LucideIcon> = {
    draft: FileText,
    sent: Send,
    expired: Clock,
    declined: XCircle,
    accepted: CheckCircle,
};

export function StatsGroup({ items }: StatsGroupProps) {
    const getStyles = (color?: string) => {
        switch (color) {
            case "orange":
                return {
                    bg: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
                    icon: "text-orange-600",
                    label: "text-orange-600",
                    value: "text-orange-900",
                };
            case "green":
                return {
                    bg: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
                    icon: "text-green-600",
                    label: "text-green-600",
                    value: "text-green-900",
                };
            case "red":
                return {
                    bg: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
                    icon: "text-red-600",
                    label: "text-red-600",
                    value: "text-red-900",
                };
            case "blue":
                return {
                    bg: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
                    icon: "text-blue-600",
                    label: "text-blue-600",
                    value: "text-blue-900",
                };
            case "purple":
                return {
                    bg: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
                    icon: "text-purple-600",
                    label: "text-purple-600",
                    value: "text-purple-900",
                };
            case "gray":
                return {
                    bg: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
                    icon: "text-gray-600",
                    label: "text-gray-600",
                    value: "text-gray-900",
                };
            default:
                return {
                    bg: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
                    icon: "text-gray-600",
                    label: "text-gray-600",
                    value: "text-gray-900",
                };
        }
    };

    const gridCols =
        {
            1: "md:grid-cols-1",
            2: "md:grid-cols-2",
            3: "md:grid-cols-3",
            4: "md:grid-cols-4",
            5: "md:grid-cols-5",
            6: "md:grid-cols-6",
        }[items.length] || "md:grid-cols-5";

    return (
        <div className={`grid gap-3 grid-cols-2 ${gridCols}`}>
            {items.map((item, index) => {
                const styles = getStyles(item.color);
                const Icon = item.icon || DEFAULT_ICONS[item.label.toLowerCase()] || FileText;
                return (
                    <div key={index} className={`${styles.bg} border rounded-lg px-4 py-3`}>
                        <div className={`flex items-center gap-2 ${styles.label} mb-1`}>
                            <Icon className={`h-4 w-4 ${styles.icon}`} />
                            <span className="text-xs font-medium uppercase">{item.label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${styles.value}`}>{item.amount}</p>
                    </div>
                );
            })}
        </div>
    );
}
