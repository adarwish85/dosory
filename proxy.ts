import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSetupRedirect, getSettingsTabRedirect } from "@/lib/setup-redirects";

export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. all root files inside /public (e.g. /favicon.ico)
         */
        "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
    ],
};

export default async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get("host") || "";

    // Define allowed domains (including localhost for dev)
    const allowedDomains = ["dosory.com", "localhost:3000", "goalo.vercel.app"];

    // Identify if we are on a custom subdomain
    // logic: if hostname is NOT in allowedDomains, it is a subdomain
    // OR explicitly check for endsWith

    const isLocal = hostname.includes("localhost");
    const rootDomain = isLocal ? "localhost:3000" : process.env.NEXT_PUBLIC_ROOT_DOMAIN || "dosory.com";

    // Extract subdomain:
    // e.g. acme.dosory.com -> acme
    // e.g. dosory.com -> null
    // e.g. acme.localhost:3000 -> acme

    let subdomain = null;
    if (hostname !== rootDomain && hostname.endsWith(`.${rootDomain}`)) {
        subdomain = hostname.replace(`.${rootDomain}`, "");
    }

    // Handle Subdomains
    if (subdomain) {
        // Allow specific subdomains like 'www', 'app' to act as root if needed
        if (subdomain === "www" || subdomain === "app") {
            return NextResponse.next();
        }

        // Rewrite to the tenant path or just set header
        // For now, we will set a header 'X-Tenant-Subdomain' so our app can read it
        // And we avoid rewriting the URL structure completely to keep things simple for now
        // unless we want to map subdomains to specific page folders like /_sites/[site]

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-tenant-subdomain", subdomain);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    // Handle Setup menu redirects for backward compatibility
    if (url.pathname.startsWith("/dashboard/setup")) {
        // Check for direct URL redirects
        const redirect = getSetupRedirect(url.pathname);
        if (redirect) {
            return NextResponse.redirect(new URL(redirect, req.url));
        }

        // Check for settings tab redirects (?tab=xxx)
        if (url.pathname === "/dashboard/setup/settings") {
            const tab = url.searchParams.get("tab");
            const settingsRedirect = getSettingsTabRedirect(tab);
            return NextResponse.redirect(new URL(settingsRedirect, req.url));
        }
    }

    // Super Admin Route Protection
    // Note: Detailed permission checks happen in the layout/page via AuthContext
    // But we can add a basic layer here if cookies are present
    if (url.pathname.startsWith("/sa")) {
        // For now, let the layout handle the redirect based on user claims
        // checking cookies here would require firebase-admin which is edge-incompatible without hacks
        return NextResponse.next();
    }

    return NextResponse.next();
}
