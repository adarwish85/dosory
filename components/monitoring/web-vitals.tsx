"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

// Web Vitals monitoring component
// Tracks Core Web Vitals: LCP, FID, CLS, TTFB, FCP, INP
export function WebVitalsReporter() {
    useReportWebVitals((metric) => {
        // Log to console in development
        if (process.env.NODE_ENV === "development") {
            console.log(`[Web Vital] ${metric.name}: ${metric.value.toFixed(2)}ms`);
        }

        // Send to analytics in production
        // You can integrate with your analytics provider here:
        // - Google Analytics
        // - Vercel Analytics
        // - Custom endpoint

        // Example: Send to custom endpoint
        if (process.env.NODE_ENV === "production") {
            const body = JSON.stringify({
                name: metric.name,
                value: metric.value,
                rating: metric.rating, // "good" | "needs-improvement" | "poor"
                id: metric.id,
                navigationType: metric.navigationType,
            });

            // Use sendBeacon for reliability during page unload
            if (navigator.sendBeacon) {
                navigator.sendBeacon("/api/web-vitals", body);
            } else {
                fetch("/api/web-vitals", {
                    body,
                    method: "POST",
                    keepalive: true,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }
    });

    return null;
}

// Performance budget thresholds (in ms)
export const PERFORMANCE_BUDGETS = {
    LCP: 2500,   // Largest Contentful Paint: < 2.5s
    FID: 100,    // First Input Delay: < 100ms
    CLS: 0.1,    // Cumulative Layout Shift: < 0.1
    TTFB: 800,   // Time to First Byte: < 800ms
    FCP: 1800,   // First Contentful Paint: < 1.8s
    INP: 200,    // Interaction to Next Paint: < 200ms
};

// Simple hook to detect slow performance
export function usePerformanceMonitor() {
    useEffect(() => {
        // Performance Observer for long tasks (>50ms)
        if ("PerformanceObserver" in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn(`[Long Task] ${entry.duration.toFixed(2)}ms`, entry);
                        }
                    }
                });
                observer.observe({ type: "longtask", buffered: true });
                return () => observer.disconnect();
            } catch {
                // longtask not supported
            }
        }
    }, []);
}
