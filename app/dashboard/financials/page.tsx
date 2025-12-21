import { Metadata } from "next";
import { FinancialOverview } from "./components/financial-overview";
import { RecentTransactions } from "./components/recent-transactions";

export const metadata: Metadata = {
    title: "Financials | Dashboard",
    description: "Financial overview and accounting",
};

export default function FinancialsPage() {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Financials</h2>
            </div>
            <div className="space-y-4">
                {/* <FinancialOverview /> */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4">
                        {/* <RecentTransactions /> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
