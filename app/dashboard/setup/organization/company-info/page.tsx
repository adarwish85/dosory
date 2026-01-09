"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function CompanyInfoPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();

    // General Settings State
    const [localSubdomain, setLocalSubdomain] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [mainDomain, setMainDomain] = useState("");
    const [rtlAdmin, setRtlAdmin] = useState("no");
    const [rtlCustomer, setRtlCustomer] = useState("no");
    const [availability, setAvailability] = useState<"idle" | "loading" | "available" | "unavailable">("idle");
    const [checkError, setCheckError] = useState("");

    // Company Information State
    const [companyInfo, setCompanyInfo] = useState({
        address: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        phone: "",
        vatNumber: "",
        companyInfoFormat:
            "{company_name}\\n{address}\\n{city} {state}\\n{country_code} {zip_code}\\n{vat_number_with_label}",
    });

    // Initialize from settings
    useEffect(() => {
        if (!loading) {
            setLocalSubdomain(settings.subdomain || "");
            setCompanyName(settings.companyName || "");
            setMainDomain(settings.mainDomain || "");
            setRtlAdmin(settings.rtlAdmin ? "yes" : "no");
            setRtlCustomer(settings.rtlCustomer ? "yes" : "no");

            setCompanyInfo({
                address: settings.address || "",
                city: settings.city || "",
                state: settings.state || "",
                country: settings.country || "",
                zipCode: settings.zipCode || "",
                phone: settings.phone || "",
                vatNumber: settings.vatNumber || "",
                companyInfoFormat:
                    settings.companyInfoFormat ||
                    "{company_name}\\n{address}\\n{city} {state}\\n{country_code} {zip_code}\\n{vat_number_with_label}",
            });
        }
    }, [loading, settings]);

    // Subdomain availability check
    useEffect(() => {
        if (!localSubdomain) {
            setAvailability("idle");
            return;
        }
        if (localSubdomain === settings.subdomain) {
            setAvailability("idle");
            return;
        }
        const checkAvailability = async () => {
            setAvailability("loading");
            try {
                const q = query(collection(db, "organizations"), where("subdomain", "==", localSubdomain));
                const snapshot = await getDocs(q);
                setAvailability(snapshot.empty ? "available" : "unavailable");
                setCheckError(snapshot.empty ? "" : "Subdomain is already taken");
            } catch (error) {
                setCheckError("Error checking availability");
                setAvailability("unavailable");
            }
        };
        const timeoutId = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timeoutId);
    }, [localSubdomain, settings.subdomain]);

    const handleSaveGeneral = async () => {
        if (availability === "unavailable") {
            toast.error("Subdomain is not available");
            return;
        }
        try {
            await saveSettings({
                companyName,
                subdomain: localSubdomain,
                mainDomain,
                rtlAdmin: rtlAdmin === "yes",
                rtlCustomer: rtlCustomer === "yes",
            });
            toast.success("General settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    const handleSaveCompanyInfo = async () => {
        await saveSettings({
            ...companyInfo,
            companyName,
        });
        toast.success("Company information saved successfully");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Information</h1>
                <p className="text-gray-500 mt-1">
                    Manage your company details and general configuration
                </p>
            </div>

            {/* General Configuration */}
            <SettingsSection title="General Configuration" description="Configure subdomain and RTL settings">
                <SettingsField
                    label="Subdomain"
                    description="This will change your dashboard URL"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">https://</span>
                        <Input
                            value={localSubdomain}
                            onChange={(e) =>
                                setLocalSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                            }
                            placeholder="my-org"
                            className="max-w-[200px]"
                        />
                        <span className="text-gray-500 font-medium">.dosory.com</span>
                    </div>
                    {availability === "loading" && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                        </p>
                    )}
                    {availability === "available" && localSubdomain !== settings.subdomain && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Subdomain is available
                        </p>
                    )}
                    {availability === "unavailable" && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <X className="h-3 w-3" /> {checkError}
                        </p>
                    )}
                </SettingsField>

                <SettingsField label="RTL Admin Area (Right to Left)">
                    <RadioGroup value={rtlAdmin} onValueChange={setRtlAdmin}>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="rtl-admin-yes" />
                                <Label htmlFor="rtl-admin-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="rtl-admin-no" />
                                <Label htmlFor="rtl-admin-no">No</Label>
                            </div>
                        </div>
                    </RadioGroup>
                </SettingsField>

                <SettingsField label="RTL Customers Area (Right to Left)">
                    <RadioGroup value={rtlCustomer} onValueChange={setRtlCustomer}>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="rtl-customer-yes" />
                                <Label htmlFor="rtl-customer-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="rtl-customer-no" />
                                <Label htmlFor="rtl-customer-no">No</Label>
                            </div>
                        </div>
                    </RadioGroup>
                </SettingsField>

                <SettingsSaveButton onClick={handleSaveGeneral} loading={saving} />
            </SettingsSection>

            {/* Company Details */}
            <SettingsSection
                title="Company Details"
                description="These details will appear on invoices, estimates, payments, and other PDF documents"
            >
                <SettingsField label="Company Name" required>
                    <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Enter your company name"
                    />
                </SettingsField>

                <SettingsField label="Address">
                    <Input
                        value={companyInfo.address}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter your address"
                    />
                </SettingsField>

                <SettingsField label="City">
                    <Input
                        value={companyInfo.city}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter your city"
                    />
                </SettingsField>

                <SettingsField label="State">
                    <Input
                        value={companyInfo.state}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, state: e.target.value }))}
                        placeholder="Enter your state"
                    />
                </SettingsField>

                <SettingsField label="Country Code">
                    <Input
                        value={companyInfo.country}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, country: e.target.value }))}
                        placeholder="Enter your country"
                    />
                </SettingsField>

                <SettingsField label="Zip Code">
                    <Input
                        value={companyInfo.zipCode}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="Enter your zip code"
                    />
                </SettingsField>

                <SettingsField label="Phone">
                    <Input
                        value={companyInfo.phone}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                    />
                </SettingsField>

                <SettingsField label="VAT Number">
                    <Input
                        value={companyInfo.vatNumber}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, vatNumber: e.target.value }))}
                        placeholder="Enter your VAT number"
                    />
                </SettingsField>

                <SettingsField
                    label="Company Information Format (PDF and HTML)"
                    description={
                        <>
                            Available variables:{" "}
                            <span className="text-blue-600">{"{company_name}"}</span>,{" "}
                            <span className="text-blue-600">{"{address}"}</span>,{" "}
                            <span className="text-blue-600">{"{city}"}</span>,{" "}
                            <span className="text-blue-600">{"{state}"}</span>,{" "}
                            <span className="text-blue-600">{"{zip_code}"}</span>,{" "}
                            <span className="text-blue-600">{"{country_code}"}</span>,{" "}
                            <span className="text-blue-600">{"{phone}"}</span>,{" "}
                            <span className="text-blue-600">{"{vat_number}"}</span>,{" "}
                            <span className="text-blue-600">{"{vat_number_with_label}"}</span>
                        </>
                    }
                >
                    <Textarea
                        className="min-h-[150px] font-mono text-sm"
                        value={companyInfo.companyInfoFormat}
                        onChange={(e) =>
                            setCompanyInfo((prev) => ({ ...prev, companyInfoFormat: e.target.value }))
                        }
                    />
                </SettingsField>

                <SettingsSaveButton onClick={handleSaveCompanyInfo} loading={saving} />
            </SettingsSection>
        </div>
    );
}
