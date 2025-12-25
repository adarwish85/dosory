"use client";

import { useCustomer } from "./customer-context";
import { DollarSign, Briefcase, Activity, CheckCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useInvoices, useProjects } from "@/lib/hooks";
import { format } from "date-fns";

export function CustomerOverview() {
    const { customer, contacts, loading: customerLoading } = useCustomer();

    // Fetch Financials
    const { invoiceStats, loading: invoicesLoading } = useInvoices({
        customerId: customer?.id,
        status: "all"
    });

    // Fetch Projects
    const { projects, loading: projectsLoading } = useProjects({
        customerId: customer?.id
    });

    const loading = customerLoading || invoicesLoading || projectsLoading;

    if (loading || !customer) return <div className="p-8">Loading overview...</div>;

    // Financial Data
    const financials = {
        invoiced: invoiceStats.totalAmount || 0,
        paid: invoiceStats.totalPaid || 0,
        due: invoiceStats.totalDue || 0,
        currency: customer.currency?.toUpperCase() || "USD"
    };

    // Project Data
    const projectStats = {
        active: projects.filter(p => p.status === 'active' || p.status === 'in_progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        total: projects.length
    };

    // Engagement / Health Calculation
    let healthScore = 0;

    // 1. Contact Info (+20)
    if (customer.email || customer.phone) healthScore += 10;
    if (customer.address?.street) healthScore += 10;

    // 2. Portal Access (+20)
    const hasPortalAccess = contacts.some(c => c.portalAccess?.enabled);
    if (hasPortalAccess) healthScore += 20;

    // 3. Financial Activity (+30)
    if (financials.invoiced > 0) healthScore += 10;
    if (financials.paid > 0) healthScore += 20;

    // 4. Project Activity (+30)
    if (projectStats.total > 0) healthScore += 10;
    if (projectStats.active > 0) healthScore += 20;

    healthScore = Math.min(healthScore, 100);

    // Last Login Logic
    let lastLoginDate: Date | null = null;
    contacts.forEach(c => {
        if (c.portalAccess?.lastLogin) {
            const loginDate = c.portalAccess.lastLogin.toDate();
            if (!lastLoginDate || loginDate > lastLoginDate) {
                lastLoginDate = loginDate;
            }
        }
    });

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
                        {projectStats.total > 0 && (
                            <div className="text-xs text-center text-blue-600 cursor-pointer hover:underline" onClick={() => window.location.href = `/dashboard/customers/${customer.id}/projects`}>
                                View All Projects →
                            </div>
                        )}
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
                            <span className={`font-bold ${healthScore >= 70 ? 'text-green-600' : healthScore >= 40 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                {healthScore}/100
                            </span>
                        </div>
                        <Progress value={healthScore} className="h-2" />
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-600">
                                <CheckCircle className={`h-3 w-3 ${hasPortalAccess ? "text-green-500" : "text-gray-300"}`} />
                                {hasPortalAccess ? "Portal Active" : "No Portal Access"}
                            </div>
                            {lastLoginDate && (
                                <div className="flex items-center gap-1 text-gray-600">
                                    <Clock className="h-3 w-3 text-yellow-500" />
                                    Last: {format(lastLoginDate, "MMM d")}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Placeholder (Could be expanded later) */}
            <div className="border rounded-lg bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="text-sm text-gray-500 italic">No recent activity logged.</div>
            </div>
        </div>
    );
}
