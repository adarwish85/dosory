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
    subdomain?: string; // Custom subdomain e.g. "acme"
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

    // Platform
    platformName?: string;
    maintenanceMode?: boolean;
}

const DEFAULT_SETTINGS: OrganizationSettings = {
    companyName: "",
    platformName: "WasilaDev",
    maintenanceMode: false,
    rtlAdmin: false,
    rtlCustomer: false,
    allowedFileTypes: ".png,.jpg,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt",
    dateFormat: "d/m/Y",
    timeFormat: "12",
    timezone: "Africa/Cairo",
    defaultLanguage: "en",
    subdomain: "", // Default empty
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
                // Fetch general settings from subcollection
                const settingsRef = doc(db, "organizations", profile.orgId, "settings", "general");
                const settingsSnap = await getDoc(settingsRef);

                // Fetch root organization doc for subdomain
                const orgRef = doc(db, "organizations", profile.orgId);
                const orgSnap = await getDoc(orgRef);

                let data: any = {};
                if (settingsSnap.exists()) {
                    data = { ...data, ...settingsSnap.data() };
                }

                if (orgSnap.exists()) {
                    // Extract subdomain from root doc
                    const orgData = orgSnap.data();
                    if (orgData.subdomain) {
                        data = { ...data, subdomain: orgData.subdomain };
                    }
                }

                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...data,
                    // Handle dates if they exist in subcollection data
                    updatedAt: data.updatedAt?.toDate?.(),
                    createdAt: data.createdAt?.toDate?.(),
                });
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
            // Handle Subdomain logic separately if it's being updated
            if (updates.subdomain !== undefined) {
                const newSubdomain = updates.subdomain.toLowerCase().trim();

                // If subdomain is effectively changing
                if (newSubdomain !== settings.subdomain) {
                    // Check uniqueness
                    const { collection, query, where, getDocs } = await import("firebase/firestore");
                    const orgsRef = collection(db, "organizations");
                    const q = query(orgsRef, where("subdomain", "==", newSubdomain));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        // Check if the found doc is NOT this org (collision)
                        const existingDoc = querySnapshot.docs[0];
                        if (existingDoc.id !== profile.orgId) {
                            throw new Error("Subdomain is already taken.");
                        }
                    }

                    // Update root organization document
                    const orgRef = doc(db, "organizations", profile.orgId);
                    await updateDoc(orgRef, { subdomain: newSubdomain });
                }
            }

            // Update Settings Subcollection
            // Exclude subdomain from this update as it lives on the root doc
            const { subdomain, ...settingsUpdates } = updates;

            if (Object.keys(settingsUpdates).length > 0) {
                const settingsRef = doc(db, "organizations", profile.orgId, "settings", "general");
                await setDoc(settingsRef, {
                    ...settingsUpdates,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            }

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
    }, [profile?.orgId, settings.companyName, settings.subdomain]);

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
