"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Database, Activity, Lock } from "lucide-react";

export default function UtilitiesPage() {
    return (
        <div className="p-6">
            <PageHeader title="Utilities" />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Database Backup
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">Create a full backup of your system data.</p>
                        <Button variant="outline" className="w-full">
                            Run Backup
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            System Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">View system health and logs.</p>
                        <Button variant="outline" className="w-full">
                            View Logs
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Security Audit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Scan for potential security vulnerabilities.
                        </p>
                        <Button variant="outline" className="w-full">
                            Run Scan
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
