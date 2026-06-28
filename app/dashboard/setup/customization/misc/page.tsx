"use client";

import { useState, useEffect } from "react";
import { Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { useTranslation } from "@/lib/i18n";

export default function MiscSettingsPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [miscForm, setMiscForm] = useState({
        miscRequireLoginForContract: false,
        miscDropboxAppKey: "",
        miscMaxFileSizeMedia: "50",
        miscMaxFileUploadsPost: "10",
        miscLimitTopSearchBarResults: "10",
        miscDefaultStaffRole: "employee",
        miscDeleteActivityLogOlderThan: "1",
        miscShowSetupMenuHover: false,
        miscShowHelpMenu: true,
        miscUseMinified: true,
        miscSaveLastTableOrder: false,
        miscShowTableExportButton: "admin",
        miscTablesPaginationLimit: "25",
        miscAllowNonAdminCreateLeadStatus: false,
        miscAllowNonAdminCreateLeadSource: false,
        miscAllowNonAdminCreateCustomerGroup: false,
        miscAllowNonAdminCreateService: false,
        miscAllowNonAdminSavePredefinedReplies: false,
        miscAllowNonAdminCreateContractType: false,
        miscAllowNonAdminCreateExpenseCategory: false,
    });

    useEffect(() => {
        if (!loading) {
            setMiscForm({
                miscRequireLoginForContract: settings.miscRequireLoginForContract ?? false,
                miscDropboxAppKey: settings.miscDropboxAppKey ?? "",
                miscMaxFileSizeMedia: settings.miscMaxFileSizeMedia?.toString() ?? "50",
                miscMaxFileUploadsPost: settings.miscMaxFileUploadsPost?.toString() ?? "10",
                miscLimitTopSearchBarResults: settings.miscLimitTopSearchBarResults?.toString() ?? "10",
                miscDefaultStaffRole: settings.miscDefaultStaffRole ?? "employee",
                miscDeleteActivityLogOlderThan: settings.miscDeleteActivityLogOlderThan?.toString() ?? "1",
                miscShowSetupMenuHover: settings.miscShowSetupMenuHover ?? false,
                miscShowHelpMenu: settings.miscShowHelpMenu ?? true,
                miscUseMinified: settings.miscUseMinified ?? true,
                miscSaveLastTableOrder: settings.miscSaveLastTableOrder ?? false,
                miscShowTableExportButton: settings.miscShowTableExportButton ?? "admin",
                miscTablesPaginationLimit: settings.miscTablesPaginationLimit?.toString() ?? "25",
                miscAllowNonAdminCreateLeadStatus: settings.miscAllowNonAdminCreateLeadStatus ?? false,
                miscAllowNonAdminCreateLeadSource: settings.miscAllowNonAdminCreateLeadSource ?? false,
                miscAllowNonAdminCreateCustomerGroup: settings.miscAllowNonAdminCreateCustomerGroup ?? false,
                miscAllowNonAdminCreateService: settings.miscAllowNonAdminCreateService ?? false,
                miscAllowNonAdminSavePredefinedReplies: settings.miscAllowNonAdminSavePredefinedReplies ?? false,
                miscAllowNonAdminCreateContractType: settings.miscAllowNonAdminCreateContractType ?? false,
                miscAllowNonAdminCreateExpenseCategory: settings.miscAllowNonAdminCreateExpenseCategory ?? false,
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({
                ...miscForm,
                miscMaxFileSizeMedia: parseInt(miscForm.miscMaxFileSizeMedia) || 50,
                miscMaxFileUploadsPost: parseInt(miscForm.miscMaxFileUploadsPost) || 10,
                miscLimitTopSearchBarResults: parseInt(miscForm.miscLimitTopSearchBarResults) || 10,
                miscDeleteActivityLogOlderThan: parseInt(miscForm.miscDeleteActivityLogOlderThan) || 1,
                miscTablesPaginationLimit: parseInt(miscForm.miscTablesPaginationLimit) || 25,
            } as any);
            toast.success(t("setup.misc.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.misc.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.misc.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.misc.subtitle")}
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                    <TabsTrigger value="general">{t("setup.misc.tabGeneral")}</TabsTrigger>
                    <TabsTrigger value="tables">{t("setup.misc.tabTables")}</TabsTrigger>
                    <TabsTrigger value="inline-create">{t("setup.misc.tabInlineCreate")}</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <SettingsSection title={t("setup.misc.systemTitle")} description={t("setup.misc.systemDesc")}>
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block text-sm font-medium text-gray-700">
                                    {t("setup.misc.requireLoginForContract")}
                                </Label>
                                <RadioGroup
                                    value={miscForm.miscRequireLoginForContract ? "yes" : "no"}
                                    onValueChange={(val) =>
                                        setMiscForm({ ...miscForm, miscRequireLoginForContract: val === "yes" })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="miscRequireLoginForContract-yes" />
                                        <Label htmlFor="miscRequireLoginForContract-yes" className="font-normal">
                                            {t("common.yes")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="miscRequireLoginForContract-no" />
                                        <Label htmlFor="miscRequireLoginForContract-no" className="font-normal">
                                            {t("common.no")}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <SettingsField label={t("setup.misc.dropboxAppKey")}>
                                <Input
                                    value={miscForm.miscDropboxAppKey}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscDropboxAppKey: e.target.value })
                                    }
                                />
                            </SettingsField>

                            <SettingsField label={t("setup.misc.maxFileSizeMedia")}>
                                <Input
                                    type="number"
                                    value={miscForm.miscMaxFileSizeMedia}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscMaxFileSizeMedia: e.target.value })
                                    }
                                />
                            </SettingsField>

                            <div>
                                <div className="flex items-center gap-1 mb-1">
                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                    <Label>{t("setup.misc.maxFileUploadsPost")}</Label>
                                </div>
                                <Input
                                    type="number"
                                    value={miscForm.miscMaxFileUploadsPost}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscMaxFileUploadsPost: e.target.value })
                                    }
                                />
                            </div>

                            <SettingsField label={t("setup.misc.limitTopSearchBarResults")}>
                                <Input
                                    type="number"
                                    value={miscForm.miscLimitTopSearchBarResults}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscLimitTopSearchBarResults: e.target.value })
                                    }
                                />
                            </SettingsField>

                            <SettingsField label={t("setup.misc.defaultStaffRole")}>
                                <Select
                                    value={miscForm.miscDefaultStaffRole}
                                    onValueChange={(val) => setMiscForm({ ...miscForm, miscDefaultStaffRole: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("setup.misc.selectPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">{t("setup.misc.roleEmployee")}</SelectItem>
                                        <SelectItem value="admin">{t("setup.misc.roleAdmin")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingsField>

                            <SettingsField label={t("setup.misc.deleteActivityLogOlderThan")}>
                                <Input
                                    type="number"
                                    value={miscForm.miscDeleteActivityLogOlderThan}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscDeleteActivityLogOlderThan: e.target.value })
                                    }
                                />
                            </SettingsField>

                            {[
                                {
                                    key: "miscShowSetupMenuHover",
                                    labelKey: "setup.misc.showSetupMenuHover",
                                },
                                { key: "miscShowHelpMenu", labelKey: "setup.misc.showHelpMenu" },
                                {
                                    key: "miscUseMinified",
                                    labelKey: "setup.misc.useMinified",
                                },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                                        {t(item.labelKey)}
                                    </Label>
                                    <RadioGroup
                                        value={miscForm[item.key as keyof typeof miscForm] ? "yes" : "no"}
                                        onValueChange={(val) =>
                                            setMiscForm({ ...miscForm, [item.key]: val === "yes" })
                                        }
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`misc-${item.key}-yes`} />
                                            <Label htmlFor={`misc-${item.key}-yes`} className="font-normal">
                                                {t("common.yes")}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`misc-${item.key}-no`} />
                                            <Label htmlFor={`misc-${item.key}-no`} className="font-normal">
                                                {t("common.no")}
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>
                </TabsContent>

                <TabsContent value="tables" className="space-y-6 mt-6">
                    <SettingsSection title={t("setup.misc.tableBehaviorTitle")} description={t("setup.misc.tableBehaviorDesc")}>
                        <div>
                            <div className="flex items-center gap-1 mb-2">
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                                <Label className="block text-sm font-medium text-gray-700">
                                    {t("setup.misc.saveLastTableOrder")}
                                </Label>
                            </div>
                            <RadioGroup
                                value={miscForm.miscSaveLastTableOrder ? "yes" : "no"}
                                onValueChange={(val) =>
                                    setMiscForm({ ...miscForm, miscSaveLastTableOrder: val === "yes" })
                                }
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="miscSaveLastTableOrder-yes" />
                                    <Label htmlFor="miscSaveLastTableOrder-yes" className="font-normal">
                                        {t("common.yes")}
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="miscSaveLastTableOrder-no" />
                                    <Label htmlFor="miscSaveLastTableOrder-no" className="font-normal">
                                        {t("common.no")}
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">
                                {t("setup.misc.showTableExportButton")}
                            </Label>
                            <RadioGroup
                                value={miscForm.miscShowTableExportButton}
                                onValueChange={(val) =>
                                    setMiscForm({ ...miscForm, miscShowTableExportButton: val })
                                }
                                className="space-y-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="export-all" />
                                    <Label htmlFor="export-all" className="font-normal">
                                        {t("setup.misc.exportToAll")}
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="admin" id="export-admin" />
                                    <Label htmlFor="export-admin" className="font-normal">
                                        {t("setup.misc.exportToAdmins")}
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="hide" id="export-hide" />
                                    <Label htmlFor="export-hide" className="font-normal">
                                        {t("setup.misc.exportHide")}
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <SettingsField label={t("setup.misc.tablesPaginationLimit")}>
                            <Input
                                type="number"
                                value={miscForm.miscTablesPaginationLimit}
                                onChange={(e) =>
                                    setMiscForm({ ...miscForm, miscTablesPaginationLimit: e.target.value })
                                }
                            />
                        </SettingsField>
                    </SettingsSection>
                </TabsContent>

                <TabsContent value="inline-create" className="space-y-6 mt-6">
                    <SettingsSection title={t("setup.misc.inlineCreateTitle")} description={t("setup.misc.inlineCreateDesc")}>
                        {[
                            {
                                key: "miscAllowNonAdminCreateLeadStatus",
                                labelKey: "setup.misc.allowNonAdminCreateLeadStatus",
                            },
                            {
                                key: "miscAllowNonAdminCreateLeadSource",
                                labelKey: "setup.misc.allowNonAdminCreateLeadSource",
                            },
                            {
                                key: "miscAllowNonAdminCreateCustomerGroup",
                                labelKey: "setup.misc.allowNonAdminCreateCustomerGroup",
                            },
                            {
                                key: "miscAllowNonAdminCreateService",
                                labelKey: "setup.misc.allowNonAdminCreateService",
                            },
                            {
                                key: "miscAllowNonAdminSavePredefinedReplies",
                                labelKey: "setup.misc.allowNonAdminSavePredefinedReplies",
                            },
                            {
                                key: "miscAllowNonAdminCreateContractType",
                                labelKey: "setup.misc.allowNonAdminCreateContractType",
                            },
                            {
                                key: "miscAllowNonAdminCreateExpenseCategory",
                                labelKey: "setup.misc.allowNonAdminCreateExpenseCategory",
                            },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <Label className="block text-sm font-medium text-gray-700">{t(item.labelKey)}</Label>
                                <RadioGroup
                                    value={miscForm[item.key as keyof typeof miscForm] ? "yes" : "no"}
                                    onValueChange={(val) =>
                                        setMiscForm({ ...miscForm, [item.key]: val === "yes" })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id={`misc-${item.key}-yes`} />
                                        <Label htmlFor={`misc-${item.key}-yes`} className="font-normal">
                                            {t("common.yes")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id={`misc-${item.key}-no`} />
                                        <Label htmlFor={`misc-${item.key}-no`} className="font-normal">
                                            {t("common.no")}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        ))}
                    </SettingsSection>
                </TabsContent>
            </Tabs>

            <SettingsSaveButton onClick={handleSave} loading={saving} />
        </div>
    );
}
