"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";

// Custom layout item type (react-grid-layout's Layout type has issues)
export interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
}

export type WidgetId =
    | "revenue"
    | "tasks"
    | "activity"
    | "pipeline"
    | "quickActions"
    | "calendar"
    | "customers"
    | "performance";

export type WidgetStyle = "minimal" | "card" | "gradient";
export type DataDensity = "compact" | "comfortable" | "spacious";
export type LayoutPreset = "sales" | "projects" | "balanced";

export interface WidgetSettings {
    dateRange?: "week" | "month" | "quarter" | "year";
    showChart?: boolean;
    limit?: number;
    style?: WidgetStyle;
}

export interface DashboardWidget {
    id: WidgetId;
    enabled: boolean;
    settings: WidgetSettings;
}

export interface DashboardLayoutConfig {
    preset: LayoutPreset;
    layout: LayoutItem[];
    widgets: DashboardWidget[];
    dataDensity: DataDensity;
    widgetStyle: WidgetStyle;
    updatedAt: Date;
}

// Default layouts for each preset
const PRESET_LAYOUTS: Record<LayoutPreset, LayoutItem[]> = {
    balanced: [
        { i: "revenue", x: 0, y: 0, w: 4, h: 3 },
        { i: "tasks", x: 4, y: 0, w: 4, h: 3 },
        { i: "activity", x: 8, y: 0, w: 4, h: 4 },
        { i: "quickActions", x: 0, y: 3, w: 2, h: 2 },
        { i: "pipeline", x: 2, y: 3, w: 3, h: 3 },
        { i: "customers", x: 5, y: 3, w: 3, h: 3 },
    ],
    sales: [
        { i: "revenue", x: 0, y: 0, w: 6, h: 4 },
        { i: "pipeline", x: 6, y: 0, w: 6, h: 4 },
        { i: "customers", x: 0, y: 4, w: 4, h: 3 },
        { i: "quickActions", x: 4, y: 4, w: 2, h: 2 },
        { i: "performance", x: 6, y: 4, w: 6, h: 3 },
    ],
    projects: [
        { i: "tasks", x: 0, y: 0, w: 6, h: 4 },
        { i: "calendar", x: 6, y: 0, w: 6, h: 4 },
        { i: "activity", x: 0, y: 4, w: 4, h: 4 },
        { i: "performance", x: 4, y: 4, w: 4, h: 3 },
        { i: "quickActions", x: 8, y: 4, w: 4, h: 2 },
    ],
};

const DEFAULT_WIDGETS: DashboardWidget[] = [
    { id: "revenue", enabled: true, settings: { dateRange: "month", showChart: true } },
    { id: "tasks", enabled: true, settings: { limit: 5 } },
    { id: "activity", enabled: true, settings: { limit: 10 } },
    { id: "pipeline", enabled: true, settings: {} },
    { id: "quickActions", enabled: true, settings: {} },
    { id: "calendar", enabled: false, settings: {} },
    { id: "customers", enabled: true, settings: { limit: 5 } },
    { id: "performance", enabled: false, settings: {} },
];

const DEFAULT_CONFIG: DashboardLayoutConfig = {
    preset: "balanced",
    layout: PRESET_LAYOUTS.balanced,
    widgets: DEFAULT_WIDGETS,
    dataDensity: "comfortable",
    widgetStyle: "card",
    updatedAt: new Date(),
};

export function useDashboardLayout() {
    const { user } = useAuth();
    const [config, setConfig] = useState<DashboardLayoutConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Get orgId from user's custom claims or default
    const orgId = (user as any)?.orgId || user?.uid;
    const userId = user?.uid;

    // Load user's dashboard config from Firestore
    useEffect(() => {
        if (!orgId || !userId) {
            setLoading(false);
            return;
        }

        const docRef = doc(db, "organizations", orgId, "userSettings", userId);

        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    if (data.dashboardLayout) {
                        setConfig({
                            ...DEFAULT_CONFIG,
                            ...data.dashboardLayout,
                            updatedAt: data.dashboardLayout.updatedAt?.toDate?.() || new Date(),
                        });
                    }
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error loading dashboard layout:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [orgId, userId]);

    // Save layout to Firestore
    const saveLayout = useCallback(
        async (newLayout: LayoutItem[]) => {
            if (!orgId || !userId) return;

            setSaving(true);
            try {
                const docRef = doc(db, "organizations", orgId, "userSettings", userId);
                await setDoc(
                    docRef,
                    {
                        dashboardLayout: {
                            ...config,
                            layout: newLayout,
                            updatedAt: new Date(),
                        },
                    },
                    { merge: true }
                );

                setConfig((prev) => ({ ...prev, layout: newLayout, updatedAt: new Date() }));
            } catch (error) {
                console.error("Error saving layout:", error);
            } finally {
                setSaving(false);
            }
        },
        [orgId, userId, config]
    );

    // Apply a preset
    const applyPreset = useCallback(
        async (preset: LayoutPreset) => {
            if (!orgId || !userId) return;

            const presetLayout = PRESET_LAYOUTS[preset];
            const enabledWidgetIds = new Set(presetLayout.map((l) => l.i));

            const newWidgets = DEFAULT_WIDGETS.map((w) => ({
                ...w,
                enabled: enabledWidgetIds.has(w.id),
            }));

            setSaving(true);
            try {
                const docRef = doc(db, "organizations", orgId, "userSettings", userId);
                await setDoc(
                    docRef,
                    {
                        dashboardLayout: {
                            preset,
                            layout: presetLayout,
                            widgets: newWidgets,
                            dataDensity: config.dataDensity,
                            widgetStyle: config.widgetStyle,
                            updatedAt: new Date(),
                        },
                    },
                    { merge: true }
                );

                setConfig((prev) => ({
                    ...prev,
                    preset,
                    layout: presetLayout,
                    widgets: newWidgets,
                    updatedAt: new Date(),
                }));
            } catch (error) {
                console.error("Error applying preset:", error);
            } finally {
                setSaving(false);
            }
        },
        [orgId, userId, config.dataDensity, config.widgetStyle]
    );

    // Toggle widget visibility
    const toggleWidget = useCallback(
        async (widgetId: WidgetId, enabled: boolean) => {
            if (!orgId || !userId) return;

            const newWidgets = config.widgets.map((w) => (w.id === widgetId ? { ...w, enabled } : w));

            let newLayout = config.layout;
            if (enabled) {
                // Add widget to layout if not present
                if (!config.layout.find((l) => l.i === widgetId)) {
                    newLayout = [...config.layout, { i: widgetId, x: 0, y: Infinity, w: 4, h: 3 }];
                }
            } else {
                // Remove widget from layout
                newLayout = config.layout.filter((l) => l.i !== widgetId);
            }

            setSaving(true);
            try {
                const docRef = doc(db, "organizations", orgId, "userSettings", userId);
                await setDoc(
                    docRef,
                    {
                        dashboardLayout: {
                            ...config,
                            layout: newLayout,
                            widgets: newWidgets,
                            updatedAt: new Date(),
                        },
                    },
                    { merge: true }
                );

                setConfig((prev) => ({
                    ...prev,
                    layout: newLayout,
                    widgets: newWidgets,
                    updatedAt: new Date(),
                }));
            } catch (error) {
                console.error("Error toggling widget:", error);
            } finally {
                setSaving(false);
            }
        },
        [orgId, userId, config]
    );

    // Update widget settings
    const updateWidgetSettings = useCallback(
        async (widgetId: WidgetId, settings: Partial<WidgetSettings>) => {
            if (!orgId || !userId) return;

            const newWidgets = config.widgets.map((w) =>
                w.id === widgetId ? { ...w, settings: { ...w.settings, ...settings } } : w
            );

            setSaving(true);
            try {
                const docRef = doc(db, "organizations", orgId, "userSettings", userId);
                await setDoc(
                    docRef,
                    {
                        dashboardLayout: {
                            ...config,
                            widgets: newWidgets,
                            updatedAt: new Date(),
                        },
                    },
                    { merge: true }
                );

                setConfig((prev) => ({
                    ...prev,
                    widgets: newWidgets,
                    updatedAt: new Date(),
                }));
            } catch (error) {
                console.error("Error updating widget settings:", error);
            } finally {
                setSaving(false);
            }
        },
        [orgId, userId, config]
    );

    // Update global settings
    const updateGlobalSettings = useCallback(
        async (updates: { dataDensity?: DataDensity; widgetStyle?: WidgetStyle }) => {
            if (!orgId || !userId) return;

            setSaving(true);
            try {
                const docRef = doc(db, "organizations", orgId, "userSettings", userId);
                await setDoc(
                    docRef,
                    {
                        dashboardLayout: {
                            ...config,
                            ...updates,
                            updatedAt: new Date(),
                        },
                    },
                    { merge: true }
                );

                setConfig((prev) => ({
                    ...prev,
                    ...updates,
                    updatedAt: new Date(),
                }));
            } catch (error) {
                console.error("Error updating global settings:", error);
            } finally {
                setSaving(false);
            }
        },
        [orgId, userId, config]
    );

    // Get enabled widgets with their layout
    const enabledWidgets = config.widgets.filter((w) => w.enabled);
    const enabledLayout = config.layout.filter((l) => enabledWidgets.some((w) => w.id === l.i));

    return {
        config,
        layout: enabledLayout,
        widgets: config.widgets,
        enabledWidgets,
        loading,
        saving,
        saveLayout,
        applyPreset,
        toggleWidget,
        updateWidgetSettings,
        updateGlobalSettings,
        presets: Object.keys(PRESET_LAYOUTS) as LayoutPreset[],
    };
}
