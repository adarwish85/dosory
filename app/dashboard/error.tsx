"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Dashboard error boundary
 * Catches errors in dashboard routes and provides contextual recovery
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const router = useRouter();

    useEffect(() => {
        // Report to Sentry (no-op until a DSN is configured) + keep the console log.
        Sentry.captureException(error);
        console.error("Dashboard error:", error);
    }, [error]);

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-card border rounded-lg shadow-sm p-8 text-center space-y-6">
                {/* Error icon */}
                <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-7 w-7 text-destructive" />
                </div>

                {/* Error message */}
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">Unable to load this page</h2>
                    <p className="text-muted-foreground text-sm">
                        Something went wrong while loading this section. This could be a temporary issue.
                    </p>
                </div>

                {/* Error details (only in development) */}
                {process.env.NODE_ENV === "development" && (
                    <div className="bg-muted rounded-md p-3 text-left">
                        <p className="text-xs font-mono text-muted-foreground break-all">{error.message}</p>
                    </div>
                )}

                {/* Recovery actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset} variant="default" size="sm" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </Button>
                    <Button onClick={() => router.push("/dashboard")} variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}
