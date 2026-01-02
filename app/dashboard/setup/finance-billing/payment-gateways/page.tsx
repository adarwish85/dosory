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

export default function PaymentGatewaysPage() {
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
            toast.success("Payment gateway settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Gateways</h1>
                <p className="text-gray-500 mt-1">
                    Configure online payment methods and gateway settings
                </p>
            </div>

            <Tabs value={activeGatewayTab} onValueChange={setActiveGatewayTab} className="bg-white p-1 rounded-lg border w-fit">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="paypal">Paypal</TabsTrigger>
                </TabsList>
            </Tabs>

            <TabsContent value="general" className="mt-6 space-y-6">
                <SettingsSection title="Notification & Behavior" description="General payment behavior">
                    <div className="flex items-center justify-between border-b pb-4">
                        <Label>Receive notification when customer pay invoice (built-in)</Label>
                        <RadioGroup
                            value={gatewayForm.paymentNotificationEmail ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, paymentNotificationEmail: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="ntf-yes" />
                                <Label htmlFor="ntf-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="ntf-no" />
                                <Label htmlFor="ntf-no">No</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label>Allow customer to modify the amount to pay (for online payments)</Label>
                        <RadioGroup
                            value={gatewayForm.allowCustomerModifyAmount ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, allowCustomerModifyAmount: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="mod-yes" />
                                <Label htmlFor="mod-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="mod-no" />
                                <Label htmlFor="mod-no">No</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <SettingsSaveButton onClick={handleSave} loading={saving} />
                </SettingsSection>
            </TabsContent>

            <TabsContent value="paypal" className="mt-6 space-y-6">
                <SettingsSection title="PayPal Configuration" description="Configure PayPal Standard integration">
                    <SettingsField label="Active">
                        <RadioGroup
                            value={gatewayForm.paypalActive ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, paypalActive: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="pp-act-yes" />
                                <Label htmlFor="pp-act-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="pp-act-no" />
                                <Label htmlFor="pp-act-no">No</Label>
                            </div>
                        </RadioGroup>
                    </SettingsField>

                    <SettingsField label="Label">
                        <Input
                            value={gatewayForm.paypalLabel}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalLabel: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label="PayPal API Username">
                        <Input
                            value={gatewayForm.paypalUsername}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalUsername: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label="PayPal API Password">
                        <Input
                            type="password"
                            value={gatewayForm.paypalPassword}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalPassword: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label="API Signature">
                        <Input
                            type="password"
                            value={gatewayForm.paypalSignature}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalSignature: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label="Comma Separated Currencies">
                        <Input
                            value={gatewayForm.paypalCurrencies}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalCurrencies: e.target.value })}
                            placeholder="USD,EUR,GBP"
                        />
                    </SettingsField>

                    <SettingsField label="Gateway Dashboard Payment Description">
                        <Textarea
                            value={gatewayForm.paypalDescription}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, paypalDescription: e.target.value })}
                        />
                    </SettingsField>

                    <SettingsField label="Test Mode">
                        <RadioGroup
                            value={gatewayForm.paypalTestMode ? "yes" : "no"}
                            onValueChange={(val) =>
                                setGatewayForm({ ...gatewayForm, paypalTestMode: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="pp-test-yes" />
                                <Label htmlFor="pp-test-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="pp-test-no" />
                                <Label htmlFor="pp-test-no">No</Label>
                            </div>
                        </RadioGroup>
                    </SettingsField>

                    <SettingsSaveButton onClick={handleSave} loading={saving} />
                </SettingsSection>
            </TabsContent>
        </div>
    );
}
