"use client";

import React, { useState, useCallback, useMemo } from "react";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactGridLayout = require("react-grid-layout");
const { WidthProvider } = ReactGridLayout;
const GridLayout = ReactGridLayout.default || ReactGridLayout;
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Button } from "@/components/ui/button";
import {
    Edit3, Save, RotateCcw, Layout as LayoutIcon,
    Palette, SlidersHorizontal, Plus
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
import {
    useDashboardLayout,
    type LayoutPreset,
    type WidgetId,
    type WidgetStyle,
    type DataDensity,
    type LayoutItem,
} from "@/lib/hooks/use-dashboard-layout";
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

const ResponsiveGridLayout = WidthProvider(GridLayout);

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
    const [editMode, setEditMode] = useState(false);
    const [showCatalog, setShowCatalog] = useState(false);

    const {
        layout,
        widgets,
        enabledWidgets,
        config,
        loading,
        saving,
        saveLayout,
        applyPreset,
        toggleWidget,
        updateWidgetSettings,
        updateGlobalSettings,
        presets,
    } = useDashboardLayout();

    const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
        if (editMode) {
            saveLayout(newLayout);
        }
    }, [editMode, saveLayout]);

    const handlePresetChange = useCallback((preset: string) => {
        applyPreset(preset as LayoutPreset);
    }, [applyPreset]);

    const handleStyleChange = useCallback((style: string) => {
        updateGlobalSettings({ widgetStyle: style as WidgetStyle });
    }, [updateGlobalSettings]);

    const handleDensityChange = useCallback((density: string) => {
        updateGlobalSettings({ dataDensity: density as DataDensity });
    }, [updateGlobalSettings]);

    // Get greeting based on time of day
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 17) return "Good afternoon";
        if (hour >= 17 && hour < 21) return "Good evening";
        return "Working late";
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
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
                        variant={editMode ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setEditMode(!editMode)}
                    >
                        {editMode ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                        {editMode ? "Done" : "Edit"}
                    </Button>

                    {/* Add Widget Button (Edit Mode Only) */}
                    {editMode && (
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
                                    const widget = widgets.find(w => w.id === id);
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

            {/* Edit Mode Indicator */}
            {editMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="text-sm font-medium">Edit Mode: Drag widgets to rearrange, resize corners to adjust size</span>
                    </div>
                    {saving && <span className="text-xs text-blue-600">Saving...</span>}
                </div>
            )}

            {/* Widget Grid */}
            <ResponsiveGridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={80}
                onLayoutChange={handleLayoutChange}
                isDraggable={editMode}
                isResizable={editMode}
                draggableHandle=".widget-drag-handle"
                margin={[16, 16]}
                containerPadding={[0, 0]}
            >
                {enabledWidgets.map((widget) => {
                    const WidgetComponent = WIDGET_COMPONENTS[widget.id];
                    const layoutItem = layout.find(l => l.i === widget.id);

                    if (!WidgetComponent || !layoutItem) return null;

                    return (
                        <div key={widget.id}>
                            <BaseWidget
                                id={widget.id}
                                title={WIDGET_CATALOG[widget.id].title}
                                icon={WIDGET_CATALOG[widget.id].icon}
                                settings={widget.settings}
                                style={config.widgetStyle}
                                density={config.dataDensity}
                                editMode={editMode}
                                onSettingsChange={(settings) => updateWidgetSettings(widget.id, settings)}
                                onRemove={() => toggleWidget(widget.id, false)}
                            >
                                <WidgetComponent settings={widget.settings} density={config.dataDensity} />
                            </BaseWidget>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>

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
