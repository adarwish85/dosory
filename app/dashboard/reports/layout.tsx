import { ReportSidebar } from "@/components/reports/report-sidebar";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen w-full relative">
            <ReportSidebar />
            <main className="flex-1 min-w-0 bg-white">{children}</main>
        </div>
    );
}
