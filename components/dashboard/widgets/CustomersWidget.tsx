"use client";

import { useCustomers } from "@/lib/hooks/use-customers";
import { Users, TrendingUp, UserPlus } from "lucide-react";
import Link from "next/link";
import { WidgetSkeleton } from "./WidgetSkeleton";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface CustomersWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

export function CustomersWidget({ settings, density }: CustomersWidgetProps) {
    const { customers, loading } = useCustomers();
    const limit = settings.limit || 5;

    const recentCustomers = [...customers]
        .sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0);
            const bDate = b.createdAt?.toDate?.() || new Date(0);
            return bDate.getTime() - aDate.getTime();
        })
        .slice(0, limit);

    const activeCount = customers.filter(c => c.status === "active").length;

    if (loading) {
        return <WidgetSkeleton variant="list" />;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Users className="h-4 w-4" />
                    </div>
                    <div className="text-xl font-bold text-blue-900">{customers.length}</div>
                    <div className="text-xs text-blue-600">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                        <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="text-xl font-bold text-green-900">{activeCount}</div>
                    <div className="text-xs text-green-600">Active</div>
                </div>
            </div>

            {/* Recent Customers List */}
            <div className="flex-1 space-y-2 overflow-auto">
                <div className="text-xs font-medium text-gray-500 uppercase mb-2">Recent Customers</div>
                {recentCustomers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No customers yet
                    </div>
                ) : (
                    recentCustomers.map((customer) => (
                        <Link
                            key={customer.id}
                            href={`/dashboard/customers/${customer.id}`}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {customer.company?.charAt(0) || "?"}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium truncate group-hover:text-blue-600">
                                        {customer.company || "-"}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">{customer.phone || "-"}</div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Add Customer Link */}
            <Link
                href="/dashboard/customers/new"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline mt-2"
            >
                <UserPlus className="h-4 w-4" />
                Add Customer
            </Link>
        </div>
    );
}
