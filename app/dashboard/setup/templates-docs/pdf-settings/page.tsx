"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { useTranslation } from "@/lib/i18n";

export default function PdfSettingsPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [pdfForm, setPdfForm] = useState({
        pdfFont: "freesans",
        pdfSwapDetails: false,
        pdfFontSize: "10",
        pdfTableHeadingColor: "#323a45",
        pdfTableHeadingTextColor: "#ffffff",
        pdfLogoUrl: "",
        pdfLogoWidth: "150",
        pdfShowStatus: true,
        pdfShowLink: true,
        pdfShowPayments: true,
        pdfShowPageNumber: false,
        pdfShowSignatureInvoice: false,
        pdfShowSignatureEstimate: false,
        pdfShowSignatureCreditNote: false,
        pdfShowSignatureContract: false,
        pdfSignatureImage: "",
        pdfFormatInvoice: "A4 Portrait",
        pdfFormatEstimate: "A4 Portrait",
        pdfFormatPayment: "A4 Portrait",
        pdfFormatCreditNote: "A4 Portrait",
        pdfFormatContract: "A4 Portrait",
        pdfFormatStatement: "A4 Portrait",
    });

    useEffect(() => {
        if (!loading) {
            setPdfForm({
                pdfFont: settings.pdfFont ?? "freesans",
                pdfSwapDetails: settings.pdfSwapDetails ?? false,
                pdfFontSize: settings.pdfFontSize?.toString() ?? "10",
                pdfTableHeadingColor: settings.pdfTableHeadingColor ?? "#323a45",
                pdfTableHeadingTextColor: settings.pdfTableHeadingTextColor ?? "#ffffff",
                pdfLogoUrl: settings.pdfLogoUrl ?? "",
                pdfLogoWidth: settings.pdfLogoWidth?.toString() ?? "150",
                pdfShowStatus: settings.pdfShowStatus ?? true,
                pdfShowLink: settings.pdfShowLink ?? true,
                pdfShowPayments: settings.pdfShowPayments ?? true,
                pdfShowPageNumber: settings.pdfShowPageNumber ?? false,
                pdfShowSignatureInvoice: settings.pdfShowSignatureInvoice ?? false,
                pdfShowSignatureEstimate: settings.pdfShowSignatureEstimate ?? false,
                pdfShowSignatureCreditNote: settings.pdfShowSignatureCreditNote ?? false,
                pdfShowSignatureContract: settings.pdfShowSignatureContract ?? false,
                pdfSignatureImage: settings.pdfSignatureImage ?? "",
                pdfFormatInvoice: settings.pdfFormatInvoice ?? "A4 Portrait",
                pdfFormatEstimate: settings.pdfFormatEstimate ?? "A4 Portrait",
                pdfFormatPayment: settings.pdfFormatPayment ?? "A4 Portrait",
                pdfFormatCreditNote: settings.pdfFormatCreditNote ?? "A4 Portrait",
                pdfFormatContract: settings.pdfFormatContract ?? "A4 Portrait",
                pdfFormatStatement: settings.pdfFormatStatement ?? "A4 Portrait",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({
                ...pdfForm,
                pdfFontSize: parseInt(pdfForm.pdfFontSize) || 10,
                pdfLogoWidth: parseInt(pdfForm.pdfLogoWidth) || 150,
            } as any);
            toast.success(t("setup.pdfSettings.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.pdfSettings.saveError"));
        }
    };

    const formatOptions = [
        "A4 Portrait",
        "A4 Landscape",
        "Letter Portrait",
        "Letter Landscape",
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.pdfSettings.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.pdfSettings.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.pdfSettings.generalTitle")} description={t("setup.pdfSettings.generalDesc")}>
                <SettingsField label={t("setup.pdfSettings.font")}>
                    <Select
                        value={pdfForm.pdfFont}
                        onValueChange={(val) => setPdfForm({ ...pdfForm, pdfFont: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.pdfSettings.selectFont")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="freesans">Freesans</SelectItem>
                            <SelectItem value="alef">Alef</SelectItem>
                            <SelectItem value="roboto">Roboto</SelectItem>
                            <SelectItem value="custom">Custom (Upload)</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.pdfSettings.fontSize")}>
                    <Input
                        type="number"
                        value={pdfForm.pdfFontSize}
                        onChange={(e) => setPdfForm({ ...pdfForm, pdfFontSize: e.target.value })}
                    />
                </SettingsField>

                <SettingsField label={t("setup.pdfSettings.detailsOrder")}>
                    <RadioGroup
                        value={pdfForm.pdfSwapDetails ? "swap" : "default"}
                        onValueChange={(val) =>
                            setPdfForm({ ...pdfForm, pdfSwapDetails: val === "swap" })
                        }
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="default" id="order-default" />
                            <Label htmlFor="order-default" className="font-normal">
                                {t("setup.pdfSettings.detailsOrderDefault")}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="swap" id="order-swap" />
                            <Label htmlFor="order-swap" className="font-normal">
                                {t("setup.pdfSettings.detailsOrderSwap")}
                            </Label>
                        </div>
                    </RadioGroup>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.pdfSettings.documentFormatsTitle")} description={t("setup.pdfSettings.documentFormatsDesc")}>
                {[
                    { key: "pdfFormatInvoice", label: t("setup.pdfSettings.invoiceFormat") },
                    { key: "pdfFormatEstimate", label: t("setup.pdfSettings.estimateFormat") },
                    { key: "pdfFormatCreditNote", label: t("setup.pdfSettings.creditNoteFormat") },
                    { key: "pdfFormatContract", label: t("setup.pdfSettings.contractFormat") },
                    { key: "pdfFormatPayment", label: t("setup.pdfSettings.paymentReceiptFormat") },
                    { key: "pdfFormatStatement", label: t("setup.pdfSettings.statementFormat") },
                ].map((item) => (
                    <SettingsField key={item.key} label={item.label}>
                        <Select
                            value={pdfForm[item.key as keyof typeof pdfForm] as string}
                            onValueChange={(val) =>
                                setPdfForm({ ...pdfForm, [item.key]: val })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("setup.pdfSettings.selectFormat")} />
                            </SelectTrigger>
                            <SelectContent>
                                {formatOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsField>
                ))}
            </SettingsSection>

            <SettingsSection title={t("setup.pdfSettings.displayTogglesTitle")} description={t("setup.pdfSettings.displayTogglesDesc")}>
                {[
                    { key: "pdfShowStatus", label: t("setup.pdfSettings.showStatus") },
                    { key: "pdfShowLink", label: t("setup.pdfSettings.showLink") },
                    { key: "pdfShowPayments", label: t("setup.pdfSettings.showPayments") },
                    { key: "pdfShowPageNumber", label: t("setup.pdfSettings.showPageNumber") },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700">{item.label}</Label>
                        <RadioGroup
                            value={pdfForm[item.key as keyof typeof pdfForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setPdfForm({ ...pdfForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`pdf-${item.key}-yes`} />
                                <Label htmlFor={`pdf-${item.key}-yes`} className="font-normal">
                                    {t("common.yes")}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`pdf-${item.key}-no`} />
                                <Label htmlFor={`pdf-${item.key}-no`} className="font-normal">
                                    {t("common.no")}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title={t("setup.pdfSettings.signaturesTitle")} description={t("setup.pdfSettings.signaturesDesc")}>
                {[
                    { key: "pdfShowSignatureInvoice", label: t("setup.pdfSettings.signatureInvoice") },
                    { key: "pdfShowSignatureEstimate", label: t("setup.pdfSettings.signatureEstimate") },
                    { key: "pdfShowSignatureCreditNote", label: t("setup.pdfSettings.signatureCreditNote") },
                    { key: "pdfShowSignatureContract", label: t("setup.pdfSettings.signatureContract") },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700">{item.label}</Label>
                        <RadioGroup
                            value={pdfForm[item.key as keyof typeof pdfForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setPdfForm({ ...pdfForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`sig-${item.key}-yes`} />
                                <Label htmlFor={`sig-${item.key}-yes`} className="font-normal">
                                    {t("setup.pdfSettings.show")}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`sig-${item.key}-no`} />
                                <Label htmlFor={`sig-${item.key}-no`} className="font-normal">
                                    {t("setup.pdfSettings.hide")}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSaveButton onClick={handleSave} loading={saving} />
        </div>
    );
}
