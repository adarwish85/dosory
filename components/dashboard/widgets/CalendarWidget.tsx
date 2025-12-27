"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek
} from "date-fns";
import type { WidgetSettings, DataDensity } from "@/lib/hooks/use-dashboard-layout";

interface CalendarWidgetProps {
    settings: WidgetSettings;
    density: DataDensity;
}

export function CalendarWidget({ settings, density }: CalendarWidgetProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const today = new Date();

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    return (
        <div className="h-full flex flex-col">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-gray-900">
                    {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 flex-1">
                {days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, today);

                    return (
                        <div
                            key={day.toISOString()}
                            className={`
                                flex items-center justify-center text-xs rounded-md aspect-square
                                ${!isCurrentMonth ? "text-gray-300" : "text-gray-700"}
                                ${isToday ? "bg-blue-600 text-white font-bold" : "hover:bg-gray-100"}
                            `}
                        >
                            {format(day, "d")}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
