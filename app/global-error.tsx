"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Global error boundary for the application
 * Catches unhandled errors and provides recovery options
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        // Report to Sentry (no-op until a DSN is configured) + keep the console log.
        Sentry.captureException(error);
        console.error("Global error:", error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 text-center space-y-6">
                        {/* Error icon */}
                        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>

                        {/* Error message */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                            <p className="text-muted-foreground">
                                We encountered an unexpected error. Please try again or return to the home page.
                            </p>
                        </div>

                        {/* Error details (only in development) */}
                        {process.env.NODE_ENV === "development" && (
                            <div className="bg-muted rounded-md p-4 text-left">
                                <p className="text-sm font-mono text-muted-foreground break-all">{error.message}</p>
                                {error.digest && (
                                    <p className="text-xs text-muted-foreground mt-2">Error ID: {error.digest}</p>
                                )}
                            </div>
                        )}

                        {/* Recovery actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={reset} variant="default" className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </Button>
                            <Button onClick={() => (window.location.href = "/")} variant="outline" className="gap-2">
                                <Home className="h-4 w-4" />
                                Go Home
                            </Button>
                        </div>

                        {/* Help text */}
                        <p className="text-xs text-muted-foreground">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            </body>
        </html>
    );
}
