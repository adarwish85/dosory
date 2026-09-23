import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Image optimization
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },

    // Enable compression
    compress: true,

    // Performance optimizations
    poweredByHeader: false,

    // Experimental features for better performance
    experimental: {
        optimizeCss: false,
    },

    // Security and caching headers
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        // 0, not "1; mode=block". The legacy XSS Auditor this enables was REMOVED from
                        // Chrome and Edge, and while it existed its filtering introduced vulnerabilities of
                        // its own (it could be abused to suppress legitimate script or to probe page
                        // contents cross-origin). OWASP's current guidance is to disable it explicitly.
                        // Real XSS protection here comes from output encoding and a CSP, not this header.
                        key: "X-XSS-Protection",
                        value: "0",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                ],
            },
            {
                // Cache static assets for 1 year
                source: "/static/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
            {
                // Cache fonts for 1 year
                source: "/:path*.woff2",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
