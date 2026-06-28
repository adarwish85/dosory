"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n";

export default function FinanceGeneralPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [financeGeneralForm, setFinanceGeneralForm] = useState({
        decimalSeparator: "." as "." | ",",
        thousandSeparator: "," as "," | "." | "none" | "space" | "'",
        numberPadding: 6,
        autoAssignSaleAgent: true,
        showTaxPerItem: true,
        removeTaxNameFromRow: false,
        excludeCurrencySymbol: false,
        defaultTax: "14.00%",
        removeDecimalsOnZero: false,
        amountToWordsEnable: true,
        amountToWordsLowercase: false,
    });

    useEffect(() => {
        if (!loading) {
            setFinanceGeneralForm({
                decimalSeparator: settings.decimalSeparator ?? ".",
                thousandSeparator: settings.thousandSeparator ?? ",",
                numberPadding: settings.numberPadding ?? 6,
                autoAssignSaleAgent: settings.autoAssignSaleAgent ?? true,
                showTaxPerItem: settings.showTaxPerItem ?? true,
                removeTaxNameFromRow: settings.removeTaxNameFromRow ?? false,
                excludeCurrencySymbol: settings.excludeCurrencySymbol ?? false,
                defaultTax: settings.defaultTax ?? "14.00%",
                removeDecimalsOnZero: settings.removeDecimalsOnZero ?? false,
                amountToWordsEnable: settings.amountToWordsEnable ?? true,
                amountToWordsLowercase: settings.amountToWordsLowercase ?? false,
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(financeGeneralForm);
            toast.success(t("setup.financeGeneral.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.financeGeneral.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.financeGeneral.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.financeGeneral.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.financeGeneral.generalTitle")} description={t("setup.financeGeneral.generalDesc")}>
                <div className="grid grid-cols-2 gap-6">
                    <SettingsField label={t("setup.financeGeneral.decimalSeparator")}>
                        <Select
                            value={financeGeneralForm.decimalSeparator}
                            onValueChange={(val) =>
                                setFinanceGeneralForm({ ...financeGeneralForm, decimalSeparator: val as any })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("setup.financeGeneral.selectSeparator")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value=".">{t("setup.financeGeneral.sepDot")}</SelectItem>
                                <SelectItem value=",">{t("setup.financeGeneral.sepComma")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingsField>

                    <SettingsField label={t("setup.financeGeneral.thousandSeparator")}>
                        <Select
                            value={financeGeneralForm.thousandSeparator}
                            onValueChange={(val) =>
                                setFinanceGeneralForm({ ...financeGeneralForm, thousandSeparator: val as any })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("setup.financeGeneral.selectSeparator")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value=",">{t("setup.financeGeneral.sepComma")}</SelectItem>
                                <SelectItem value=".">{t("setup.financeGeneral.sepDot")}</SelectItem>
                                <SelectItem value="none">{t("setup.financeGeneral.sepNone")}</SelectItem>
                                <SelectItem value="space">{t("setup.financeGeneral.sepSpace")}</SelectItem>
                                <SelectItem value="'">{t("setup.financeGeneral.sepApostrophe")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingsField>
                </div>

                <SettingsField label={t("setup.financeGeneral.defaultTax")}>
                    <Select
                        value={financeGeneralForm.defaultTax}
                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, defaultTax: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.financeGeneral.selectDefaultTax")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="14.00%">{t("setup.financeGeneral.taxVat")}</SelectItem>
                            <SelectItem value="0.00%">{t("setup.financeGeneral.taxNone")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Label>{t("setup.financeGeneral.autoAssignSaleAgent")}</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-4 w-4 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t("setup.financeGeneral.autoAssignSaleAgentTooltip")}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Switch
                            checked={financeGeneralForm.autoAssignSaleAgent}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, autoAssignSaleAgent: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>{t("setup.financeGeneral.showTaxPerItem")}</Label>
                        <Switch
                            checked={financeGeneralForm.showTaxPerItem}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, showTaxPerItem: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>{t("setup.financeGeneral.removeTaxNameFromRow")}</Label>
                        <Switch
                            checked={financeGeneralForm.removeTaxNameFromRow}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, removeTaxNameFromRow: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>{t("setup.financeGeneral.excludeCurrencySymbol")}</Label>
                        <Switch
                            checked={financeGeneralForm.excludeCurrencySymbol}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, excludeCurrencySymbol: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>{t("setup.financeGeneral.removeDecimalsOnZero")}</Label>
                        <Switch
                            checked={financeGeneralForm.removeDecimalsOnZero}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, removeDecimalsOnZero: val })}
                        />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title={t("setup.financeGeneral.amountToWordsTitle")} description={t("setup.financeGeneral.amountToWordsDesc")}>
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <Label>{t("setup.financeGeneral.enableAmountToWords")}</Label>
                    <Switch
                        checked={financeGeneralForm.amountToWordsEnable}
                        onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, amountToWordsEnable: val })}
                    />
                </div>

                {financeGeneralForm.amountToWordsEnable && (
                    <div className="flex items-center justify-between">
                        <Label>{t("setup.financeGeneral.lowercaseAmountToWords")}</Label>
                        <Switch
                            checked={financeGeneralForm.amountToWordsLowercase}
                            onCheckedChange={(val) =>
                                setFinanceGeneralForm({ ...financeGeneralForm, amountToWordsLowercase: val })
                            }
                        />
                    </div>
                )}
            </SettingsSection>

            <SettingsSaveButton onClick={handleSave} loading={saving} />
        </div>
    );
}
