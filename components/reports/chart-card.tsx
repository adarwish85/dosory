"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface ChartCardProps {
    title: string;
    description?: string;
    loading?: boolean;
    empty?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
    type: "line" | "bar" | "pie" | "area" | "composed";
    series?: { key: string; color: string; name?: string }[];
    height?: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function ChartCard({ title, loading, empty, data, type, series = [], height = 350 }: ChartCardProps) {
    const { t } = useTranslation();
    if (loading) {
        return <Skeleton className={`w-full h-[${height}px] rounded-xl`} />;
    }

    if (empty || !data || data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-base font-medium">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center" style={{ height }}>
                    <p className="text-muted-foreground text-sm">{t("reports.chart.noData")}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: "100%", height }}>
                    <ResponsiveContainer>
                        {type === "line" ? (
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip />
                                <Legend />
                                {series.map((s, i) => (
                                    <Line
                                        key={s.key}
                                        type="monotone"
                                        dataKey={s.key}
                                        stroke={s.color || COLORS[i % COLORS.length]}
                                        strokeWidth={2}
                                        name={s.name || s.key}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        ) : type === "bar" ? (
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: "transparent" }} />
                                <Legend />
                                {series.map((s, i) => (
                                    <Bar
                                        key={s.key}
                                        dataKey={s.key}
                                        fill={s.color || COLORS[i % COLORS.length]}
                                        name={s.name || s.key}
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        ) : (
                            // Default fallback/Pie
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
