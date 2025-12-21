"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { ContractsList } from "@/components/dashboard/contracts-list";
import { FinanceOverviewWidget } from "@/components/dashboard/finance-overview-widget";
import { Wallet, TrendingUp, Sliders, ClipboardCheck } from "lucide-react";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useEstimates, useProposals } from "@/lib/hooks/use-sales";
import { useProjects, useTasks } from "@/lib/hooks/use-projects";
import { useCustomers } from "@/lib/hooks/use-customers";

export default function DashboardPage() {
    const { invoiceStats, invoices } = useInvoices();
    const { estimateStats } = useEstimates();
    const { proposalStats } = useProposals();
    const { projectStats } = useProjects();
    const { taskStats } = useTasks();
    const { customers } = useCustomers();

    // Calculate Invoices Awaiting Payment (Pending + Overdue + Partial + Sent + Viewed)
    // Basically total - paid - cancelled - draft
    const awaitingPayment = (invoiceStats?.total || 0)
        - ((invoiceStats?.paid as number) || 0)
        - ((invoiceStats?.cancelled as number) || 0)
        - ((invoiceStats?.draft as number) || 0);

    // Percentages helper
    const getPerc = (val: number, total: number) => total > 0 ? (val / total) * 100 : 0;

    return (
        <div className="space-y-4">
            {/* Top Row Stats - 2 per row on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                    title="Invoices Awaiting Payment"
                    current={awaitingPayment}
                    total={invoiceStats?.total || 0}
                    icon={<Wallet className="h-4 w-4" />}
                    progress={getPerc(awaitingPayment, invoiceStats?.total || 1)}
                    progressColor="bg-red-500"
                />
                <StatCard
                    title="Active Customers"
                    current={customers?.filter(c => c.status === "active").length || 0}
                    total={customers?.length || 0}
                    icon={<TrendingUp className="h-4 w-4" />}
                    progress={getPerc(customers?.filter(c => c.status === "active").length || 0, customers?.length || 1)}
                    progressColor="bg-green-500"
                />
                <StatCard
                    title="Projects In Progress"
                    current={projectStats?.in_progress || 0}
                    total={projectStats?.total || 0}
                    icon={<Sliders className="h-4 w-4" />}
                    progress={getPerc(projectStats?.in_progress || 0, projectStats?.total || 1)}
                    progressColor="bg-blue-600"
                />
                <StatCard
                    title="Tasks Not Finished"
                    current={(taskStats?.total || 0) - (taskStats?.completed || 0)}
                    total={taskStats?.total || 0}
                    icon={<ClipboardCheck className="h-4 w-4" />}
                    progress={getPerc((taskStats?.total || 0) - (taskStats?.completed || 0), taskStats?.total || 1)}
                    progressColor="bg-orange-500"
                />
            </div>

            <FinanceOverviewWidget
                invoiceStats={invoiceStats}
                estimateStats={estimateStats}
                proposalStats={proposalStats}
            />

            {/* Contracts List - Kept as separate row */}
            <div className="grid grid-cols-1">
                <ContractsList />
            </div>
        </div>
    );
}
