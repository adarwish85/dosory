import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, getDoc, setDoc } from "firebase/firestore";
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
    savedConfig: DashboardConfig | null; // Last saved version for comparison
    isEditing: boolean;
    isLoading: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;

    // Actions
    setConfig: (config: DashboardConfig) => void;
    setEditMode: (isEditing: boolean) => void;
    updateLayout: (layout: LayoutItem[]) => void;
    applyPreset: (preset: LayoutPreset) => void;
    toggleWidget: (widgetId: WidgetId, enabled: boolean) => void;
    updateWidgetSettings: (widgetId: WidgetId, settings: Partial<WidgetSettings>) => void;
    updateGlobalSettings: (settings: { dataDensity?: DataDensity; widgetStyle?: WidgetStyle }) => void;
    loadFromFirestore: (orgId: string, userId: string) => Promise<void>;
    saveToFirestore: (orgId: string, userId: string) => Promise<boolean>;
    discardChanges: () => void;
    _hasHydrated: boolean;
    setHasHydrated: (val: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            config: DEFAULT_CONFIG,
            savedConfig: null,
            isEditing: false,
            isLoading: true,
            isSaving: false,
            hasUnsavedChanges: false,
            _hasHydrated: false,

            setConfig: (config) => set({ config, hasUnsavedChanges: true }),
            setEditMode: (isEditing) => set({ isEditing }),
            setHasHydrated: (val) => set({ _hasHydrated: val }),

            updateLayout: (newVisibleLayout) => {
                const { config } = get();

                // Clean layout items for comparison (only keep necessary fields)
                const cleanLayoutItem = (item: LayoutItem) => ({
                    i: item.i,
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h
                });

                // Check if layout actually changed
                const currentLayoutMap = new Map(config.layout.map(l => [l.i, cleanLayoutItem(l)]));
                let hasChanges = false;

                // Check visible items
                for (const newItem of newVisibleLayout) {
                    const currentItem = currentLayoutMap.get(newItem.i);
                    if (!currentItem) {
                        hasChanges = true; // New item? Shouldn't happen in updateLayout usually
                        break;
                    }
                    if (JSON.stringify(cleanLayoutItem(newItem)) !== JSON.stringify(currentItem)) {
                        hasChanges = true;
                        break;
                    }
                }

                // If checking all items is cleaner:
                // Merge new visible layout with existing hidden items to preserve their positions
                const hiddenItems = config.layout.filter(l =>
                    !newVisibleLayout.find(nl => nl.i === l.i)
                );
                const mergedLayout = [...newVisibleLayout, ...hiddenItems];

                if (!hasChanges && mergedLayout.length === config.layout.length) {
                    return; // No changes detected
                }

                const newConfig = {
                    ...config,
                    layout: mergedLayout,
                    updatedAt: new Date().toISOString()
                };
                set({ config: newConfig, hasUnsavedChanges: true });
            },

            applyPreset: (preset) => {
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

                set({ config: newConfig, hasUnsavedChanges: true });
            },

            toggleWidget: (widgetId, enabled) => {
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

                set({ config: newConfig, hasUnsavedChanges: true });
            },

            updateWidgetSettings: (widgetId, settings) => {
                const { config } = get();
                const newWidgets = config.widgets.map(w =>
                    w.id === widgetId ? { ...w, settings: { ...w.settings, ...settings } } : w
                );

                set({
                    config: { ...config, widgets: newWidgets, updatedAt: new Date().toISOString() },
                    hasUnsavedChanges: true
                });
            },

            updateGlobalSettings: (settings) => {
                const { config } = get();
                set({
                    config: { ...config, ...settings, updatedAt: new Date().toISOString() },
                    hasUnsavedChanges: true
                });
            },

            loadFromFirestore: async (orgId, userId) => {
                if (!orgId || !userId) {
                    set({ isLoading: false });
                    return;
                }

                set({ isLoading: true });
                try {
                    // Changed path to users/{userId}/orgSettings/{orgId} to avoid permission issues
                    const docRef = doc(db, "users", userId, "orgSettings", orgId);
                    const snap = await getDoc(docRef);

                    if (snap.exists() && snap.data().dashboardLayout) {
                        const remoteData = snap.data().dashboardLayout as DashboardConfig;
                        const loadedConfig = {
                            ...DEFAULT_CONFIG,
                            ...remoteData,
                        };
                        set({
                            config: loadedConfig,
                            savedConfig: loadedConfig,
                            hasUnsavedChanges: false
                        });
                    } else {
                        // No remote data - use defaults, mark as unsaved so user can save
                        const { config } = get();
                        set({
                            savedConfig: null,
                            hasUnsavedChanges: false // Don't prompt for brand new users
                        });
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
                    // Changed path to users/{userId}/orgSettings/{orgId} to avoid permission issues
                    const docRef = doc(db, "users", userId, "orgSettings", orgId);
                    await setDoc(docRef, {
                        dashboardLayout: config
                    }, { merge: true });

                    // After successful save, update savedConfig and clear unsaved flag
                    set({
                        savedConfig: config,
                        hasUnsavedChanges: false,
                        isSaving: false
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
                if (savedConfig) {
                    set({
                        config: savedConfig,
                        hasUnsavedChanges: false,
                        isEditing: false
                    });
                } else {
                    // No saved config, reset to defaults
                    set({
                        config: DEFAULT_CONFIG,
                        hasUnsavedChanges: false,
                        isEditing: false
                    });
                }
            }
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({ config: state.config }), // Only persist config to localStorage
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            }
        }
    )
);
