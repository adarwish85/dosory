"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function FinanceInvoicesPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumberPrefix: "INV-",
        invoiceNextNumber: "000001",
        invoiceDueAfterDays: 30,
        invoiceAllowStaffViewAssigned: false,
        invoiceRequireClientLogin: false,
        invoiceDeleteOnlyLast: false,
        invoiceDecrementOnDelete: false,
        invoiceExcludeDraftsFromClient: false,
        invoiceShowSaleAgent: false,
        invoiceShowProjectName: false,
        invoiceShowTotalPaid: false,
        invoiceShowCreditsApplied: false,
        invoiceShowAmountDue: false,
        invoiceAttachPdfToEmail: false,
        invoiceNumberFormat: "number_based" as "number_based" | "year_based" | "mixed",
        invoiceDefaultClientNote: "",
        invoiceDefaultTerms: "",
    });

    useEffect(() => {
        if (!loading) {
            setInvoiceForm({
                invoiceNumberPrefix: settings.invoiceNumberPrefix ?? "INV-",
                invoiceNextNumber: settings.invoiceNextNumber ?? "000001",
                invoiceDueAfterDays: settings.invoiceDueAfterDays ?? 30,
                invoiceAllowStaffViewAssigned: settings.invoiceAllowStaffViewAssigned ?? false,
                invoiceRequireClientLogin: settings.invoiceRequireClientLogin ?? false,
                invoiceDeleteOnlyLast: settings.invoiceDeleteOnlyLast ?? false,
                invoiceDecrementOnDelete: settings.invoiceDecrementOnDelete ?? false,
                invoiceExcludeDraftsFromClient: settings.invoiceExcludeDraftsFromClient ?? false,
                invoiceShowSaleAgent: settings.invoiceShowSaleAgent ?? false,
                invoiceShowProjectName: settings.invoiceShowProjectName ?? false,
                invoiceShowTotalPaid: settings.invoiceShowTotalPaid ?? false,
                invoiceShowCreditsApplied: settings.invoiceShowCreditsApplied ?? false,
                invoiceShowAmountDue: settings.invoiceShowAmountDue ?? false,
                invoiceAttachPdfToEmail: settings.invoiceAttachPdfToEmail ?? false,
                invoiceNumberFormat: settings.invoiceNumberFormat ?? "number_based",
                invoiceDefaultClientNote: settings.invoiceDefaultClientNote ?? "",
                invoiceDefaultTerms: settings.invoiceDefaultTerms ?? "",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(invoiceForm as any);
            toast.success("Invoice settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                <p className="text-gray-500 mt-1">
                    Configure invoice numbering, defaults, and display options
                </p>
            </div>

            <SettingsSection title="Format & Numbering" description="Configure how invoice numbers are generated">
                <SettingsField label="Invoice Number Prefix">
                    <Input
                        value={invoiceForm.invoiceNumberPrefix}
                        onChange={(e) =>
                            setInvoiceForm({ ...invoiceForm, invoiceNumberPrefix: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label="Next Invoice Number">
                    <Input
                        value={invoiceForm.invoiceNextNumber}
                        onChange={(e) =>
                            setInvoiceForm({ ...invoiceForm, invoiceNextNumber: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label="Invoice Number Format">
                    <RadioGroup
                        value={invoiceForm.invoiceNumberFormat}
                        onValueChange={(val) =>
                            setInvoiceForm({ ...invoiceForm, invoiceNumberFormat: val as any })
                        }
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="number_based" id="fmt-number" />
                            <Label htmlFor="fmt-number" className="font-normal">
                                Number Based (000001)
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="year_based" id="fmt-year" />
                            <Label htmlFor="fmt-year" className="font-normal">
                                Year Based (YYYY/000001)
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="mixed" id="fmt-mixed" />
                            <Label htmlFor="fmt-mixed" className="font-normal">
                                000001-YY
                            </Label>
                        </div>
                    </RadioGroup>
                </SettingsField>

                <SettingsField label="Invoice Due After (Days)">
                    <Input
                        type="number"
                        value={invoiceForm.invoiceDueAfterDays}
                        onChange={(e) =>
                            setInvoiceForm({
                                ...invoiceForm,
                                invoiceDueAfterDays: parseInt(e.target.value) || 0,
                            })
                        }
                    />
                </SettingsField>
            </SettingsSection>

            <SettingsSection title="Display & Behavior" description="Control invoice visibility and actions">
                {[
                    {
                        key: "invoiceAllowStaffViewAssigned",
                        label: "Allow staff members to view invoices where they are assigned to",
                    },
                    {
                        key: "invoiceRequireClientLogin",
                        label: "Require client to be logged in to view invoice",
                    },
                    { key: "invoiceDeleteOnlyLast", label: "Delete invoice allowed only on last invoice" },
                    { key: "invoiceDecrementOnDelete", label: "Decrement invoice number on delete" },
                    {
                        key: "invoiceExcludeDraftsFromClient",
                        label: "Exclude invoices with draft status from customers area",
                    },
                    { key: "invoiceShowSaleAgent", label: "Show Sale Agent On Invoice" },
                    { key: "invoiceShowProjectName", label: "Show Project Name On Invoice" },
                    { key: "invoiceShowTotalPaid", label: "Show Total Paid On Invoice" },
                    { key: "invoiceShowCreditsApplied", label: "Show Credits Applied On Invoice" },
                    { key: "invoiceShowAmountDue", label: "Show Amount Due On Invoice" },
                    {
                        key: "invoiceAttachPdfToEmail",
                        label: "Attach invoice PDF when sending payment receipt to email",
                    },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label htmlFor={`inv-${item.key}`}>{item.label}</Label>
                        <Switch
                            id={`inv-${item.key}`}
                            checked={invoiceForm[item.key as keyof typeof invoiceForm] as boolean}
                            onCheckedChange={(val) =>
                                setInvoiceForm({ ...invoiceForm, [item.key]: val })
                            }
                        />
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title="Defaults" description="Set default content for new invoices">
                <SettingsField label="Predefined Client Note">
                    <Textarea
                        value={invoiceForm.invoiceDefaultClientNote}
                        onChange={(e) =>
                            setInvoiceForm({ ...invoiceForm, invoiceDefaultClientNote: e.target.value })
                        }
                        className="h-24"
                        placeholder="Thank you for doing business with us..."
                    />
                </SettingsField>

                <SettingsField label="Predefined Terms & Conditions">
                    <Textarea
                        value={invoiceForm.invoiceDefaultTerms}
                        onChange={(e) =>
                            setInvoiceForm({ ...invoiceForm, invoiceDefaultTerms: e.target.value })
                        }
                        className="h-24"
                    />
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}
