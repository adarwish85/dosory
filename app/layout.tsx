import type { Metadata } from "next";
import { Geist_Mono, Urbanist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { PlatformSettingsProvider } from "@/lib/hooks/use-platform-settings";
import { Toaster } from "sonner";

// Optimized font loading with display swap for better LCP
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
    preload: true,
});

const urbanist = Urbanist({
    variable: "--font-urbanist",
    subsets: ["latin"],
    display: "swap",
    preload: true,
    weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "Dosory",
    description: "All-in-one CRM and ERP platform",
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
    },
};

import { ImpersonationProvider } from "@/lib/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";

// ... (existing imports, but wait, replace modifies a chunk)

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${urbanist.variable} ${geistMono.variable} antialiased font-sans`}>
                <PlatformSettingsProvider>
                    <ImpersonationProvider>
                        <ImpersonationBanner />
                        <AuthProvider>{children}</AuthProvider>
                    </ImpersonationProvider>
                    <Toaster richColors position="top-right" />
                </PlatformSettingsProvider>
            </body>
        </html>
    );
}
