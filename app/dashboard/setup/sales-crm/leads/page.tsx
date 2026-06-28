"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { useTranslation } from "@/lib/i18n";

export default function LeadsSettingsPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [leadsForm, setLeadsForm] = useState({
        leadsKanbanLimit: "50",
        leadsDefaultStatus: "new",
        leadsDefaultSource: "",
        leadsDuplicateValidationFields: "email",
        leadsAutoAssignAdminAfterConvert: false,
        leadsAllowNonAdminImport: false,
        leadsKanbanSort: "dateadded",
        leadsKanbanSortOrder: "desc",
        leadsDisableEditAfterConvert: false,
        leadsModalWidth: "modal-lg",
    });

    useEffect(() => {
        if (!loading) {
            setLeadsForm({
                leadsKanbanLimit: settings.leadsKanbanLimit?.toString() ?? "50",
                leadsDefaultStatus: settings.leadsDefaultStatus ?? "new",
                leadsDefaultSource: settings.leadsDefaultSource ?? "",
                leadsDuplicateValidationFields: settings.leadsDuplicateValidationFields ?? "email",
                leadsAutoAssignAdminAfterConvert: settings.leadsAutoAssignAdminAfterConvert ?? false,
                leadsAllowNonAdminImport: settings.leadsAllowNonAdminImport ?? false,
                leadsKanbanSort: settings.leadsKanbanSort ?? "dateadded",
                leadsKanbanSortOrder: settings.leadsKanbanSortOrder ?? "desc",
                leadsDisableEditAfterConvert: settings.leadsDisableEditAfterConvert ?? false,
                leadsModalWidth: settings.leadsModalWidth ?? "modal-lg",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({
                ...leadsForm,
                leadsKanbanLimit: parseInt(leadsForm.leadsKanbanLimit) || 50,
            } as any);
            toast.success(t("setup.leadsConfig.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.leadsConfig.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.leadsConfig.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.leadsConfig.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.leadsConfig.generalSectionTitle")} description={t("setup.leadsConfig.generalSectionDesc")}>
                <SettingsField label={t("setup.leadsConfig.kanbanLimit")}>
                    <Input
                        type="number"
                        value={leadsForm.leadsKanbanLimit}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsKanbanLimit: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.leadsConfig.defaultStatus")}>
                    <Input
                        value={leadsForm.leadsDefaultStatus}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsDefaultStatus: e.target.value })
                        }
                        placeholder={t("setup.leadsConfig.defaultStatusPlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.leadsConfig.defaultSource")}>
                    <Input
                        value={leadsForm.leadsDefaultSource}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsDefaultSource: e.target.value })
                        }
                        placeholder={t("setup.leadsConfig.defaultSourcePlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.leadsConfig.uniqueValidationFields")}>
                    <Input
                        value={leadsForm.leadsDuplicateValidationFields}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsDuplicateValidationFields: e.target.value })
                        }
                        placeholder="email,phonenumber"
                    />
                </SettingsField>

                <SettingsField label={t("setup.leadsConfig.modalWidthClass")}>
                    <Input
                        value={leadsForm.leadsModalWidth}
                        onChange={(e) => setLeadsForm({ ...leadsForm, leadsModalWidth: e.target.value })}
                    />
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.leadsConfig.automationSectionTitle")} description={t("setup.leadsConfig.automationSectionDesc")}>
                {[
                    {
                        key: "leadsAutoAssignAdminAfterConvert",
                        labelKey: "setup.leadsConfig.autoAssignAdmin",
                    },
                    {
                        key: "leadsAllowNonAdminImport",
                        labelKey: "setup.leadsConfig.allowNonAdminImport",
                    },
                    {
                        key: "leadsDisableEditAfterConvert",
                        labelKey: "setup.leadsConfig.disableEditAfterConvert",
                    },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700">{t(item.labelKey)}</Label>
                        <RadioGroup
                            value={leadsForm[item.key as keyof typeof leadsForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setLeadsForm({ ...leadsForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`leads-${item.key}-yes`} />
                                <Label htmlFor={`leads-${item.key}-yes`} className="font-normal">
                                    {t("common.yes")}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`leads-${item.key}-no`} />
                                <Label htmlFor={`leads-${item.key}-no`} className="font-normal">
                                    {t("common.no")}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title={t("setup.leadsConfig.kanbanSortingSectionTitle")} description={t("setup.leadsConfig.kanbanSortingSectionDesc")}>
                <SettingsField label={t("setup.leadsConfig.sortBy")}>
                    <Select
                        value={leadsForm.leadsKanbanSort}
                        onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsKanbanSort: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dateadded">{t("setup.leadsConfig.sortDateCreated")}</SelectItem>
                            <SelectItem value="leadorder">{t("setup.leadsConfig.sortKanbanOrder")}</SelectItem>
                            <SelectItem value="name">{t("common.name")}</SelectItem>
                            <SelectItem value="company">{t("setup.leadsConfig.sortCompany")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.leadsConfig.sortOrder")}>
                    <Select
                        value={leadsForm.leadsKanbanSortOrder}
                        onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsKanbanSortOrder: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asc">{t("setup.leadsConfig.ascending")}</SelectItem>
                            <SelectItem value="desc">{t("setup.leadsConfig.descending")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>
            </SettingsSection>

            <SettingsSaveButton onClick={handleSave} loading={saving} />
        </div>
    );
}
