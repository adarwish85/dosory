"use client";

import { useCustomer } from "./customer-context";
import { DollarSign, Briefcase, Activity, CheckCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function CustomerOverview() {
    const { customer, loading } = useCustomer();

    if (loading || !customer) return <div>Loading...</div>;

    // Mock Data for Widgets (Recommendations)
    const financials = {
        invoiced: 45000,
        paid: 38200,
        due: 6800,
        currency: customer.currency?.toUpperCase() || "USD"
    };

    const projectStats = {
        active: 2,
        completed: 5,
        total: 7
    };

    const healthScore = 85;

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold">Performance Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Financial Health Widget */}
                <div className="p-6 border rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-green-600">
                        <DollarSign className="h-6 w-6" />
                        <h3 className="text-md font-semibold text-gray-900">Financials</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Total Invoiced</span>
                            <span className="font-bold text-gray-900">{financials.currency} {financials.invoiced.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Amount Paid</span>
                            <span className="font-bold text-green-600">{financials.currency} {financials.paid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm text-gray-500">Amount Due</span>
                            <span className="font-bold text-red-600">{financials.currency} {financials.due.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Projects Widget */}
                <div className="p-6 border rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-blue-600">
                        <Briefcase className="h-6 w-6" />
                        <h3 className="text-md font-semibold text-gray-900">Projects</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{projectStats.active}</div>
                                <div className="text-xs text-gray-500 uppercase">Active</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{projectStats.completed}</div>
                                <div className="text-xs text-gray-500 uppercase">Completed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{projectStats.total}</div>
                                <div className="text-xs text-gray-500 uppercase">Total</div>
                            </div>
                        </div>
                        <div className="text-xs text-center text-blue-600 cursor-pointer hover:underline">View All Projects →</div>
                    </div>
                </div>

                {/* Engagement / Health Widget */}
                <div className="p-6 border rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-purple-600">
                        <Activity className="h-6 w-6" />
                        <h3 className="text-md font-semibold text-gray-900">Engagement</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span>Health Score</span>
                            <span className="font-bold text-purple-700">{healthScore}/100</span>
                        </div>
                        <Progress value={healthScore} className="h-2" />
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-600"><CheckCircle className="h-3 w-3 text-green-500" /> Portal Active</div>
                            <div className="flex items-center gap-1 text-gray-600"><Clock className="h-3 w-3 text-yellow-500" /> Last Login: 2d ago</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="border rounded-lg bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="text-sm text-gray-500 italic">No recent activity logged.</div>
            </div>
        </div>
    );
}
