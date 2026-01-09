"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ModuleCatalog } from "@/lib/types/super-admin";
import { Settings, Package, Zap, Crown } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { saFetch, saPatch } from "@/lib/api/saFetch";

const categoryIcons: Record<string, React.ElementType> = {
    core: Package,
    addon: Zap,
    premium: Crown,
};

const categoryColors: Record<string, string> = {
    core: "bg-blue-100 text-blue-800",
    addon: "bg-purple-100 text-purple-800",
    premium: "bg-amber-100 text-amber-800",
};

export default function ModulesPage() {
    const { user } = useAuth();
    const [modules, setModules] = useState<ModuleCatalog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const data = await saFetch<{ modules: ModuleCatalog[] }>("/api/sa/modules");
                setModules(data.modules || []);
            } catch (e: unknown) {
                setError((e as Error).message || String(e));
            } finally {
                setLoading(false);
            }
        };
        fetchModules();
    }, []);

    const handleToggle = async (moduleKey: string, isEnabled: boolean) => {
        if (!user) return;
        try {
            await saPatch("/api/sa/modules", { moduleKey, isEnabled, actorId: user.uid });
            setModules((prev) => prev.map((m) => (m.moduleKey === moduleKey ? { ...m, isEnabled } : m)));
            toast.success(`Module ${isEnabled ? "enabled" : "disabled"}`);
        } catch {
            toast.error("Failed to update module");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
                <p className="text-muted-foreground">Manage platform modules and feature toggles</p>
            </div>

            {/* Error */}
            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-red-600">{error}</CardContent>
                </Card>
            )}

            {/* Modules Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-4 w-full" />
                            </CardHeader>
                        </Card>
                    ))
                ) : modules.length === 0 ? (
                    <Card className="md:col-span-3">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Settings className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No modules configured</p>
                            <p className="text-sm">Modules will be seeded automatically on first API call</p>
                        </CardContent>
                    </Card>
                ) : (
                    modules.map((mod) => {
                        const Icon = categoryIcons[mod.category] || Package;
                        return (
                            <Card key={mod.moduleKey}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{mod.name}</CardTitle>
                                                <Badge className={categoryColors[mod.category]} variant="secondary">
                                                    {mod.category}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={mod.isEnabled}
                                            onCheckedChange={(checked) => handleToggle(mod.moduleKey, checked)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
