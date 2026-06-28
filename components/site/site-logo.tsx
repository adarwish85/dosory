"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Marketing-site logo. Reads the configured platform logo from platform/settings
 * (publicly readable, same source as the login/signup PlatformLogo) and renders it.
 * Falls back to the provided wordmark until settings load and whenever no logo is
 * configured. Standalone — no PlatformSettingsProvider needed — so it works on the
 * static, unauthenticated homepage.
 *
 * variant "light" uses logoLightUrl (for dark backgrounds, e.g. the footer); "dark"
 * uses logoUrl (for light backgrounds, e.g. the header).
 */
export function SiteLogo({
    variant = "dark",
    className = "",
    fallback,
}: {
    variant?: "light" | "dark";
    className?: string;
    fallback: React.ReactNode;
}) {
    const [logo, setLogo] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        getDoc(doc(db, "platform", "settings"))
            .then((snap) => {
                if (!active || !snap.exists()) return;
                const d = snap.data() as { logoUrl?: string; logoLightUrl?: string };
                const url = variant === "light" && d.logoLightUrl ? d.logoLightUrl : d.logoUrl || null;
                setLogo(url || null);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoaded(true);
            });
        return () => {
            active = false;
        };
    }, [variant]);

    if (!loaded || !logo) return <>{fallback}</>;

    // eslint-disable-next-line @next/next/no-img-element -- remote Firebase Storage URL, no next/image loader
    return <img src={logo} alt="Dosory" className={className} />;
}
