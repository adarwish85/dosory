"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
    Edit3, Save, RotateCcw, Layout as LayoutIcon,
    Palette, SlidersHorizontal, Plus, Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import {
    useDashboardStore,
    type WidgetId,
    type WidgetStyle,
    type DataDensity,
    type LayoutItem,
    type LayoutPreset
} from "@/lib/stores/dashboard-store";
import { BaseWidget } from "./BaseWidget";

// Import all widgets
import { RevenueWidget } from "../widgets/RevenueWidget";
import { TasksWidget } from "../widgets/TasksWidget";
import { ActivityWidget } from "../widgets/ActivityWidget";
import { PipelineWidget } from "../widgets/PipelineWidget";
import { QuickActionsWidget } from "../widgets/QuickActionsWidget";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { CustomersWidget } from "../widgets/CustomersWidget";
import { PerformanceWidget } from "../widgets/PerformanceWidget";

// Dynamic import GridWrapper to avoid SSR issues with react-grid-layout
const GridWrapper = dynamic(
    () => import("./GridWrapper").then((mod) => mod.GridWrapper),
    {
        ssr: false,
        loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
    }
);

// Widget metadata for catalog
const WIDGET_CATALOG: Record<WidgetId, { title: string; description: string; icon: string }> = {
    revenue: { title: "Revenue", description: "Revenue chart and summary", icon: "💰" },
    tasks: { title: "Tasks", description: "My tasks and overdue items", icon: "✅" },
    activity: { title: "Activity", description: "Team activity feed", icon: "📢" },
    pipeline: { title: "Pipeline", description: "Sales pipeline funnel", icon: "📊" },
    quickActions: { title: "Quick Actions", description: "Shortcuts to common tasks", icon: "⚡" },
    calendar: { title: "Calendar", description: "Mini calendar view", icon: "📅" },
    customers: { title: "Customers", description: "Recent and top customers", icon: "👥" },
    performance: { title: "Performance", description: "Team leaderboard", icon: "🏆" },
};

// Widget component mapping
const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType<any>> = {
    revenue: RevenueWidget,
    tasks: TasksWidget,
    activity: ActivityWidget,
    pipeline: PipelineWidget,
    quickActions: QuickActionsWidget,
    calendar: CalendarWidget,
    customers: CustomersWidget,
    performance: PerformanceWidget,
};

interface DashboardGridProps {
    className?: string;
}

export function DashboardGrid({ className }: DashboardGridProps) {
    const { profile } = useUserProfile();
    const [showCatalog, setShowCatalog] = useState(false);

    // Connect to Zustand store
    const {
        config,
        isEditing,
        isLoading,
        isSaving,
        setEditMode,
        updateLayout,
        applyPreset,
        toggleWidget,
        updateWidgetSettings,
        updateGlobalSettings,
        loadFromFirestore,
        syncToFirestore
    } = useDashboardStore();

    // Get orgId/userId from user profile (not useAuth - Firebase Auth doesn't have orgId)
    const orgId = profile?.orgId;
    const userId = profile?.uid;

    // Load layout on mount
    useEffect(() => {
        if (orgId && userId) {
            loadFromFirestore(orgId, userId);
        }
    }, [orgId, userId, loadFromFirestore]);

    // Sync to Firestore when editing stops or explicit save
    // We'll also autosave on changes via store, but this is explicit
    const handleSave = useCallback(async () => {
        if (orgId && userId) {
            await syncToFirestore(orgId, userId);
            setEditMode(false);
        }
    }, [orgId, userId, syncToFirestore, setEditMode]);


    const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
        updateLayout(newLayout);
    }, [updateLayout]);

    const handleDragResizeStop = useCallback((newLayout: LayoutItem[]) => {
        updateLayout(newLayout);
        if (orgId && userId) {
            syncToFirestore(orgId, userId);
        }
    }, [updateLayout, orgId, userId, syncToFirestore]);

    const handlePresetChange = useCallback((preset: string) => {
        applyPreset(preset as LayoutPreset);
        if (orgId && userId) syncToFirestore(orgId, userId);
    }, [applyPreset, orgId, userId, syncToFirestore]);

    const handleStyleChange = useCallback((style: string) => {
        updateGlobalSettings({ widgetStyle: style as WidgetStyle });
        if (orgId && userId) syncToFirestore(orgId, userId);
    }, [updateGlobalSettings, orgId, userId, syncToFirestore]);

    const handleDensityChange = useCallback((density: string) => {
        updateGlobalSettings({ dataDensity: density as DataDensity });
        if (orgId && userId) syncToFirestore(orgId, userId);
    }, [updateGlobalSettings, orgId, userId, syncToFirestore]);

    // Calculate enabled widgets and their layout
    // FORCE STATIC when not in edit mode
    const enabledWidgets = useMemo(() => config.widgets.filter(w => w.enabled), [config.widgets]);
    const displayLayout = useMemo(() => {
        return config.layout
            .filter(l => enabledWidgets.some(w => w.id === l.i));
    }, [config.layout, enabledWidgets]);

    // Get greeting based on time of day
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 17) return "Good afternoon";
        if (hour >= 17 && hour < 21) return "Good evening";
        return "Working late";
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{greeting}! 👋</h1>
                    <p className="text-sm text-gray-500">Here's what's happening with your business today.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Preset Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <LayoutIcon className="h-4 w-4" />
                                <span className="capitalize">{config.preset}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Layout Presets</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={config.preset} onValueChange={handlePresetChange}>
                                <DropdownMenuRadioItem value="balanced">Balanced</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="sales">Sales Focus</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="projects">Projects Focus</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Style Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Palette className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Widget Style</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={config.widgetStyle} onValueChange={handleStyleChange}>
                                <DropdownMenuRadioItem value="minimal">Minimal</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="card">Card</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="gradient">Gradient</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Data Density</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={config.dataDensity} onValueChange={handleDensityChange}>
                                <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Edit Mode Toggle */}
                    <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={isEditing ? handleSave : () => setEditMode(true)}
                    >
                        {isEditing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                        {isEditing ? "Done" : "Edit"}
                    </Button>

                    {/* Add Widget Button (Edit Mode Only) */}
                    {isEditing && (
                        <DropdownMenu open={showCatalog} onOpenChange={setShowCatalog}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Widget
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>Widget Catalog</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(WIDGET_CATALOG).map(([id, meta]) => {
                                    const widget = config.widgets.find(w => w.id === id);
                                    const isEnabled = widget?.enabled ?? false;
                                    return (
                                        <DropdownMenuItem
                                            key={id}
                                            onClick={() => {
                                                toggleWidget(id as WidgetId, !isEnabled);
                                                if (orgId && userId) syncToFirestore(orgId, userId);
                                            }}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{meta.icon}</span>
                                                <div>
                                                    <div className="font-medium">{meta.title}</div>
                                                    <div className="text-xs text-gray-500">{meta.description}</div>
                                                </div>
                                            </div>
                                            {isEnabled && <span className="text-green-600">✓</span>}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Edit Mode Indicator */}
            {isEditing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="text-sm font-medium">Edit Mode: Drag widgets to rearrange, resize corners to adjust size</span>
                    </div>
                    {isSaving && <span className="text-xs text-blue-600">Saving...</span>}
                </div>
            )}

            {/* Widget Grid */}
            <GridWrapper
                className="layout"
                layout={displayLayout}
                cols={12}
                rowHeight={80}
                onLayoutChange={handleLayoutChange}
                onDragStop={handleDragResizeStop}
                onResizeStop={handleDragResizeStop}
                isDraggable={isEditing}
                isResizable={isEditing}
                draggableHandle=".widget-drag-handle"
                margin={[16, 16]}
                containerPadding={[0, 0]}
            >
                {enabledWidgets.map((widget) => {
                    const WidgetComponent = WIDGET_COMPONENTS[widget.id];
                    // We render based on enabledWidgets, so no need to find layoutItem here to return null
                    // GridWrapper handles positioning based on key

                    if (!WidgetComponent) return null;

                    return (
                        <div key={widget.id}>
                            <BaseWidget
                                id={widget.id}
                                title={WIDGET_CATALOG[widget.id].title}
                                icon={WIDGET_CATALOG[widget.id].icon}
                                settings={widget.settings}
                                style={config.widgetStyle}
                                density={config.dataDensity}
                                editMode={isEditing}
                                onSettingsChange={(settings) => {
                                    updateWidgetSettings(widget.id, settings);
                                    if (orgId && userId) syncToFirestore(orgId, userId);
                                }}
                                onRemove={() => {
                                    toggleWidget(widget.id, false);
                                    if (orgId && userId) syncToFirestore(orgId, userId);
                                }}
                            >
                                <WidgetComponent settings={widget.settings} density={config.dataDensity} />
                            </BaseWidget>
                        </div>
                    );
                })}
            </GridWrapper>

            {/* Empty State */}
            {enabledWidgets.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No widgets added yet</h3>
                    <p className="text-gray-500 mb-4">Click "Edit" and then "Add Widget" to customize your dashboard</p>
                    <Button onClick={() => { setEditMode(true); setShowCatalog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Widget
                    </Button>
                </div>
            )}
        </div>
    );
}
