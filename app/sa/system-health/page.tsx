"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SystemHealthStatus } from "@/lib/types/super-admin";
import {
    Activity,
    Server,
    Database,
    Shield,
    HardDrive,
    Mail,
    CheckCircle,
    AlertTriangle,
    XCircle,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saFetch } from "@/lib/api/saFetch";

const statusConfig: Record<string, { color: string; icon: React.ElementType; bg: string }> = {
    healthy: { color: "text-green-600", icon: CheckCircle, bg: "bg-green-100" },
    degraded: { color: "text-yellow-600", icon: AlertTriangle, bg: "bg-yellow-100" },
    down: { color: "text-red-600", icon: XCircle, bg: "bg-red-100" },
};

const serviceIcons: Record<string, React.ElementType> = {
    API: Server,
    Database: Database,
    Auth: Shield,
    Storage: HardDrive,
    Email: Mail,
};

export default function SystemHealthPage() {
    const [services, setServices] = useState<SystemHealthStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHealth = async () => {
        try {
            const data = await saFetch<{ services: SystemHealthStatus[] }>("/api/sa/system-health");
            setServices(data.services || []);
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHealth();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchHealth();
    };

    const overallStatus = services.some((s) => s.status === "down")
        ? "down"
        : services.some((s) => s.status === "degraded")
          ? "degraded"
          : "healthy";

    const overallConfig = statusConfig[overallStatus];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
                    <p className="text-muted-foreground">Monitor platform services and infrastructure</p>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Overall Status */}
            <Card className={overallConfig.bg}>
                <CardContent className="flex items-center gap-4 py-6">
                    {loading ? (
                        <>
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div
                                className={`h-12 w-12 rounded-full flex items-center justify-center ${overallConfig.bg}`}
                            >
                                <overallConfig.icon className={`h-6 w-6 ${overallConfig.color}`} />
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${overallConfig.color}`}>
                                    System {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                                </h2>
                                <p className="text-muted-foreground">
                                    {overallStatus === "healthy"
                                        ? "All services operational"
                                        : overallStatus === "degraded"
                                          ? "Some services experiencing issues"
                                          : "Critical services down"}
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-red-600">{error}</CardContent>
                </Card>
            )}

            {/* Services Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-5 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))
                ) : services.length === 0 ? (
                    <Card className="md:col-span-3">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Activity className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No health data available</p>
                        </CardContent>
                    </Card>
                ) : (
                    services.map((service) => {
                        const config = statusConfig[service.status];
                        const Icon = serviceIcons[service.service] || Server;
                        return (
                            <Card key={service.service}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            <CardTitle className="text-base">{service.service}</CardTitle>
                                        </div>
                                        <config.icon className={`h-5 w-5 ${config.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <Badge className={config.bg + " " + config.color}>{service.status}</Badge>
                                        {service.latencyMs !== undefined && (
                                            <span className="text-sm text-muted-foreground">{service.latencyMs}ms</span>
                                        )}
                                    </div>
                                    {service.message && (
                                        <p className="text-xs text-muted-foreground mt-2">{service.message}</p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Last Checked */}
            <p className="text-sm text-muted-foreground text-center">
                Last checked: {services[0]?.lastChecked?.toLocaleString() || "—"}
            </p>
        </div>
    );
}
