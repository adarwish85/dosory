// Sentry initialization for the Node.js server runtime.
// No-op unless a DSN is configured, so it is safe to ship before a Sentry project exists.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
    dsn,
    enabled: !!dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
    // Source maps / release tracking are intentionally not wired via the build plugin
    // (withSentryConfig) to keep the Next 16 + Turbopack build clean; runtime capture works.
});
