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

export default function CustomersConfigPage() {
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
            toast.success("Customer settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Customers Configuration</h1>
                <p className="text-gray-500 mt-1">
                    Manage customer portal settings, registration, and defaults
                </p>
            </div>

            <SettingsSection title="Defaults & Portal" description="Default settings for new customers">
                <SettingsField label="Default customers theme">
                    <Select
                        value={customerForm.customerDefaultTheme}
                        onValueChange={(val) => setCustomerForm({ ...customerForm, customerDefaultTheme: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="perfex">Perfex</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Default Country">
                    <Select
                        value={customerForm.customerDefaultCountry}
                        onValueChange={(val) =>
                            setCustomerForm({ ...customerForm, customerDefaultCountry: val })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Nothing selected" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            {/* Add more countries as needed */}
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Visible Tabs (Profile)">
                    <Select
                        value={customerForm.customerVisibleTabs[0] || "all"}
                        onValueChange={(val) =>
                            setCustomerForm({ ...customerForm, customerVisibleTabs: [val] })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select tabs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Required fields for registration (customers area)">
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="First Name - Contact, Last Name - Contact, Email Address - Contact, Company - Company" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Default Fields</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title="Permissions & Rules" description="Access control and registration rules">
                {[
                    { key: "customerCompanyFieldRequired", label: "Company field is required?" },
                    {
                        key: "customerCompanyVatRequired",
                        label: "Company requires the usage of the VAT Number field",
                    },
                    { key: "customerAllowRegistration", label: "Allow customers to register" },
                    {
                        key: "customerRequiresRegistrationConfirmation",
                        label: "Require registration confirmation from administrator after customer register",
                    },
                    {
                        key: "customerAllowPrimaryContactManageContacts",
                        label: "Allow primary contact to manage other customer contacts",
                    },
                    { key: "customerEnableHoneypot", label: "Enable Honeypot spam validation" },
                    {
                        key: "customerAllowPrimaryContactViewBilling",
                        label: "Allow primary contact to view/edit billing & shipping details",
                    },
                    {
                        key: "customerContactsSeeOwnFilesOnly",
                        label: "Contacts see only own files uploaded in customer area (files uploaded in customer profile)",
                        help: true,
                    },
                    {
                        key: "customerAllowContactsDeleteOwnFiles",
                        label: "Allow contacts to delete own files uploaded from customers area",
                    },
                    { key: "customerUseKnowledgeBase", label: "Use Knowledge Base", help: true },
                    {
                        key: "customerAllowKnowledgeBaseWithoutRegistration",
                        label: "Allow knowledge base to be viewed without registration",
                    },
                ].map((item: any) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                            {item.label}
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
                                    Yes
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`cust-${item.key}-no`} />
                                <Label htmlFor={`cust-${item.key}-no`} className="font-normal">
                                    No
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title="Feature Visibility" description="Toggle features in customer area">
                <div className="flex items-center justify-between">
                    <Label>Show Estimate request link in customers area?</Label>
                    <Select
                        value={customerForm.customerShowEstimateRequestLink ? "yes" : "no"}
                        onValueChange={(val) =>
                            setCustomerForm({ ...customerForm, customerShowEstimateRequestLink: val === "yes" })
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="yes">Estimate Request</SelectItem>
                            <SelectItem value="no">Hide</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </SettingsSection>

            <SettingsSection title="Default Permissions" description="Default permissions for new contacts">
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
                                    {perm}
                                </Label>
                            </div>
                        )
                    )}
                </div>
            </SettingsSection>

            <SettingsSection title="Formatting" description="Display format for customer info">
                <SettingsField label="Customer Information Format (PDF and HTML)">
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
