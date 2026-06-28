"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { useTranslation } from "@/lib/i18n";

export default function EstimatesPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [estimateForm, setEstimateForm] = useState({
        estimateNumberPrefix: "EST-",
        estimateNextNumber: "000001",
        estimateDueAfterDays: 7,
        estimateDeleteOnlyLast: false,
        estimateDecrementOnDelete: false,
        estimateAllowStaffViewAssigned: false,
        estimateRequireClientLogin: false,
        estimateShowSaleAgent: false,
        estimateShowProjectName: false,
        estimateAutoConvert: false,
        estimateExcludeDraftsFromClient: false,
        estimateNumberFormat: "number_based" as "number_based" | "year_based" | "mixed" | "date_based",
        estimatePipelineLimit: 0,
        estimatePipelineSort: "pipeline_order" as "pipeline_order" | "date",
        estimatePipelineSortOrder: "asc" as "asc" | "desc",
        estimateDefaultClientNote: "",
        estimateDefaultTerms: "",
    });

    useEffect(() => {
        if (!loading) {
            setEstimateForm({
                estimateNumberPrefix: settings.estimateNumberPrefix ?? "EST-",
                estimateNextNumber: settings.estimateNextNumber ?? "000001",
                estimateDueAfterDays: settings.estimateDueAfterDays ?? 7,
                estimateDeleteOnlyLast: settings.estimateDeleteOnlyLast ?? false,
                estimateDecrementOnDelete: settings.estimateDecrementOnDelete ?? false,
                estimateAllowStaffViewAssigned: settings.estimateAllowStaffViewAssigned ?? false,
                estimateRequireClientLogin: settings.estimateRequireClientLogin ?? false,
                estimateShowSaleAgent: settings.estimateShowSaleAgent ?? false,
                estimateShowProjectName: settings.estimateShowProjectName ?? false,
                estimateAutoConvert: settings.estimateAutoConvert ?? false,
                estimateExcludeDraftsFromClient: settings.estimateExcludeDraftsFromClient ?? false,
                estimateNumberFormat: settings.estimateNumberFormat ?? "number_based",
                estimatePipelineLimit: settings.estimatePipelineLimit ?? 0,
                estimatePipelineSort: settings.estimatePipelineSort ?? "pipeline_order",
                estimatePipelineSortOrder: settings.estimatePipelineSortOrder ?? "asc",
                estimateDefaultClientNote: settings.estimateDefaultClientNote ?? "",
                estimateDefaultTerms: settings.estimateDefaultTerms ?? "",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(estimateForm as any);
            toast.success(t("setup.estimates.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.estimates.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.estimates.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.estimates.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.estimates.formatSectionTitle")} description={t("setup.estimates.formatSectionDesc")}>
                <SettingsField label={t("setup.estimates.numberPrefix")}>
                    <Input
                        value={estimateForm.estimateNumberPrefix}
                        onChange={(e) =>
                            setEstimateForm({ ...estimateForm, estimateNumberPrefix: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.estimates.nextNumber")}>
                    <Input
                        value={estimateForm.estimateNextNumber}
                        onChange={(e) =>
                            setEstimateForm({ ...estimateForm, estimateNextNumber: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.estimates.dueAfterDays")}>
                    <Input
                        type="number"
                        value={estimateForm.estimateDueAfterDays}
                        onChange={(e) =>
                            setEstimateForm({
                                ...estimateForm,
                                estimateDueAfterDays: parseInt(e.target.value) || 0,
                            })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.estimates.numberFormat")}>
                    <RadioGroup
                        value={estimateForm.estimateNumberFormat}
                        onValueChange={(val) =>
                            setEstimateForm({ ...estimateForm, estimateNumberFormat: val as any })
                        }
                        className="flex gap-4 flex-wrap"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="number_based" id="est-fmt-number" />
                            <Label htmlFor="est-fmt-number" className="font-normal">
                                {t("setup.estimates.formatNumberBased")}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="year_based" id="est-fmt-year" />
                            <Label htmlFor="est-fmt-year" className="font-normal">
                                {t("setup.estimates.formatYearBased")}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="mixed" id="est-fmt-mixed" />
                            <Label htmlFor="est-fmt-mixed" className="font-normal">
                                000001-YY
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="date_based" id="est-fmt-date" />
                            <Label htmlFor="est-fmt-date" className="font-normal">
                                000001/MM/YYYY
                            </Label>
                        </div>
                    </RadioGroup>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.estimates.behaviorSectionTitle")} description={t("setup.estimates.behaviorSectionDesc")}>
                {[
                    { key: "estimateDeleteOnlyLast", labelKey: "setup.estimates.behaviorDeleteOnlyLast" },
                    { key: "estimateDecrementOnDelete", labelKey: "setup.estimates.behaviorDecrementOnDelete" },
                    {
                        key: "estimateAllowStaffViewAssigned",
                        labelKey: "setup.estimates.behaviorAllowStaffViewAssigned",
                    },
                    {
                        key: "estimateRequireClientLogin",
                        labelKey: "setup.estimates.behaviorRequireClientLogin",
                    },
                    { key: "estimateShowSaleAgent", labelKey: "setup.estimates.behaviorShowSaleAgent" },
                    { key: "estimateShowProjectName", labelKey: "setup.estimates.behaviorShowProjectName" },
                    {
                        key: "estimateAutoConvert",
                        labelKey: "setup.estimates.behaviorAutoConvert",
                    },
                    {
                        key: "estimateExcludeDraftsFromClient",
                        labelKey: "setup.estimates.behaviorExcludeDrafts",
                    },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700">{t(item.labelKey)}</Label>
                        <RadioGroup
                            value={estimateForm[item.key as keyof typeof estimateForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setEstimateForm({ ...estimateForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`ef-${item.key}-yes`} />
                                <Label htmlFor={`ef-${item.key}-yes`} className="font-normal">
                                    {t("common.yes")}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`ef-${item.key}-no`} />
                                <Label htmlFor={`ef-${item.key}-no`} className="font-normal">
                                    {t("common.no")}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title={t("setup.estimates.pipelineSectionTitle")} description={t("setup.estimates.pipelineSectionDesc")}>
                <SettingsField label={t("setup.estimates.pipelineLimit")}>
                    <Input
                        type="number"
                        value={estimateForm.estimatePipelineLimit}
                        onChange={(e) =>
                            setEstimateForm({
                                ...estimateForm,
                                estimatePipelineLimit: parseInt(e.target.value) || 0,
                            })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.estimates.defaultPipelineSort")}>
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                        <Select
                            value={estimateForm.estimatePipelineSort}
                            onValueChange={(val) =>
                                setEstimateForm({ ...estimateForm, estimatePipelineSort: val as any })
                            }
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t("setup.estimates.sortBy")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pipeline_order">{t("setup.estimates.sortPipelineOrder")}</SelectItem>
                                <SelectItem value="date">{t("common.date")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <RadioGroup
                            value={estimateForm.estimatePipelineSortOrder}
                            onValueChange={(val) =>
                                setEstimateForm({ ...estimateForm, estimatePipelineSortOrder: val as any })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="asc" id="est-sort-asc" />
                                <Label htmlFor="est-sort-asc">{t("setup.estimates.ascending")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="desc" id="est-sort-desc" />
                                <Label htmlFor="est-sort-desc">{t("setup.estimates.descending")}</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.estimates.defaultsSectionTitle")} description={t("setup.estimates.defaultsSectionDesc")}>
                <SettingsField label={t("setup.estimates.predefinedClientNote")}>
                    <Textarea
                        value={estimateForm.estimateDefaultClientNote}
                        onChange={(e) =>
                            setEstimateForm({ ...estimateForm, estimateDefaultClientNote: e.target.value })
                        }
                        className="h-24"
                        placeholder={t("setup.estimates.clientNotePlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.estimates.predefinedTerms")}>
                    <Textarea
                        value={estimateForm.estimateDefaultTerms}
                        onChange={(e) =>
                            setEstimateForm({ ...estimateForm, estimateDefaultTerms: e.target.value })
                        }
                        className="h-24"
                    />
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}
