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
import { UserProfileProvider } from "@/components/user-profile-provider";
import { LanguageProvider } from "@/lib/i18n";

// Pre-paint locale init: set <html dir/lang> from the saved choice (or the browser
// language) before hydration, so Arabic loads RTL with no flash. Key + precedence mirror
// lib/i18n/config.ts.
const LOCALE_INIT_SCRIPT = `(function(){try{var k='dosory.locale';var l=localStorage.getItem(k);if(l!=='en'&&l!=='ar'){l=((navigator.language||'en').toLowerCase().indexOf('ar')===0)?'ar':'en';}var e=document.documentElement;e.lang=l;e.dir=(l==='ar')?'rtl':'ltr';}catch(e){}})();`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <body className={`${urbanist.variable} ${geistMono.variable} antialiased font-sans`}>
                <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
                <LanguageProvider>
                    <PlatformSettingsProvider>
                        <ImpersonationProvider>
                            <ImpersonationBanner />
                            <AuthProvider>
                                <UserProfileProvider>{children}</UserProfileProvider>
                            </AuthProvider>
                        </ImpersonationProvider>
                        <Toaster richColors position="top-right" />
                    </PlatformSettingsProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
