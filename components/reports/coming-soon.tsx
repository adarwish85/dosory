import { Sparkles } from "lucide-react";

/**
 * Placeholder for reports that are not yet backed by live data. Renders the report's
 * title + a "Coming soon" panel instead of fabricated numbers (A8). Replace with the
 * real report once its Firestore aggregation lands (Phase 2.3).
 */
export function ComingSoonReport({ title, description }: { title: string; description: string }) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
            </div>
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Coming soon</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    This report is being built with live data from your workspace. It will appear here once ready.
                </p>
            </div>
        </div>
    );
}
