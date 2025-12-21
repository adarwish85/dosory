import { Invoice, InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InvoiceStatsProps {
    invoices: Invoice[];
    activeFilter: InvoiceStatus | "all";
    onFilterChange: (status: InvoiceStatus | "all") => void;
}

export function InvoiceStats({ invoices, activeFilter, onFilterChange }: InvoiceStatsProps) {
    const total = invoices.length;

    const getStats = (statuses: InvoiceStatus[], label: string, colorClass: string, filterValue: InvoiceStatus | "all") => {
        const count = invoices.filter(inv => statuses.includes(inv.status)).length;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        return {
            label,
            count,
            percentage: percentage.toFixed(2),
            colorClass,
            filterValue
        };
    };

    const stats = [
        getStats([], "All Invoices", "text-gray-900", "all"), // Special case for Total/All
        getStats(["sent", "viewed"], "Unpaid", "text-red-500", "sent"), // Simplified mapping for now
        getStats(["paid"], "Paid", "text-green-600", "paid"),
        getStats(["partial"], "Partially Paid", "text-yellow-600", "partial"),
        getStats(["overdue"], "Overdue", "text-orange-500", "overdue"),
        getStats(["draft"], "Draft", "text-gray-500", "draft"),
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat, index) => {
                // Special rendering for 'All'
                if (stat.filterValue === 'all') {
                    return (
                        <div
                            key={index}
                            onClick={() => onFilterChange("all")}
                            className={cn(
                                "bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-all",
                                activeFilter === "all" ? "border-gray-900 ring-1 ring-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                            )}
                        >
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="font-semibold text-sm text-gray-900">Total</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                                {total}
                            </div>
                        </div>
                    );
                }

                return (
                    <div
                        key={index}
                        onClick={() => onFilterChange(stat.filterValue)}
                        className={cn(
                            "bg-white border rounded-lg p-4 shadow-sm cursor-pointer transition-all",
                            activeFilter === stat.filterValue ? "border-gray-900 ring-1 ring-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                        )}
                    >
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className={cn("font-semibold text-sm", stat.colorClass)}>{stat.label}</span>
                            <span className="text-xs text-gray-400">({stat.percentage}%)</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                            {stat.count} <span className="text-gray-400 text-sm font-normal">/ {total}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
