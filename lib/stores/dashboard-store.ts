import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type LayoutItem, type WidgetId, type WidgetStyle, type DataDensity, type LayoutPreset } from "@/lib/hooks/use-dashboard-layout";

// Re-export types
export type { LayoutItem, WidgetId, WidgetStyle, DataDensity, LayoutPreset };

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

export interface DashboardConfig {
    preset: LayoutPreset;
    layout: LayoutItem[];
    widgets: DashboardWidget[];
    dataDensity: DataDensity;
    widgetStyle: WidgetStyle;
    updatedAt: string; // ISO string for JSON serialization
}

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

const DEFAULT_CONFIG: DashboardConfig = {
    preset: "balanced",
    layout: PRESET_LAYOUTS.balanced,
    widgets: DEFAULT_WIDGETS,
    dataDensity: "comfortable",
    widgetStyle: "card",
    updatedAt: new Date().toISOString(),
};

interface DashboardState {
    config: DashboardConfig;
    isEditing: boolean;
    isLoading: boolean;
    isSaving: boolean;

    // Actions
    setConfig: (config: DashboardConfig) => void;
    setEditMode: (isEditing: boolean) => void;
    updateLayout: (layout: LayoutItem[]) => Promise<void>;
    applyPreset: (preset: LayoutPreset) => Promise<void>;
    toggleWidget: (widgetId: WidgetId, enabled: boolean) => Promise<void>;
    updateWidgetSettings: (widgetId: WidgetId, settings: Partial<WidgetSettings>) => Promise<void>;
    updateGlobalSettings: (settings: { dataDensity?: DataDensity; widgetStyle?: WidgetStyle }) => Promise<void>;
    loadFromFirestore: (orgId: string, userId: string) => Promise<void>;
    syncToFirestore: (orgId: string, userId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            config: DEFAULT_CONFIG,
            isEditing: false,
            isLoading: true,
            isSaving: false,

            setConfig: (config) => set({ config }),
            setEditMode: (isEditing) => set({ isEditing }),

            updateLayout: async (layout) => {
                const { config } = get();
                const newConfig = { ...config, layout, updatedAt: new Date().toISOString() };
                set({ config: newConfig });
                // Note: Firestore sync is handled by the component calling syncToFirestore
            },

            applyPreset: async (preset) => {
                const { config } = get();
                const presetLayout = PRESET_LAYOUTS[preset];
                const enabledWidgetIds = new Set(presetLayout.map(l => l.i));

                const newWidgets = DEFAULT_WIDGETS.map(w => ({
                    ...w,
                    enabled: enabledWidgetIds.has(w.id),
                }));

                const newConfig = {
                    ...config,
                    preset,
                    layout: presetLayout,
                    widgets: newWidgets,
                    updatedAt: new Date().toISOString(),
                };

                set({ config: newConfig });
            },

            toggleWidget: async (widgetId, enabled) => {
                const { config } = get();
                const newWidgets = config.widgets.map(w =>
                    w.id === widgetId ? { ...w, enabled } : w
                );

                let newLayout = config.layout;
                if (enabled) {
                    if (!config.layout.find(l => l.i === widgetId)) {
                        newLayout = [
                            ...config.layout,
                            { i: widgetId, x: 0, y: Infinity, w: 4, h: 3 },
                        ];
                    }
                } else {
                    newLayout = config.layout.filter(l => l.i !== widgetId);
                }

                const newConfig = {
                    ...config,
                    layout: newLayout,
                    widgets: newWidgets,
                    updatedAt: new Date().toISOString(),
                };

                set({ config: newConfig });
            },

            updateWidgetSettings: async (widgetId, settings) => {
                const { config } = get();
                const newWidgets = config.widgets.map(w =>
                    w.id === widgetId ? { ...w, settings: { ...w.settings, ...settings } } : w
                );

                set({
                    config: { ...config, widgets: newWidgets, updatedAt: new Date().toISOString() }
                });
            },

            updateGlobalSettings: async (settings) => {
                const { config } = get();
                set({
                    config: { ...config, ...settings, updatedAt: new Date().toISOString() }
                });
            },

            loadFromFirestore: async (orgId, userId) => {
                if (!orgId || !userId) {
                    set({ isLoading: false });
                    return;
                }

                set({ isLoading: true });
                try {
                    const docRef = doc(db, "organizations", orgId, "userSettings", userId);
                    const snap = await getDoc(docRef);
                    if (snap.exists() && snap.data().dashboardLayout) {
                        const data = snap.data().dashboardLayout;
                        set({
                            config: {
                                ...DEFAULT_CONFIG,
                                ...data,
                                updatedAt: data.updatedAt || new Date().toISOString()
                            }
                        });
                    }
                } catch (error) {
                    console.error("Failed to load dashboard settings", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            syncToFirestore: async (orgId, userId) => {
                if (!orgId || !userId) return;

                const { config } = get();
                set({ isSaving: true });
                try {
                    const docRef = doc(db, "organizations", orgId, "userSettings", userId);
                    await setDoc(docRef, {
                        dashboardLayout: config
                    }, { merge: true });
                } catch (error) {
                    console.error("Failed to sync dashboard settings", error);
                } finally {
                    set({ isSaving: false });
                }
            }
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({ config: state.config }), // Only persist config to localStorage
        }
    )
);
