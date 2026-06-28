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
import { useTranslation } from "@/lib/i18n";
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

// Widget catalog (titleKey/descriptionKey resolved via t() at render)
const WIDGET_CATALOG: Record<WidgetId, { titleKey: string; descriptionKey: string; icon: string }> = {
    revenue: { titleKey: "dashboard.grid.widget.revenue.title", descriptionKey: "dashboard.grid.widget.revenue.description", icon: "💰" },
    tasks: { titleKey: "dashboard.grid.widget.tasks.title", descriptionKey: "dashboard.grid.widget.tasks.description", icon: "✅" },
    activity: { titleKey: "dashboard.grid.widget.activity.title", descriptionKey: "dashboard.grid.widget.activity.description", icon: "📢" },
    pipeline: { titleKey: "dashboard.grid.widget.pipeline.title", descriptionKey: "dashboard.grid.widget.pipeline.description", icon: "📊" },
    quickActions: { titleKey: "dashboard.grid.widget.quickActions.title", descriptionKey: "dashboard.grid.widget.quickActions.description", icon: "⚡" },
    calendar: { titleKey: "dashboard.grid.widget.calendar.title", descriptionKey: "dashboard.grid.widget.calendar.description", icon: "📅" },
    customers: { titleKey: "dashboard.grid.widget.customers.title", descriptionKey: "dashboard.grid.widget.customers.description", icon: "👥" },
    performance: { titleKey: "dashboard.grid.widget.performance.title", descriptionKey: "dashboard.grid.widget.performance.description", icon: "🏆" },
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
    const { t } = useTranslation();
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
                toast.success(t("dashboard.grid.savedToast"));
            } else {
                toast.error(t("dashboard.grid.saveFailedToast"));
            }
        }
    }, [orgId, userId, saveToFirestore, t]);

    // Discard handler
    const handleDiscard = useCallback(() => {
        discardChanges();
        toast.info(t("dashboard.grid.discardedToast"));
    }, [discardChanges, t]);

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
        if (hour >= 5 && hour < 12) return t("dashboard.grid.greeting.morning");
        if (hour >= 12 && hour < 17) return t("dashboard.grid.greeting.afternoon");
        if (hour >= 17 && hour < 21) return t("dashboard.grid.greeting.evening");
        return t("dashboard.grid.greeting.late");
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
                            (profile?.displayName?.includes(" ")
                                ? profile.displayName.split(" ")[0]
                                : t("dashboard.grid.there"))}
                        ! 👋
                    </h1>
                    <p className="text-sm text-gray-500">{t("dashboard.grid.subtitle")}</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Unsaved Changes Indicator */}
                    {hasUnsavedChanges && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-orange-600">• {t("dashboard.grid.unsaved")}</span>
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-1" />
                                )}
                                {t("common.save")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleDiscard}>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                {t("dashboard.grid.discard")}
                            </Button>
                        </div>
                    )}

                    {/* Widget Toggle Menu */}
                    <DropdownMenu open={showWidgetMenu} onOpenChange={setShowWidgetMenu}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                {t("dashboard.grid.widgets")}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>{t("dashboard.grid.toggleWidgets")}</DropdownMenuLabel>
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
                                            <div className="font-medium">{t(meta.titleKey)}</div>
                                            <div className="text-xs text-gray-500">{t(meta.descriptionKey)}</div>
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
                            <DropdownMenuLabel>{t("dashboard.grid.widgetStyle")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={config.widgetStyle} onValueChange={handleStyleChange}>
                                <DropdownMenuRadioItem value="minimal">{t("dashboard.grid.style.minimal")}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="card">{t("dashboard.grid.style.card")}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="gradient">{t("dashboard.grid.style.gradient")}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t("dashboard.grid.dataDensity")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={config.dataDensity} onValueChange={handleDensityChange}>
                                <DropdownMenuRadioItem value="compact">{t("dashboard.grid.density.compact")}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="comfortable">{t("dashboard.grid.density.comfortable")}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="spacious">{t("dashboard.grid.density.spacious")}</DropdownMenuRadioItem>
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
                                title={t(meta.titleKey)}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("dashboard.grid.emptyTitle")}</h3>
                    <p className="text-gray-500 mb-4">{t("dashboard.grid.emptyDescription")}</p>
                    <Button onClick={() => setShowWidgetMenu(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("dashboard.grid.showWidgets")}
                    </Button>
                </div>
            )}
        </div>
    );
}
