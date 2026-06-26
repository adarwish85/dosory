// Sentry initialization for the browser. The DSN must be a NEXT_PUBLIC_ var so it is
// inlined into the client bundle at build time. No-op unless the DSN is set.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
    dsn,
    enabled: !!dsn,
    tracesSampleRate: 0.1,
    // Session Replay off by default (cost/privacy); enable later if desired.
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
});
