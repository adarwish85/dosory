"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { useTranslation } from "@/lib/i18n";

export default function PaymentGatewaysPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [activeGatewayTab, setActiveGatewayTab] = useState("general");

    // Form state
    const [gatewayForm, setGatewayForm] = useState({
        // General
        paymentNotificationEmail: true,
        allowCustomerModifyAmount: false,
        // PayPal
        paypalActive: false,
        paypalLabel: "Paypal",
        paypalFixedFee: "0",
        paypalPercentageFee: "0",
        paypalUsername: "",
        paypalPassword: "",
        paypalSignature: "",
        paypalDescription: "Payment for Invoice {invoice_number}",
        paypalCurrencies: "USD",
        paypalTestMode: false,
        paypalDefaultSelected: false,
    });

    useEffect(() => {
        if (!loading) {
            setGatewayForm({
                paymentNotificationEmail: settings.paymentNotificationEmail ?? true,
                allowCustomerModifyAmount: settings.allowCustomerModifyAmount ?? false,
                paypalActive: settings.paypalActive ?? false,
                paypalLabel: settings.paypalLabel ?? "Paypal",
                paypalFixedFee: settings.paypalFixedFee ?? "0",
                paypalPercentageFee: settings.paypalPercentageFee ?? "0",
                paypalUsername: settings.paypalUsername ?? "",
                paypalPassword: settings.paypalPassword ?? "",
                paypalSignature: settings.paypalSignature ?? "",
                paypalDescription: settings.paypalDescription ?? "Payment for Invoice {invoice_number}",
                paypalCurrencies: settings.paypalCurrencies ?? "USD",
                paypalTestMode: settings.paypalTestMode ?? false,
                paypalDefaultSelected: settings.paypalDefaultSelected ?? false,
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(gatewayForm);
            toast.success(t("setup.paymentGateways.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.paymentGateways.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.paymentGateways.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.paymentGateways.subtitle")}
                </p>
            </div>

            <Tabs value={activeGatewayTab} onValueChange={setActiveGatewayTab} className="bg-white p-1 rounded-lg border w-fit">
                <TabsList>
                    <TabsTrigger value="general">{t("setup.paymentGateways.tabGeneral")}</TabsTrigger>
                    <TabsTrigger value="paypal">{t("setup.paymentGateways.tabPaypal")}</TabsTrigger>
                </TabsList>
            </Tabs>

            <TabsContent value="general" className="mt-6 space-y-6">
                <SettingsSection title={t("setup.paymentGateways.notificationTitle")} description={t("setup.paymentGateways.notificationDesc")}>
                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>{t("setup.paymentGateways.receiveNotification")}</Label>
                        <RadioGroup
                            value={gatewayForm.paymentNotificationEmail ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, paymentNotificationEmail: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="ntf-yes" />
                                <Label htmlFor="ntf-yes">{t("common.yes")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="ntf-no" />
                                <Label htmlFor="ntf-no">{t("common.no")}</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label>{t("setup.paymentGateways.allowModifyAmount")}</Label>
                        <RadioGroup
                            value={gatewayForm.allowCustomerModifyAmount ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, allowCustomerModifyAmount: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="mod-yes" />
                                <Label htmlFor="mod-yes">{t("common.yes")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="mod-no" />
                                <Label htmlFor="mod-no">{t("common.no")}</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <SettingsSaveButton onClick={handleSave} loading={saving} />
                </SettingsSection>
            </TabsContent>

            <TabsContent value="paypal" className="mt-6 space-y-6">
                <SettingsSection title={t("setup.paymentGateways.paypalConfigTitle")} description={t("setup.paymentGateways.paypalConfigDesc")}>
                    <SettingsField label={t("setup.paymentGateways.active")}>
                        <RadioGroup
                            value={gatewayForm.paypalActive ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, paypalActive: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="pp-act-yes" />
                                <Label htmlFor="pp-act-yes">{t("common.yes")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="pp-act-no" />
                                <Label htmlFor="pp-act-no">{t("common.no")}</Label>
                            </div>
                        </RadioGroup>
                    </SettingsField>

                    <SettingsField label={t("setup.paymentGateways.label")}>
                        <Input
                            value={gatewayForm.paypalLabel}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalLabel: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label={t("setup.paymentGateways.apiUsername")}>
                        <Input
                            value={gatewayForm.paypalUsername}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalUsername: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label={t("setup.paymentGateways.apiPassword")}>
                        <Input
                            type="password"
                            value={gatewayForm.paypalPassword}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalPassword: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label={t("setup.paymentGateways.apiSignature")}>
                        <Input
                            type="password"
                            value={gatewayForm.paypalSignature}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalSignature: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label={t("setup.paymentGateways.commaSeparatedCurrencies")}>
                        <Input
                            value={gatewayForm.paypalCurrencies}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalCurrencies: e.target.value })}
                            placeholder="USD,EUR,GBP"
                        />
                    </SettingsField>

                    <SettingsField label={t("setup.paymentGateways.gatewayPaymentDescription")}>
                        <Textarea
                            value={gatewayForm.paypalDescription}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalDescription: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label={t("setup.paymentGateways.testMode")}>
                        <RadioGroup
                            value={gatewayForm.paypalTestMode ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, paypalTestMode: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="pp-test-yes" />
                                <Label htmlFor="pp-test-yes">{t("common.yes")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="pp-test-no" />
                                <Label htmlFor="pp-test-no">{t("common.no")}</Label>
                            </div>
                        </RadioGroup>
                    </SettingsField>

                    <SettingsSaveButton onClick={handleSave} loading={saving} />
                </SettingsSection>
            </TabsContent>
        </div>
    );
}
