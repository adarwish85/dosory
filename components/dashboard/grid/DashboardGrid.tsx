"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, Palette, Plus, Loader2, X, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { toast } from "sonner";
import {
    useDashboardStore,
    type WidgetId,
    type WidgetStyle,
    type DataDensity,
    type WidgetSettings,
} from "@/lib/stores/dashboard-store";
import { BaseWidget } from "./BaseWidget";

// Import widget components
import { TasksWidget } from "../widgets/TasksWidget";
import { ActivityWidget } from "../widgets/ActivityWidget";
import { PipelineWidget } from "../widgets/PipelineWidget";
import { QuickActionsWidget } from "../widgets/QuickActionsWidget";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { CustomersWidget } from "../widgets/CustomersWidget";
import { PerformanceWidget } from "../widgets/PerformanceWidget";
import { RevenueWidget } from "../widgets/RevenueWidget";

// Widget catalog
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

// Widget components mapping
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

// Fixed widget order (determines grid position)
const WIDGET_ORDER: WidgetId[] = [
    "revenue",
    "tasks",
    "activity",
    "customers",
    "pipeline",
    "quickActions",
    "calendar",
    "performance",
];

interface DashboardGridProps {
    className?: string;
}

export function DashboardGrid({ className }: DashboardGridProps) {
    const { profile } = useUserProfile();
    const [showWidgetMenu, setShowWidgetMenu] = useState(false);

    const {
        config,
        isLoading,
        isSaving,
        hasUnsavedChanges,
        toggleWidget,
        updateGlobalSettings,
        loadFromFirestore,
        saveToFirestore,
        discardChanges,
    } = useDashboardStore();

    const orgId = profile?.orgId;
    const userId = profile?.uid;

    // Load settings on mount
    useEffect(() => {
        if (orgId && userId) {
            loadFromFirestore(orgId, userId);
        }
    }, [orgId, userId, loadFromFirestore]);

    // Save handler
    const handleSave = useCallback(async () => {
        if (orgId && userId) {
            const success = await saveToFirestore(orgId, userId);
            if (success) {
                toast.success("Dashboard settings saved!");
            } else {
                toast.error("Failed to save settings");
            }
        }
    }, [orgId, userId, saveToFirestore]);

    // Discard handler
    const handleDiscard = useCallback(() => {
        discardChanges();
        toast.info("Changes discarded");
    }, [discardChanges]);

    // Style change handler
    const handleStyleChange = useCallback(
        (style: string) => {
            updateGlobalSettings({ widgetStyle: style as WidgetStyle });
        },
        [updateGlobalSettings]
    );

    // Density change handler
    const handleDensityChange = useCallback(
        (density: string) => {
            updateGlobalSettings({ dataDensity: density as DataDensity });
        },
        [updateGlobalSettings]
    );

    // Get visible widgets in fixed order
    const visibleWidgets = WIDGET_ORDER.filter((id) => config.visibleWidgets[id]);

    // Greeting based on time
    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 17) return "Good afternoon";
        if (hour >= 17 && hour < 21) return "Good evening";
        return "Working late";
    })();

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
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-orange-600">• Unsaved</span>
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleDiscard}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Discard
                            </Button>
                        </div>
                    )}

                    {/* Widget Toggle Menu */}
                    <DropdownMenu open={showWidgetMenu} onOpenChange={setShowWidgetMenu}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Widgets
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>Toggle Widgets</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {WIDGET_ORDER.map((id) => {
                                const meta = WIDGET_CATALOG[id];
                                const isVisible = config.visibleWidgets[id];
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={id}
                                        checked={isVisible}
                                        onCheckedChange={(checked) => toggleWidget(id, checked)}
                                    >
                                        <span className="mr-2">{meta.icon}</span>
                                        <div className="flex-1">
                                            <div className="font-medium">{meta.title}</div>
                                            <div className="text-xs text-gray-500">{meta.description}</div>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Style/Density Menu */}
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
                </div>
            </div>

            {/* CSS Grid Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleWidgets.map((widgetId) => {
                    const WidgetComponent = WIDGET_COMPONENTS[widgetId];
                    const meta = WIDGET_CATALOG[widgetId];
                    const settings = config.widgetSettings[widgetId] || {};

                    if (!WidgetComponent) return null;

                    // Determine grid span based on widget type
                    const isLarge = widgetId === "revenue" || widgetId === "activity";
                    const spanClass = isLarge ? "lg:col-span-2" : "";

                    return (
                        <div key={widgetId} className={spanClass}>
                            <BaseWidget
                                id={widgetId}
                                title={meta.title}
                                icon={meta.icon}
                                settings={settings}
                                style={config.widgetStyle}
                                density={config.dataDensity}
                                editMode={false}
                                onRemove={() => toggleWidget(widgetId, false)}
                            >
                                <WidgetComponent settings={settings} density={config.dataDensity} />
                            </BaseWidget>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {visibleWidgets.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No widgets visible</h3>
                    <p className="text-gray-500 mb-4">
                        Click &quot;Widgets&quot; to toggle which widgets appear on your dashboard
                    </p>
                    <Button onClick={() => setShowWidgetMenu(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Show Widgets
                    </Button>
                </div>
            )}
        </div>
    );
}
