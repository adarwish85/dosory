"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
    Edit3,
    Save,
    RotateCcw,
    Layout as LayoutIcon,
    Palette,
    SlidersHorizontal,
    Plus,
    Loader2,
    X,
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
import { toast } from "sonner";
import {
    useDashboardStore,
    type WidgetId,
    type WidgetStyle,
    type DataDensity,
    type LayoutItem,
    type LayoutPreset,
} from "@/lib/stores/dashboard-store";
import { BaseWidget } from "./BaseWidget";

// Import lightweight widgets directly
import { TasksWidget } from "../widgets/TasksWidget";
import { ActivityWidget } from "../widgets/ActivityWidget";
import { PipelineWidget } from "../widgets/PipelineWidget";
import { QuickActionsWidget } from "../widgets/QuickActionsWidget";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { CustomersWidget } from "../widgets/CustomersWidget";
import { PerformanceWidget } from "../widgets/PerformanceWidget";

// Dynamic import for heavy chart widgets (reduces initial bundle by ~40KB)
const RevenueWidget = dynamic(() => import("../widgets/RevenueWidget").then((mod) => mod.RevenueWidget), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    ),
});

// Dynamic import GridWrapper to avoid SSR issues with react-grid-layout
const GridWrapper = dynamic(() => import("./GridWrapper").then((mod) => mod.GridWrapper), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
    ),
});

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
const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType<{ settings: WidgetSettings; density: DataDensity }>> = {
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
        hasUnsavedChanges,
        setEditMode,
        updateLayout,
        applyPreset,
        toggleWidget,
        updateWidgetSettings,
        updateGlobalSettings,
        loadFromFirestore,
        saveToFirestore,
        discardChanges,
    } = useDashboardStore();

    // Get orgId/userId from user profile
    const orgId = profile?.orgId;
    const userId = profile?.uid;

    // Load layout on mount
    useEffect(() => {
        if (orgId && userId) {
            loadFromFirestore(orgId, userId);
        }
    }, [orgId, userId, loadFromFirestore]);

    // Explicit save handler
    const handleSave = useCallback(async () => {
        if (orgId && userId) {
            const success = await saveToFirestore(orgId, userId);
            if (success) {
                toast.success("Dashboard layout saved!");
                setEditMode(false);
            } else {
                toast.error("Failed to save layout");
            }
        }
    }, [orgId, userId, saveToFirestore, setEditMode]);

    // Discard changes handler
    const handleDiscard = useCallback(() => {
        discardChanges();
        toast.info("Changes discarded");
    }, [discardChanges]);

    // Cancel edit mode (with confirmation if unsaved)
    const handleCancelEdit = useCallback(() => {
        if (hasUnsavedChanges) {
            if (confirm("You have unsaved changes. Discard them?")) {
                handleDiscard();
            }
        } else {
            setEditMode(false);
        }
    }, [hasUnsavedChanges, handleDiscard, setEditMode]);

    const handleLayoutChange = useCallback(
        (newLayout: LayoutItem[]) => {
            if (!isEditing) return;
            updateLayout(newLayout);
        },
        [updateLayout, isEditing]
    );

    const handleDragResizeStop = useCallback(
        (newLayout: LayoutItem[]) => {
            updateLayout(newLayout);
            // No auto-sync - user must explicitly save
        },
        [updateLayout]
    );

    const handlePresetChange = useCallback(
        (preset: string) => {
            applyPreset(preset as LayoutPreset);
            // No auto-sync - user must explicitly save
        },
        [applyPreset]
    );

    const handleStyleChange = useCallback(
        (style: string) => {
            updateGlobalSettings({ widgetStyle: style as WidgetStyle });
            // No auto-sync - user must explicitly save
        },
        [updateGlobalSettings]
    );

    const handleDensityChange = useCallback(
        (density: string) => {
            updateGlobalSettings({ dataDensity: density as DataDensity });
            // No auto-sync - user must explicitly save
        },
        [updateGlobalSettings]
    );

    // Calculate enabled widgets and their layout
    const enabledWidgets = useMemo(() => config.widgets.filter((w) => w.enabled), [config.widgets]);
    const displayLayout = useMemo(() => {
        return config.layout.filter((l) => enabledWidgets.some((w) => w.id === l.i));
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
                    <h1 className="text-2xl font-bold text-gray-900">
                        {greeting},{" "}
                        {profile?.firstName ||
                            (profile?.displayName?.includes(" ") ? profile.displayName.split(" ")[0] : "there")}
                        ! 👋
                    </h1>
                    <p className="text-sm text-gray-500">Here&apos;s what&apos;s happening with your business today.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Unsaved Changes Indicator */}
                    {hasUnsavedChanges && !isEditing && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-orange-600">Unsaved changes</span>
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleDiscard}>
                                Discard
                            </Button>
                        </div>
                    )}

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
                    {!isEditing ? (
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditMode(true)}>
                            <Edit3 className="h-4 w-4" />
                            Edit
                        </Button>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}

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
                                    const widget = config.widgets.find((w) => w.id === id);
                                    const isEnabled = widget?.enabled ?? false;
                                    return (
                                        <DropdownMenuItem
                                            key={id}
                                            onClick={() => toggleWidget(id as WidgetId, !isEnabled)}
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

            {/* Edit Mode Banner with Save/Discard */}
            {isEditing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            Edit Mode: Drag widgets to rearrange, resize corners to adjust size
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasUnsavedChanges && <span className="text-xs text-orange-600 mr-2">• Unsaved changes</span>}
                        <Button size="sm" variant="ghost" onClick={handleDiscard} disabled={!hasUnsavedChanges}>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Discard
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                                <Save className="h-4 w-4 mr-1" />
                            )}
                            Save Layout
                        </Button>
                    </div>
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
                isResizable={false}
                draggableHandle=".widget-drag-handle"
                margin={[16, 16]}
                containerPadding={[0, 0]}
            >
                {enabledWidgets.map((widget) => {
                    const WidgetComponent = WIDGET_COMPONENTS[widget.id];

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
                                onSettingsChange={(settings) => updateWidgetSettings(widget.id, settings)}
                                onRemove={() => toggleWidget(widget.id, false)}
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
                    <p className="text-gray-500 mb-4">
                        Click &quot;Edit&quot; and then &quot;Add Widget&quot; to customize your dashboard
                    </p>
                    <Button
                        onClick={() => {
                            setEditMode(true);
                            setShowCatalog(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Widget
                    </Button>
                </div>
            )}
        </div>
    );
}
