"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { useTranslation } from "@/lib/i18n";

export default function CompanyInfoPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const { user } = useAuth();
    const { t } = useTranslation();

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
                // Runs server-side via the Admin SDK: the tenant-isolated `organizations`
                // rule denies a client-side cross-org subdomain query.
                const token = await user?.getIdToken();
                const res = await fetch("/api/organizations/check-subdomain", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ subdomain: localSubdomain }),
                });
                if (!res.ok) throw new Error("check failed");
                const data: { available: boolean; reason?: string } = await res.json();
                setAvailability(data.available ? "available" : "unavailable");
                setCheckError(
                    data.available
                        ? ""
                        : data.reason === "invalid"
                          ? t("setup.companyInfo.subdomainInvalid")
                          : data.reason === "reserved"
                            ? t("setup.companyInfo.subdomainReserved")
                            : t("setup.companyInfo.subdomainTaken")
                );
            } catch {
                setCheckError(t("setup.companyInfo.subdomainCheckError"));
                setAvailability("unavailable");
            }
        };
        const timeoutId = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timeoutId);
    }, [localSubdomain, settings.subdomain, user, t]);

    const handleSaveGeneral = async () => {
        if (availability === "unavailable") {
            toast.error(t("setup.companyInfo.subdomainNotAvailable"));
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
            toast.success(t("setup.companyInfo.generalSaved"));
        } catch (error) {
            toast.error(t("setup.companyInfo.saveFailed"));
        }
    };

    const handleSaveCompanyInfo = async () => {
        await saveSettings({
            ...companyInfo,
            companyName,
        });
        toast.success(t("setup.companyInfo.companyInfoSaved"));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.companyInfo.title")}</h1>
                <p className="text-gray-500 mt-1">{t("setup.companyInfo.subtitle")}</p>
            </div>

            {/* General Configuration */}
            <SettingsSection title={t("setup.companyInfo.generalConfigTitle")} description={t("setup.companyInfo.generalConfigDescription")}>
                <SettingsField label={t("setup.companyInfo.subdomainLabel")} description={t("setup.companyInfo.subdomainDescription")}>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">https://</span>
                        <Input
                            value={localSubdomain}
                            onChange={(e) => setLocalSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            placeholder="my-org"
                            className="max-w-[200px]"
                        />
                        <span className="text-gray-500 font-medium">.dosory.com</span>
                    </div>
                    {availability === "loading" && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> {t("setup.companyInfo.checkingAvailability")}
                        </p>
                    )}
                    {availability === "available" && localSubdomain !== settings.subdomain && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Check className="h-3 w-3" /> {t("setup.companyInfo.subdomainAvailable")}
                        </p>
                    )}
                    {availability === "unavailable" && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <X className="h-3 w-3" /> {checkError}
                        </p>
                    )}
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.rtlAdminLabel")}>
                    <RadioGroup value={rtlAdmin} onValueChange={setRtlAdmin}>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="rtl-admin-yes" />
                                <Label htmlFor="rtl-admin-yes">{t("common.yes")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="rtl-admin-no" />
                                <Label htmlFor="rtl-admin-no">{t("common.no")}</Label>
                            </div>
                        </div>
                    </RadioGroup>
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.rtlCustomerLabel")}>
                    <RadioGroup value={rtlCustomer} onValueChange={setRtlCustomer}>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="rtl-customer-yes" />
                                <Label htmlFor="rtl-customer-yes">{t("common.yes")}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="rtl-customer-no" />
                                <Label htmlFor="rtl-customer-no">{t("common.no")}</Label>
                            </div>
                        </div>
                    </RadioGroup>
                </SettingsField>

                <SettingsSaveButton onClick={handleSaveGeneral} loading={saving} />
            </SettingsSection>

            {/* Company Details */}
            <SettingsSection
                title={t("setup.companyInfo.companyDetailsTitle")}
                description={t("setup.companyInfo.companyDetailsDescription")}
            >
                <SettingsField label={t("setup.companyInfo.companyNameLabel")} required>
                    <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={t("setup.companyInfo.companyNamePlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.addressLabel")}>
                    <Input
                        value={companyInfo.address}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder={t("setup.companyInfo.addressPlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.cityLabel")}>
                    <Input
                        value={companyInfo.city}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder={t("setup.companyInfo.cityPlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.stateLabel")}>
                    <Input
                        value={companyInfo.state}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, state: e.target.value }))}
                        placeholder={t("setup.companyInfo.statePlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.countryLabel")}>
                    <Input
                        value={companyInfo.country}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, country: e.target.value }))}
                        placeholder={t("setup.companyInfo.countryPlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.zipCodeLabel")}>
                    <Input
                        value={companyInfo.zipCode}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, zipCode: e.target.value }))}
                        placeholder={t("setup.companyInfo.zipCodePlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("common.phone")}>
                    <Input
                        value={companyInfo.phone}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder={t("setup.companyInfo.phonePlaceholder")}
                    />
                </SettingsField>

                <SettingsField label={t("setup.companyInfo.vatNumberLabel")}>
                    <Input
                        value={companyInfo.vatNumber}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, vatNumber: e.target.value }))}
                        placeholder={t("setup.companyInfo.vatNumberPlaceholder")}
                    />
                </SettingsField>

                <SettingsField
                    label={t("setup.companyInfo.companyInfoFormatLabel")}
                    description={
                        <>
                            {t("setup.companyInfo.availableVariables")} <span className="text-blue-600">{"{company_name}"}</span>,{" "}
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
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, companyInfoFormat: e.target.value }))}
                    />
                </SettingsField>

                <SettingsSaveButton onClick={handleSaveCompanyInfo} loading={saving} />
            </SettingsSection>
        </div>
    );
}
