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

export default function FinanceGeneralPage() {
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
            toast.success("Finance settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Finance Settings</h1>
                <p className="text-gray-500 mt-1">
                    Configure general financial preferences
                </p>
            </div>

            <SettingsSection title="General" description="Format and display settings for financial documents">
                <div className="grid grid-cols-2 gap-6">
                    <SettingsField label="Decimal Separator">
                        <Select
                            value={financeGeneralForm.decimalSeparator}
                            onValueChange={(val) =>
                                setFinanceGeneralForm({ ...financeGeneralForm, decimalSeparator: val as any })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select separator" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value=".">. (Dot)</SelectItem>
                                <SelectItem value=",">, (Comma)</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingsField>

                    <SettingsField label="Thousand Separator">
                        <Select
                            value={financeGeneralForm.thousandSeparator}
                            onValueChange={(val) =>
                                setFinanceGeneralForm({ ...financeGeneralForm, thousandSeparator: val as any })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select separator" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value=",">, (Comma)</SelectItem>
                                <SelectItem value=".">. (Dot)</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="space">Space</SelectItem>
                                <SelectItem value="'">' (Apostrophe)</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingsField>
                </div>

                <SettingsField label="Default Tax">
                    <Select
                        value={financeGeneralForm.defaultTax}
                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, defaultTax: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Default Tax" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="14.00%">14.00% (VAT)</SelectItem>
                            <SelectItem value="0.00%">0.00% (No Tax)</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Label>Auto Assign Sale Agent</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-4 w-4 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Automatically assign the logged-in staff member as the sale agent when creating invoices/estimates</p>
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
                        <Label>Show Tax Per Item</Label>
                        <Switch
                            checked={financeGeneralForm.showTaxPerItem}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, showTaxPerItem: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>Remove Tax Name From Row</Label>
                        <Switch
                            checked={financeGeneralForm.removeTaxNameFromRow}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, removeTaxNameFromRow: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>Exclude Currency Symbol</Label>
                        <Switch
                            checked={financeGeneralForm.excludeCurrencySymbol}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, excludeCurrencySymbol: val })}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>Remove Decimals on Zero</Label>
                        <Switch
                            checked={financeGeneralForm.removeDecimalsOnZero}
                            onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, removeDecimalsOnZero: val })}
                        />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Amount to Words" description="Convert numerical amounts to words on documents">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <Label>Enable Amount to Words</Label>
                    <Switch
                        checked={financeGeneralForm.amountToWordsEnable}
                        onCheckedChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, amountToWordsEnable: val })}
                    />
                </div>

                {financeGeneralForm.amountToWordsEnable && (
                    <div className="flex items-center justify-between">
                        <Label>Lowercase Amount to Words</Label>
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
