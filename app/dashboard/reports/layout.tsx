import { ReportSidebar } from "@/components/reports/report-sidebar";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <ReportSidebar />
            <main className="flex-1 overflow-x-hidden bg-white">{children}</main>
        </div>
    );
}
