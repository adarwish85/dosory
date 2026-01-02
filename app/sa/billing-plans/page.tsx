"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plan } from "@/lib/types/super-admin";
import { DollarSign, CreditCard, Plus, Check } from "lucide-react";

export default function BillingPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch("/api/sa/plans");
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                setPlans(data.plans || []);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
                    <p className="text-muted-foreground">Manage subscription plans and pricing</p>
                </div>
                <Button disabled>
                    <Plus className="mr-2 h-4 w-4" /> Create Plan
                </Button>
            </div>

            {/* Error */}
            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-red-600">{error}</CardContent>
                </Card>
            )}

            {/* Plans Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </CardContent>
                        </Card>
                    ))
                ) : plans.length === 0 ? (
                    <Card className="md:col-span-3">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No plans configured</p>
                            <p className="text-sm">Plans will be seeded automatically on first API call</p>
                        </CardContent>
                    </Card>
                ) : (
                    plans.map(plan => (
                        <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{plan.name}</CardTitle>
                                    {!plan.isActive && <Badge variant="secondary">Inactive</Badge>}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">
                                        ${(plan.price / 100).toFixed(0)}
                                    </span>
                                    <span className="text-muted-foreground">/{plan.interval}</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-green-500" />
                                        {plan.limits.maxUsers === -1 ? "Unlimited" : plan.limits.maxUsers} users
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-green-500" />
                                        {plan.limits.maxProjects === -1 ? "Unlimited" : plan.limits.maxProjects} projects
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-green-500" />
                                        {plan.limits.maxStorage >= 1000
                                            ? `${(plan.limits.maxStorage / 1000).toFixed(0)} GB`
                                            : `${plan.limits.maxStorage} MB`} storage
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Subscription Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscription Overview</CardTitle>
                    <CardDescription>Revenue and subscription metrics</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total MRR</p>
                        <p className="text-2xl font-bold">$0</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                        <p className="text-2xl font-bold">0</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Trial Accounts</p>
                        <p className="text-2xl font-bold">0</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Churn Rate</p>
                        <p className="text-2xl font-bold">0%</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
