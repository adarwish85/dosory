"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { useTranslation } from "@/lib/i18n";

export default function CustomersConfigPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [customerForm, setCustomerForm] = useState({
        customerDefaultTheme: "perfex",
        customerDefaultCountry: "",
        customerVisibleTabs: ["all"],
        customerRequiredRegistrationFields: ["default"],
        customerCompanyFieldRequired: false,
        customerCompanyVatRequired: false,
        customerAllowRegistration: false,
        customerRequiresRegistrationConfirmation: false,
        customerAllowPrimaryContactManageContacts: false,
        customerEnableHoneypot: false,
        customerAllowPrimaryContactViewBilling: false,
        customerContactsSeeOwnFilesOnly: false,
        customerAllowContactsDeleteOwnFiles: false,
        customerUseKnowledgeBase: false,
        customerAllowKnowledgeBaseWithoutRegistration: false,
        customerShowEstimateRequestLink: false,
        customerDefaultContactPermissions: [] as string[],
        customerInfoFormat: "",
    });

    useEffect(() => {
        if (!loading) {
            setCustomerForm({
                customerDefaultTheme: settings.customerDefaultTheme ?? "perfex",
                customerDefaultCountry: settings.customerDefaultCountry ?? "",
                customerVisibleTabs: settings.customerVisibleTabs ?? ["all"],
                customerRequiredRegistrationFields: settings.customerRequiredRegistrationFields ?? ["default"],
                customerCompanyFieldRequired: settings.customerCompanyFieldRequired ?? false,
                customerCompanyVatRequired: settings.customerCompanyVatRequired ?? false,
                customerAllowRegistration: settings.customerAllowRegistration ?? false,
                customerRequiresRegistrationConfirmation: settings.customerRequiresRegistrationConfirmation ?? false,
                customerAllowPrimaryContactManageContacts: settings.customerAllowPrimaryContactManageContacts ?? false,
                customerEnableHoneypot: settings.customerEnableHoneypot ?? false,
                customerAllowPrimaryContactViewBilling: settings.customerAllowPrimaryContactViewBilling ?? false,
                customerContactsSeeOwnFilesOnly: settings.customerContactsSeeOwnFilesOnly ?? false,
                customerAllowContactsDeleteOwnFiles: settings.customerAllowContactsDeleteOwnFiles ?? false,
                customerUseKnowledgeBase: settings.customerUseKnowledgeBase ?? false,
                customerAllowKnowledgeBaseWithoutRegistration: settings.customerAllowKnowledgeBaseWithoutRegistration ?? false,
                customerShowEstimateRequestLink: settings.customerShowEstimateRequestLink ?? false,
                customerDefaultContactPermissions: settings.customerDefaultContactPermissions ?? [],
                customerInfoFormat: settings.customerInfoFormat ?? "",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(customerForm as Partial<OrganizationSettings>);
            toast.success(t("setup.customersConfig.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.customersConfig.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.customersConfig.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.customersConfig.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.customersConfig.defaultsSectionTitle")} description={t("setup.customersConfig.defaultsSectionDesc")}>
                <SettingsField label={t("setup.customersConfig.defaultTheme")}>
                    <Select
                        value={customerForm.customerDefaultTheme}
                        onValueChange={(val) => setCustomerForm({ ...customerForm, customerDefaultTheme: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.customersConfig.selectTheme")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="perfex">Perfex</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.customersConfig.defaultCountry")}>
                    <Select
                        value={customerForm.customerDefaultCountry}
                        onValueChange={(val) =>
                            setCustomerForm({ ...customerForm, customerDefaultCountry: val })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.customersConfig.nothingSelected")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="us">{t("setup.customersConfig.unitedStates")}</SelectItem>
                            {/* Add more countries as needed */}
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.customersConfig.visibleTabs")}>
                    <Select
                        value={customerForm.customerVisibleTabs[0] || "all"}
                        onValueChange={(val) =>
                            setCustomerForm({ ...customerForm, customerVisibleTabs: [val] })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.customersConfig.selectTabs")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("setup.customersConfig.all")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.customersConfig.requiredRegFields")}>
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.customersConfig.requiredRegFieldsPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">{t("setup.customersConfig.defaultFields")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.customersConfig.permissionsSectionTitle")} description={t("setup.customersConfig.permissionsSectionDesc")}>
                {[
                    { key: "customerCompanyFieldRequired", label: "setup.customersConfig.rule.companyFieldRequired" },
                    {
                        key: "customerCompanyVatRequired",
                        label: "setup.customersConfig.rule.companyVatRequired",
                    },
                    { key: "customerAllowRegistration", label: "setup.customersConfig.rule.allowRegistration" },
                    {
                        key: "customerRequiresRegistrationConfirmation",
                        label: "setup.customersConfig.rule.requiresRegConfirmation",
                    },
                    {
                        key: "customerAllowPrimaryContactManageContacts",
                        label: "setup.customersConfig.rule.primaryManageContacts",
                    },
                    { key: "customerEnableHoneypot", label: "setup.customersConfig.rule.enableHoneypot" },
                    {
                        key: "customerAllowPrimaryContactViewBilling",
                        label: "setup.customersConfig.rule.primaryViewBilling",
                    },
                    {
                        key: "customerContactsSeeOwnFilesOnly",
                        label: "setup.customersConfig.rule.contactsSeeOwnFiles",
                        help: true,
                    },
                    {
                        key: "customerAllowContactsDeleteOwnFiles",
                        label: "setup.customersConfig.rule.contactsDeleteOwnFiles",
                    },
                    { key: "customerUseKnowledgeBase", label: "setup.customersConfig.rule.useKnowledgeBase", help: true },
                    {
                        key: "customerAllowKnowledgeBaseWithoutRegistration",
                        label: "setup.customersConfig.rule.kbWithoutRegistration",
                    },
                ].map((item: any) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                            {t(item.label)}
                        </Label>
                        <RadioGroup
                            value={customerForm[item.key as keyof typeof customerForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setCustomerForm({ ...customerForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`cust-${item.key}-yes`} />
                                <Label htmlFor={`cust-${item.key}-yes`} className="font-normal">
                                    {t("common.yes")}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`cust-${item.key}-no`} />
                                <Label htmlFor={`cust-${item.key}-no`} className="font-normal">
                                    {t("common.no")}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title={t("setup.customersConfig.featureVisibilityTitle")} description={t("setup.customersConfig.featureVisibilityDesc")}>
                <div className="flex items-center justify-between">
                    <Label>{t("setup.customersConfig.showEstimateRequestLink")}</Label>
                    <Select
                        value={customerForm.customerShowEstimateRequestLink ? "yes" : "no"}
                        onValueChange={(val) =>
                            setCustomerForm({ ...customerForm, customerShowEstimateRequestLink: val === "yes" })
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="yes">{t("setup.customersConfig.estimateRequest")}</SelectItem>
                            <SelectItem value="no">{t("setup.customersConfig.hide")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </SettingsSection>

            <SettingsSection title={t("setup.customersConfig.defaultPermissionsTitle")} description={t("setup.customersConfig.defaultPermissionsDesc")}>
                <div className="space-y-2">
                    {["Invoices", "Estimates", "Contracts", "Support", "Projects"].map(
                        (perm) => (
                            <div key={perm} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`perm-${perm}`}
                                    checked={customerForm.customerDefaultContactPermissions.includes(
                                        perm.toLowerCase()
                                    )}
                                    onCheckedChange={(checked: boolean) => {
                                        const permKey = perm.toLowerCase();
                                        if (checked) {
                                            setCustomerForm({
                                                ...customerForm,
                                                customerDefaultContactPermissions: [
                                                    ...customerForm.customerDefaultContactPermissions,
                                                    permKey,
                                                ],
                                            });
                                        } else {
                                            setCustomerForm({
                                                ...customerForm,
                                                customerDefaultContactPermissions:
                                                    customerForm.customerDefaultContactPermissions.filter(
                                                        (p) => p !== permKey
                                                    ),
                                            });
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor={`perm-${perm}`}
                                    className="font-normal cursor-pointer select-none"
                                >
                                    {t(`setup.customersConfig.perm.${perm.toLowerCase()}`)}
                                </Label>
                            </div>
                        )
                    )}
                </div>
            </SettingsSection>

            <SettingsSection title={t("setup.customersConfig.formattingTitle")} description={t("setup.customersConfig.formattingDesc")}>
                <SettingsField label={t("setup.customersConfig.customerInfoFormat")}>
                    <Textarea
                        value={customerForm.customerInfoFormat}
                        onChange={(e) =>
                            setCustomerForm({ ...customerForm, customerInfoFormat: e.target.value })
                        }
                        className="h-32 font-mono text-sm"
                    />
                    <div className="mt-2 text-sm text-blue-500 space-x-2 flex flex-wrap gap-2">
                        <span>{`{company_name}`}</span>
                        <span>{`{customer_id}`}</span>
                        <span>{`{street}`}</span>
                        <span>{`{city}`}</span>
                        <span>{`{state}`}</span>
                        <span>{`{zip_code}`}</span>
                        <span>{`{country_code}`}</span>
                        <span>{`{country_name}`}</span>
                        <span>{`{phone}`}</span>
                        <span>{`{vat_number}`}</span>
                        <span>{`{vat_number_with_label}`}</span>
                    </div>
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}
