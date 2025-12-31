import { create } from "zustand";
import { persist } from "zustand/middleware";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Widget types
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

export interface WidgetSettings {
    dateRange?: "week" | "month" | "quarter" | "year";
    showChart?: boolean;
    limit?: number;
}

// Simplified config: just visibility + global settings
export interface DashboardConfig {
    visibleWidgets: Record<WidgetId, boolean>;
    widgetSettings: Record<WidgetId, WidgetSettings>;
    dataDensity: DataDensity;
    widgetStyle: WidgetStyle;
    updatedAt: string;
}

// Default visibility (all core widgets visible)
const DEFAULT_VISIBILITY: Record<WidgetId, boolean> = {
    revenue: true,
    tasks: true,
    activity: true,
    pipeline: true,
    quickActions: true,
    calendar: false,
    customers: true,
    performance: false,
};

const DEFAULT_WIDGET_SETTINGS: Record<WidgetId, WidgetSettings> = {
    revenue: { dateRange: "month", showChart: true },
    tasks: { limit: 5 },
    activity: { limit: 10 },
    pipeline: {},
    quickActions: {},
    calendar: {},
    customers: { limit: 5 },
    performance: {},
};

const DEFAULT_CONFIG: DashboardConfig = {
    visibleWidgets: DEFAULT_VISIBILITY,
    widgetSettings: DEFAULT_WIDGET_SETTINGS,
    dataDensity: "comfortable",
    widgetStyle: "card",
    updatedAt: new Date().toISOString(),
};

interface DashboardState {
    config: DashboardConfig;
    savedConfig: DashboardConfig | null;
    isLoading: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    _hasHydrated: boolean;

    // Actions
    setHasHydrated: (val: boolean) => void;
    toggleWidget: (widgetId: WidgetId, enabled: boolean) => void;
    updateWidgetSettings: (widgetId: WidgetId, settings: Partial<WidgetSettings>) => void;
    updateGlobalSettings: (settings: { dataDensity?: DataDensity; widgetStyle?: WidgetStyle }) => void;
    loadFromFirestore: (orgId: string, userId: string) => Promise<void>;
    saveToFirestore: (orgId: string, userId: string) => Promise<boolean>;
    discardChanges: () => void;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            config: DEFAULT_CONFIG,
            savedConfig: null,
            isLoading: true,
            isSaving: false,
            hasUnsavedChanges: false,
            _hasHydrated: false,

            setHasHydrated: (val) => set({ _hasHydrated: val }),

            toggleWidget: (widgetId, enabled) => {
                const { config } = get();
                set({
                    config: {
                        ...config,
                        visibleWidgets: { ...config.visibleWidgets, [widgetId]: enabled },
                        updatedAt: new Date().toISOString(),
                    },
                    hasUnsavedChanges: true,
                });
            },

            updateWidgetSettings: (widgetId, settings) => {
                const { config } = get();
                set({
                    config: {
                        ...config,
                        widgetSettings: {
                            ...config.widgetSettings,
                            [widgetId]: { ...config.widgetSettings[widgetId], ...settings },
                        },
                        updatedAt: new Date().toISOString(),
                    },
                    hasUnsavedChanges: true,
                });
            },

            updateGlobalSettings: (settings) => {
                const { config } = get();
                set({
                    config: { ...config, ...settings, updatedAt: new Date().toISOString() },
                    hasUnsavedChanges: true,
                });
            },

            loadFromFirestore: async (orgId, userId) => {
                if (!orgId || !userId) {
                    set({ isLoading: false });
                    return;
                }

                set({ isLoading: true });
                try {
                    const docRef = doc(db, "users", userId, "orgSettings", orgId);
                    const snap = await getDoc(docRef);

                    if (snap.exists() && snap.data().dashboardConfig) {
                        const remoteData = snap.data().dashboardConfig as DashboardConfig;

                        // Merge with defaults to handle new widgets
                        const loadedConfig: DashboardConfig = {
                            visibleWidgets: { ...DEFAULT_VISIBILITY, ...remoteData.visibleWidgets },
                            widgetSettings: { ...DEFAULT_WIDGET_SETTINGS, ...remoteData.widgetSettings },
                            dataDensity: remoteData.dataDensity || DEFAULT_CONFIG.dataDensity,
                            widgetStyle: remoteData.widgetStyle || DEFAULT_CONFIG.widgetStyle,
                            updatedAt: remoteData.updatedAt || new Date().toISOString(),
                        };

                        set({
                            config: loadedConfig,
                            savedConfig: loadedConfig,
                            hasUnsavedChanges: false,
                        });
                    } else {
                        set({ savedConfig: null, hasUnsavedChanges: false });
                    }
                } catch (error) {
                    console.error("Failed to load dashboard settings", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            saveToFirestore: async (orgId, userId) => {
                if (!orgId || !userId) return false;

                const { config } = get();
                set({ isSaving: true });
                try {
                    const docRef = doc(db, "users", userId, "orgSettings", orgId);
                    await setDoc(docRef, { dashboardConfig: config }, { merge: true });

                    set({
                        savedConfig: config,
                        hasUnsavedChanges: false,
                        isSaving: false,
                    });
                    return true;
                } catch (error) {
                    console.error("Failed to save dashboard settings", error);
                    set({ isSaving: false });
                    return false;
                }
            },

            discardChanges: () => {
                const { savedConfig } = get();
                set({
                    config: savedConfig || DEFAULT_CONFIG,
                    hasUnsavedChanges: false,
                });
            },
        }),
        {
            name: "dashboard-config-v2",
            partialize: (state) => ({ config: state.config }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
