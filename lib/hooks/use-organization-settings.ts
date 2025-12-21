"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface OrganizationSettings {
    // General
    companyName: string;
    logoLight?: string;
    logoDark?: string;
    favicon?: string;
    mainDomain?: string;
    rtlAdmin: boolean;
    rtlCustomer: boolean;
    allowedFileTypes: string;

    // Company Information
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    phone?: string;
    vatNumber?: string;

    // Localization
    dateFormat: string;
    timeFormat: "12" | "24";
    timezone: string;
    defaultLanguage: string;

    // Metadata
    updatedAt?: Date;
    createdAt?: Date;
}

const DEFAULT_SETTINGS: OrganizationSettings = {
    companyName: "",
    rtlAdmin: false,
    rtlCustomer: false,
    allowedFileTypes: ".png,.jpg,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt",
    dateFormat: "d/m/Y",
    timeFormat: "12",
    timezone: "Africa/Cairo",
    defaultLanguage: "en",
};

export function useOrganizationSettings() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load settings
    useEffect(() => {
        if (profileLoading || !profile?.orgId) return;

        const loadSettings = async () => {
            try {
                const docRef = doc(db, "organizations", profile.orgId, "settings", "general");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setSettings({
                        ...DEFAULT_SETTINGS,
                        ...data,
                        updatedAt: data.updatedAt?.toDate(),
                        createdAt: data.createdAt?.toDate(),
                    });
                }
            } catch (error) {
                console.error("Error loading org settings:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [profile?.orgId, profileLoading]);

    // Save settings
    const saveSettings = useCallback(async (updates: Partial<OrganizationSettings>) => {
        if (!profile?.orgId) throw new Error("No organization");

        setSaving(true);
        try {
            const docRef = doc(db, "organizations", profile.orgId, "settings", "general");

            await setDoc(docRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setSettings(prev => ({ ...prev, ...updates }));

            // Check if company profile is complete for onboarding
            const hasCompanyInfo = updates.companyName || settings.companyName;
            if (hasCompanyInfo) {
                await triggerOnboardingStep("companyProfile");
            }

        } catch (error) {
            console.error("Error saving settings:", error);
            throw error;
        } finally {
            setSaving(false);
        }
    }, [profile?.orgId, settings.companyName]);

    // Upload logo
    const uploadLogo = useCallback(async (file: File, type: "light" | "dark" | "favicon"): Promise<string> => {
        if (!profile?.orgId) throw new Error("No organization");

        const path = `organizations/${profile.orgId}/branding/${type}-${Date.now()}`;
        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // Save URL to settings
        const field = type === "light" ? "logoLight" : type === "dark" ? "logoDark" : "favicon";
        await saveSettings({ [field]: url });

        return url;
    }, [profile?.orgId, saveSettings]);

    // Trigger onboarding step completion
    const triggerOnboardingStep = useCallback(async (step: string) => {
        if (!profile?.uid) return;

        try {
            const docRef = doc(db, "users", profile.uid, "onboarding", "state");
            await updateDoc(docRef, {
                [`steps.${step}`]: true,
            });
        } catch (error) {
            // Silently fail if onboarding doc doesn't exist
            console.log("Onboarding step trigger skipped:", step);
        }
    }, [profile?.uid]);

    return {
        settings,
        loading,
        saving,
        saveSettings,
        uploadLogo,
        triggerOnboardingStep,
    };
}
