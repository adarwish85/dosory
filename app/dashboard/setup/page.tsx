"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export default function SetupPage() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <PageHeader title={t("setup.config.title")} />

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">{t("setup.config.tabGeneral")}</TabsTrigger>
                    <TabsTrigger value="company">{t("setup.config.tabCompany")}</TabsTrigger>
                    <TabsTrigger value="email">{t("setup.config.tabEmail")}</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("setup.config.generalTitle")}</CardTitle>
                            <CardDescription>{t("setup.config.generalDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="site-name">{t("setup.config.siteName")}</Label>
                                <Input id="site-name" defaultValue="My Platform" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lang">{t("setup.config.defaultLanguage")}</Label>
                                <Input id="lang" defaultValue="English" />
                            </div>
                            <Button>{t("common.saveChanges")}</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="company" className="mt-4">
                    <Card>
                        <CardContent className="p-6 text-muted-foreground">{t("setup.config.companyPlaceholder")}</CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
