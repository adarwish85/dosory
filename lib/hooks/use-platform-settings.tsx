"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PlatformSettings {
    platformName: string;
    supportEmail: string;
    websiteUrl: string;
    maintenanceMode: boolean;
    allowSignups: boolean;
    requireEmailVerification: boolean;
    defaultTrialDays: number;
    maxUsersPerTenant: number;
    emailNotifications: boolean;
    slackNotifications: boolean;
    customBranding: boolean;
    primaryColor: string;
    logoUrl: string;
}

const defaultSettings: PlatformSettings = {
    platformName: "Dosory",
    supportEmail: "support@dosory.com",
    websiteUrl: "https://dosory.com",
    maintenanceMode: false,
    allowSignups: true,
    requireEmailVerification: true,
    defaultTrialDays: 14,
    maxUsersPerTenant: 50,
    emailNotifications: true,
    slackNotifications: false,
    customBranding: true,
    primaryColor: "#9b8cff",
    logoUrl: "",
};

interface PlatformSettingsContextType {
    settings: PlatformSettings;
    loading: boolean;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextType>({
    settings: defaultSettings,
    loading: true,
});

export function PlatformSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, "platform", "settings"),
            (docSnap) => {
                if (docSnap.exists()) {
                    setSettings({ ...defaultSettings, ...docSnap.data() as PlatformSettings });
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching platform settings:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return (
        <PlatformSettingsContext.Provider value={{ settings, loading }}>
            {children}
        </PlatformSettingsContext.Provider>
    );
}

export function usePlatformSettings() {
    return useContext(PlatformSettingsContext);
}

// Logo component that displays either the uploaded logo or text fallback
export function PlatformLogo({
    className = "",
    textClassName = "",
    showText = true,
    size = "default"
}: {
    className?: string;
    textClassName?: string;
    showText?: boolean;
    size?: "small" | "default" | "large";
}) {
    const { settings, loading } = usePlatformSettings();

    const sizeClasses = {
        small: "h-6 w-auto",
        default: "h-8 w-auto",
        large: "h-12 w-auto",
    };

    if (loading) {
        return (
            <div className={`animate-pulse bg-gray-200 rounded ${sizeClasses[size]} ${className}`} style={{ minWidth: "80px" }} />
        );
    }

    if (settings.logoUrl) {
        return (
            <img
                src={settings.logoUrl}
                alt={settings.platformName}
                className={`${sizeClasses[size]} object-contain ${className}`}
            />
        );
    }

    // Fallback to text/icon
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: settings.primaryColor }}
            >
                {settings.platformName?.charAt(0) || "D"}
            </div>
            {showText && (
                <span className={`font-semibold ${textClassName}`}>
                    {settings.platformName || "Dosory"}
                </span>
            )}
        </div>
    );
}
