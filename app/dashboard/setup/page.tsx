"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
    return (
        <div className="p-6">
            <PageHeader title="Setup & Configuration" />

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="company">Company Info</TabsTrigger>
                    <TabsTrigger value="email">Email Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                            <CardDescription>Manage your platform's base settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="site-name">Site Name</Label>
                                <Input id="site-name" defaultValue="WasilaDev Platform" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lang">Default Language</Label>
                                <Input id="lang" defaultValue="English" />
                            </div>
                            <Button>Save Changes</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="company" className="mt-4">
                    <Card>
                        <CardContent className="p-6 text-muted-foreground">
                            Company settings content...
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
