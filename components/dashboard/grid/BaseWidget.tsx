"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Settings, GripVertical } from "lucide-react";
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
import type { WidgetId, WidgetSettings, WidgetStyle, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface BaseWidgetProps {
    id: WidgetId;
    title: string;
    icon?: string;
    settings: WidgetSettings;
    style: WidgetStyle;
    density: DataDensity;
    editMode: boolean;
    onSettingsChange: (settings: Partial<WidgetSettings>) => void;
    onRemove: () => void;
    children: React.ReactNode;
}

const DENSITY_PADDING: Record<DataDensity, string> = {
    compact: "p-3",
    comfortable: "p-4",
    spacious: "p-6",
};

const STYLE_CLASSES: Record<WidgetStyle, { card: string; header: string }> = {
    minimal: {
        card: "border border-gray-100 shadow-none bg-white",
        header: "bg-transparent border-b border-gray-100",
    },
    card: {
        card: "border border-gray-200 shadow-md bg-white rounded-xl",
        header: "bg-gray-50/50 border-b border-gray-100 rounded-t-xl",
    },
    gradient: {
        card: "border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 rounded-xl",
        header: "bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-t-xl",
    },
};

export function BaseWidget({
    id,
    title,
    icon,
    settings,
    style,
    density,
    editMode,
    onSettingsChange,
    onRemove,
    children,
}: BaseWidgetProps) {
    const styleClasses = STYLE_CLASSES[style];
    const isGradient = style === "gradient";

    return (
        <Card className={cn(
            "h-full overflow-hidden flex flex-col transition-all duration-200 ease-out",
            "hover:shadow-lg hover:-translate-y-0.5",
            editMode && "ring-2 ring-blue-500/20 cursor-move",
            styleClasses.card
        )}>
            {/* Widget Header */}
            <CardHeader className={cn(
                "flex flex-row items-center justify-between py-2 px-3",
                styleClasses.header
            )}>
                <div className="flex items-center gap-2">
                    {editMode && (
                        <div className="widget-drag-handle cursor-move">
                            <GripVertical className={cn("h-4 w-4", isGradient ? "text-white/70" : "text-gray-400")} />
                        </div>
                    )}
                    {icon && <span className="text-lg">{icon}</span>}
                    <h3 className={cn(
                        "font-semibold text-sm",
                        isGradient ? "text-white" : "text-gray-900"
                    )}>
                        {title}
                    </h3>
                </div>

                <div className="flex items-center gap-1">
                    {/* Settings Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7",
                                    isGradient ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Widget Settings</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* Date Range Setting */}
                            <DropdownMenuLabel className="text-xs text-gray-500">Date Range</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={settings.dateRange || "month"}
                                onValueChange={(v) => onSettingsChange({ dateRange: v as WidgetSettings["dateRange"] })}
                            >
                                <DropdownMenuRadioItem value="week">This Week</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="month">This Month</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="quarter">This Quarter</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="year">This Year</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>

                            <DropdownMenuSeparator />

                            {/* Show Chart Toggle */}
                            <DropdownMenuItem onClick={() => onSettingsChange({ showChart: !settings.showChart })}>
                                {settings.showChart ? "Hide Chart" : "Show Chart"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Remove Button (Edit Mode Only) */}
                    {editMode && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7",
                                isGradient ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-red-500"
                            )}
                            onClick={onRemove}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            {/* Widget Content */}
            <CardContent className={cn("flex-1 overflow-auto", DENSITY_PADDING[density])}>
                {children}
            </CardContent>
        </Card>
    );
}
