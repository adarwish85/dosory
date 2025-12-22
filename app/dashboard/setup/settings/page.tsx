"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings as SettingsIcon, FileText, Globe, Mail, Wrench, HelpCircle, DollarSign, FileIcon, FileCheck, CreditCard, RefreshCw, CreditCard as PaymentIcon, Users, CheckCircle, Headphones, Target } from "lucide-react";
import { Trash2 } from "lucide-react";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { useEffect } from "react";
import { toast } from "sonner";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, X, Loader2 } from "lucide-react";

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState("general");
    const [activeEmailTab, setActiveEmailTab] = useState("smtp");

    // Use the hook
    const { settings, saveSettings, saving, loading, uploadLogo } = useOrganizationSettings();
    const [uploading, setUploading] = useState<"light" | "dark" | "favicon" | null>(null);

    const handleUpload = async (file: File, type: "light" | "dark" | "favicon") => {
        try {
            setUploading(type);
            await uploadLogo(file, type);
            toast.success(`${type === "favicon" ? "Favicon" : "Logo"} uploaded successfully`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(null);
        }
    };
    const [localSubdomain, setLocalSubdomain] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [mainDomain, setMainDomain] = useState("");
    const [rtlAdmin, setRtlAdmin] = useState("no");
    const [rtlCustomer, setRtlCustomer] = useState("no");
    const [allowedFileTypes, setAllowedFileTypes] = useState("");
    const [availability, setAvailability] = useState<"idle" | "loading" | "available" | "unavailable">("idle");
    const [checkError, setCheckError] = useState("");

    // Invoice Settings State
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
        invoiceNumberFormat: "number_based",
        invoiceDefaultClientNote: "",
        invoiceDefaultTerms: "",
    });

    useEffect(() => {
        if (!loading) {
            setInvoiceForm(prev => ({
                ...prev,
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
            }));
        }
    }, [loading, settings]);

    const handleSaveInvoiceSettings = async () => {
        await saveSettings(invoiceForm as any);
        toast.success("Invoice settings saved successfully");
    };

    // Finance General State
    const [financeGeneralForm, setFinanceGeneralForm] = useState({
        decimalSeparator: ".",
        thousandSeparator: ",",
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
            setFinanceGeneralForm(prev => ({
                ...prev,
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
            }));
        }
    }, [loading, settings]);

    const handleSaveFinanceGeneral = async () => {
        await saveSettings(financeGeneralForm as any);
        toast.success("Finance settings saved successfully");
    };

    // Finance Proposal State
    const [proposalForm, setProposalForm] = useState({
        proposalNumberPrefix: "PRO-",
        proposalDueAfterDays: 7,
        proposalPipelineLimit: 50,
        proposalPipelineSort: "pipeline_order",
        proposalPipelineSortOrder: "asc",
        proposalShowProjectName: true,
        proposalExcludeDrafts: true,
        proposalAutoConvert: false,
        proposalAllowStaffViewAssigned: true,
        proposalInfoFormat: "",
    });

    useEffect(() => {
        if (!loading) {
            setProposalForm(prev => ({
                ...prev,
                proposalNumberPrefix: settings.proposalNumberPrefix ?? "PRO-",
                proposalDueAfterDays: settings.proposalDueAfterDays ?? 7,
                proposalPipelineLimit: settings.proposalPipelineLimit ?? 50,
                proposalPipelineSort: settings.proposalPipelineSort ?? "pipeline_order",
                proposalPipelineSortOrder: settings.proposalPipelineSortOrder ?? "asc",
                proposalShowProjectName: settings.proposalShowProjectName ?? true,
                proposalExcludeDrafts: settings.proposalExcludeDrafts ?? true,
                proposalAutoConvert: settings.proposalAutoConvert ?? false,
                proposalAllowStaffViewAssigned: settings.proposalAllowStaffViewAssigned ?? true,
                proposalInfoFormat: settings.proposalInfoFormat ?? "{proposal_to}\n{address}\n{city} {state}\n{country_code} {zip_code}\n{phone}\n{email}",
            }));
        }
    }, [loading, settings]);

    const handleSaveProposalSettings = async () => {
        await saveSettings(proposalForm as any);
        toast.success("Proposal settings saved successfully");
    };

    // Finance Estimate State
    const [estimateForm, setEstimateForm] = useState({
        estimateNumberPrefix: "EST-",
        estimateNextNumber: "000001",
        estimateDueAfterDays: 7,
        estimateDeleteOnlyLast: false,
        estimateDecrementOnDelete: false,
        estimateAllowStaffViewAssigned: true,
        estimateRequireClientLogin: false,
        estimateShowSaleAgent: false,
        estimateShowProjectName: false,
        estimateAutoConvert: false,
        estimateExcludeDraftsFromClient: false,
        estimateNumberFormat: "number_based",
        estimatePipelineLimit: 50,
        estimatePipelineSort: "pipeline_order",
        estimatePipelineSortOrder: "asc",
        estimateDefaultClientNote: "",
        estimateDefaultTerms: "",
    });

    useEffect(() => {
        if (!loading) {
            setEstimateForm(prev => ({
                ...prev,
                estimateNumberPrefix: settings.estimateNumberPrefix ?? "EST-",
                estimateNextNumber: settings.estimateNextNumber ?? "000001",
                estimateDueAfterDays: settings.estimateDueAfterDays ?? 7,
                estimateDeleteOnlyLast: settings.estimateDeleteOnlyLast ?? false,
                estimateDecrementOnDelete: settings.estimateDecrementOnDelete ?? false,
                estimateAllowStaffViewAssigned: settings.estimateAllowStaffViewAssigned ?? true,
                estimateRequireClientLogin: settings.estimateRequireClientLogin ?? false,
                estimateShowSaleAgent: settings.estimateShowSaleAgent ?? false,
                estimateShowProjectName: settings.estimateShowProjectName ?? false,
                estimateAutoConvert: settings.estimateAutoConvert ?? false,
                estimateExcludeDraftsFromClient: settings.estimateExcludeDraftsFromClient ?? false,
                estimateNumberFormat: settings.estimateNumberFormat ?? "number_based",
                estimatePipelineLimit: settings.estimatePipelineLimit ?? 50,
                estimatePipelineSort: settings.estimatePipelineSort ?? "pipeline_order",
                estimatePipelineSortOrder: settings.estimatePipelineSortOrder ?? "asc",
                estimateDefaultClientNote: settings.estimateDefaultClientNote ?? "",
                estimateDefaultTerms: settings.estimateDefaultTerms ?? "",
            }));
        }
    }, [loading, settings]);

    const handleSaveEstimateSettings = async () => {
        await saveSettings(estimateForm as any);
        toast.success("Estimate settings saved successfully");
    };

    // Finance Credit Note State
    const [creditNoteForm, setCreditNoteForm] = useState({
        creditNoteNumberPrefix: "CN-",
        creditNoteNextNumber: "000001",
        creditNoteNumberFormat: "number_based",
        creditNoteDecrementOnDelete: false,
        creditNoteShowProjectName: false,
        creditNoteDefaultClientNote: "",
        creditNoteDefaultTerms: "",
    });

    useEffect(() => {
        if (!loading) {
            setCreditNoteForm(prev => ({
                ...prev,
                creditNoteNumberPrefix: settings.creditNoteNumberPrefix ?? "CN-",
                creditNoteNextNumber: settings.creditNoteNextNumber ?? "000001",
                creditNoteNumberFormat: settings.creditNoteNumberFormat ?? "number_based",
                creditNoteDecrementOnDelete: settings.creditNoteDecrementOnDelete ?? false,
                creditNoteShowProjectName: settings.creditNoteShowProjectName ?? false,
                creditNoteDefaultClientNote: settings.creditNoteDefaultClientNote ?? "",
                creditNoteDefaultTerms: settings.creditNoteDefaultTerms ?? "",
            }));
        }
    }, [loading, settings]);

    const handleSaveCreditNoteSettings = async () => {
        await saveSettings(creditNoteForm as any);
        toast.success("Credit Note settings saved successfully");
    };

    // Finance Payment Gateway State
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
        paypalDescription: "",
        paypalCurrencies: "USD",
        paypalTestMode: false,
        paypalDefaultSelected: false,
    });

    useEffect(() => {
        if (!loading) {
            setGatewayForm(prev => ({
                ...prev,
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
            }));
        }
    }, [loading, settings]);

    const handleSaveGatewaySettings = async () => {
        await saveSettings(gatewayForm as any);
        toast.success("Payment Gateway settings saved successfully");
    };

    useEffect(() => {
        if (!loading) {
            setLocalSubdomain(settings.subdomain || "");
            setCompanyName(settings.companyName || "");
            setMainDomain(settings.mainDomain || "");
            setRtlAdmin(settings.rtlAdmin ? "yes" : "no");
            setRtlCustomer(settings.rtlCustomer ? "yes" : "no");
            setAllowedFileTypes(settings.allowedFileTypes || "");
        }
    }, [loading, settings]);

    useEffect(() => {
        const checkAvailability = async () => {
            if (!localSubdomain || localSubdomain.length < 3) {
                setAvailability("idle");
                return;
            }

            if (localSubdomain === settings.subdomain) {
                setAvailability("available");
                return;
            }

            setAvailability("loading");
            try {
                const q = query(
                    collection(db, "organizations"),
                    where("subdomain", "==", localSubdomain)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setAvailability("unavailable");
                    setCheckError("Subdomain is already taken.");
                } else {
                    setAvailability("available");
                    setCheckError("");
                }
            } catch (error) {
                console.error("Error checking subdomain:", error);
                setAvailability("idle");
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
                allowedFileTypes
            });
            toast.success("Settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    const sidebarSections = [
        {
            title: "General",
            items: [
                { id: "general", label: "General", icon: SettingsIcon },
                { id: "company-information", label: "Company Information", icon: FileText },
                { id: "localization", label: "Localization", icon: Globe },
                { id: "email", label: "Email", icon: Mail },
                { id: "system-update", label: "System Update", icon: Wrench },
                { id: "system-info", label: "System/Server Info", icon: HelpCircle },
            ]
        },
        {
            title: "Finance",
            items: [
                { id: "finance-general", label: "General", icon: DollarSign },
                { id: "finance-invoices", label: "Invoices", icon: FileIcon },
                { id: "finance-proposals", label: "Proposals", icon: FileCheck },
                { id: "finance-estimates", label: "Estimates", icon: FileIcon },
                { id: "finance-credit-notes", label: "Credit Notes", icon: CreditCard },
                { id: "finance-subscriptions", label: "Subscriptions", icon: RefreshCw },
                { id: "finance-payment-gateways", label: "Payment Gateways", icon: PaymentIcon },
            ]
        },
        {
            title: "Configure Features",
            items: [
                { id: "customers", label: "Customers", icon: Users },
                { id: "tasks", label: "Tasks", icon: CheckCircle },
                { id: "support", label: "Support", icon: Headphones },
                { id: "leads", label: "Leads", icon: Target },
            ]
        },
    ];

    const renderContent = () => {
        if (activeSection === "general") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">General</h2>

                    <div className="space-y-4">
                        <div>
                            <Label>Company Logo Light (for dark backgrounds)</Label>
                            {settings.logoLight && (
                                <div className="mt-2 mb-2 relative w-fit">
                                    <div className="bg-gray-900 p-2 rounded-md">
                                        <img src={settings.logoLight} alt="Light Logo" className="h-12 object-contain" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                        onClick={() => saveSettings({ logoLight: "" })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUpload(file, "light");
                                    }}
                                    disabled={uploading === "light"}
                                />
                                {uploading === "light" && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>

                        <div>
                            <Label>Company Logo Dark (Standard)</Label>
                            {settings.logoDark && (
                                <div className="mt-2 mb-2 relative w-fit">
                                    <div className="bg-white p-2 rounded-md border">
                                        <img src={settings.logoDark} alt="Dark Logo" className="h-12 object-contain" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                        onClick={() => saveSettings({ logoDark: "" })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUpload(file, "dark");
                                    }}
                                    disabled={uploading === "dark"}
                                />
                                {uploading === "dark" && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>

                        <div>
                            <Label>Favicon</Label>
                            {settings.favicon && (
                                <div className="mt-2 mb-2 relative w-fit">
                                    <img src={settings.favicon} alt="Favicon" className="h-8 w-8 object-contain" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                        onClick={() => saveSettings({ favicon: "" })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    type="file"
                                    accept="image/x-icon,image/png"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUpload(file, "favicon");
                                    }}
                                    disabled={uploading === "favicon"}
                                />
                                {uploading === "favicon" && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>



                        <div>
                            <Label>Subdomain (Tenant URL)</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-gray-500 font-medium">https://</span>
                                <Input
                                    value={localSubdomain}
                                    onChange={(e) => setLocalSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
                            <p className="text-xs text-muted-foreground mt-1">
                                This will change your dashboard URL.
                            </p>
                        </div>

                        <div>
                            <Label>Custom Domain (Optional)</Label>
                            <Input
                                value={mainDomain}
                                placeholder="https://my-domain.com"
                                onChange={(e) => setMainDomain(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label className="mb-3 block">RTL Admin Area (Right to Left)</Label>
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
                        </div>

                        <div>
                            <Label className="mb-3 block">RTL Customers Area (Right to Left)</Label>
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
                        </div>

                        <div>
                            <Label>Allowed file types</Label>
                            <Input value={allowedFileTypes} onChange={(e) => setAllowedFileTypes(e.target.value)} />
                            <p className="text-sm text-gray-500 mt-1">
                                Separate file extensions with commas
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveGeneral}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "company-information") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Company Information</h2>

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                        <p className="text-sm text-blue-900">
                            These information will be displayed on invoices/estimates/payments and other PDF documents where company info is required
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label>Company Name</Label>
                            <Input defaultValue="WasilaDev" />
                        </div>

                        <div>
                            <Label>Address</Label>
                            <Input defaultValue="3a Mabotheen Buildings, Nasr City" />
                        </div>

                        <div>
                            <Label>City</Label>
                            <Input defaultValue="Cairo" />
                        </div>

                        <div>
                            <Label>State</Label>
                            <Input defaultValue="Cairo" />
                        </div>

                        <div>
                            <Label>Country Code</Label>
                            <Input defaultValue="Egypt" />
                        </div>

                        <div>
                            <Label>Zip Code</Label>
                            <Input defaultValue="11521" />
                        </div>

                        <div>
                            <Label>Phone</Label>
                            <Input defaultValue="+201000081160" />
                        </div>

                        <div>
                            <Label>VAT Number</Label>
                            <Input />
                        </div>

                        <div>
                            <Label>Company Information Format (PDF and HTML)</Label>
                            <Textarea
                                className="min-h-[150px] font-mono text-sm"
                                defaultValue={`{company_name}
{address}
{city} {state}
{country_code} {zip_code}
{vat_number_with_label}`}
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                <span className="text-blue-600">{"{company_name}"}</span> <span className="text-blue-600">{"{address}"}</span>, <span className="text-blue-600">{"{city}"}</span>, <span className="text-blue-600">{"{state}"}</span>, <span className="text-blue-600">{"{zip_code}"}</span>, <span className="text-blue-600">{"{country_code}"}</span>, <span className="text-blue-600">{"{phone}"}</span>, <span className="text-blue-600">{"{vat_number}"}</span>, <span className="text-blue-600">{"{vat_number_with_label}"}</span>
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                Save Settings
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "localization") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Localization</h2>

                    <div className="space-y-4">
                        <div>
                            <Label>Date Format</Label>
                            <Select defaultValue="d/m/Y">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="d/m/Y">d/m/Y</SelectItem>
                                    <SelectItem value="m/d/Y">m/d/Y</SelectItem>
                                    <SelectItem value="Y-m-d">Y-m-d</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Time Format</Label>
                            <Select defaultValue="12">
                                <SelectTrigger>
                                    <SelectValue>12 hours</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12 hours</SelectItem>
                                    <SelectItem value="24">24 hours</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Default Timezone</Label>
                            <Select defaultValue="Africa/Cairo">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Africa/Cairo">Africa/Cairo</SelectItem>
                                    <SelectItem value="America/New_York">America/New York</SelectItem>
                                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Default Language</Label>
                            <Select defaultValue="english">
                                <SelectTrigger>
                                    <SelectValue>English</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="english">English</SelectItem>
                                    <SelectItem value="arabic">Arabic</SelectItem>
                                    <SelectItem value="spanish">Spanish</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Enabled Languages</Label>
                            <Select defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue>All</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="selected">Selected Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-3 block">Disable Languages</Label>
                            <RadioGroup defaultValue="no">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="disable-lang-yes" />
                                        <Label htmlFor="disable-lang-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="disable-lang-no" />
                                        <Label htmlFor="disable-lang-no">No</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label className="mb-3 block flex items-center gap-2">
                                <HelpCircle className="h-4 w-4" />
                                Output client PDF documents from admin area in client language
                            </Label>
                            <RadioGroup defaultValue="no">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="pdf-lang-yes" />
                                        <Label htmlFor="pdf-lang-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="pdf-lang-no" />
                                        <Label htmlFor="pdf-lang-no">No</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="pt-4">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                Save Settings
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-general") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">General</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label className="mb-2 block">Decimal Separator</Label>
                                <Select
                                    value={financeGeneralForm.decimalSeparator}
                                    onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, decimalSeparator: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select separator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value=".">. (Dot)</SelectItem>
                                        <SelectItem value=",">, (Comma)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-2 block">Thousand Separator</Label>
                                <Select
                                    value={financeGeneralForm.thousandSeparator}
                                    onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, thousandSeparator: val })}
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
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block flex items-center gap-2">
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                                Number padding zero's for prefix formats
                            </Label>
                            <p className="text-sm text-gray-500 mb-2">eq. If this value is 3 the number will be formatted: 005 or 025</p>
                            <Input
                                type="number"
                                value={financeGeneralForm.numberPadding}
                                onChange={e => setFinanceGeneralForm({ ...financeGeneralForm, numberPadding: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "autoAssignSaleAgent", label: "Automatically assign logged in staff as sale agent" },
                                { key: "showTaxPerItem", label: "Show TAX per item" },
                                { key: "removeTaxNameFromRow", label: "Remove the tax name from item table row" },
                                { key: "excludeCurrencySymbol", label: "Exclude currency symbol from items table Amount" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4 text-gray-400" />
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={financeGeneralForm[item.key as keyof typeof financeGeneralForm] ? "yes" : "no"}
                                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`fg-${item.key}-yes`} />
                                            <Label htmlFor={`fg-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`fg-${item.key}-no`} />
                                            <Label htmlFor={`fg-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Label className="mb-2 block">Default Tax</Label>
                            <Select
                                value={financeGeneralForm.defaultTax}
                                onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, defaultTax: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Tax" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0.00">0.00% (No Tax)</SelectItem>
                                    <SelectItem value="14.00%">14.00% (VAT)</SelectItem>
                                    <SelectItem value="5.00%">5.00%</SelectItem>
                                    <SelectItem value="10.00%">10.00%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <Label className="mb-2 block">Remove decimals on numbers/money with zero decimals (2.00 will become 2, 2.25 will stay 2.25)</Label>
                                <RadioGroup
                                    value={financeGeneralForm.removeDecimalsOnZero ? "yes" : "no"}
                                    onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, removeDecimalsOnZero: val === "yes" })}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="rm-dec-yes" />
                                        <Label htmlFor="rm-dec-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="rm-dec-no" />
                                        <Label htmlFor="rm-dec-no">No</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium mb-4">Amount to words</h3>
                            <p className="text-sm text-gray-500 mb-4">Output total amount to words in invoice/estimate/proposal</p>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <Label className="mb-2 block">Enable</Label>
                                    <RadioGroup
                                        value={financeGeneralForm.amountToWordsEnable ? "yes" : "no"}
                                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, amountToWordsEnable: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="atw-en-yes" />
                                            <Label htmlFor="atw-en-yes">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="atw-en-no" />
                                            <Label htmlFor="atw-en-no">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Number words into lowercase</Label>
                                    <RadioGroup
                                        value={financeGeneralForm.amountToWordsLowercase ? "yes" : "no"}
                                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, amountToWordsLowercase: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="atw-lc-yes" />
                                            <Label htmlFor="atw-lc-yes">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="atw-lc-no" />
                                            <Label htmlFor="atw-lc-no">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveFinanceGeneral}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-invoices") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Invoices</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Invoice Number Prefix</Label>
                                <Input
                                    value={invoiceForm.invoiceNumberPrefix}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Next Invoice Number</Label>
                                <Input
                                    value={invoiceForm.invoiceNumberPrefix === "number_based" ? invoiceForm.invoiceNextNumber : invoiceForm.invoiceNextNumber}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNextNumber: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Invoice due after (days)</Label>
                                <Input
                                    type="number"
                                    value={invoiceForm.invoiceDueAfterDays}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDueAfterDays: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Boolean Settings */}
                        <div className="space-y-6">
                            {[
                                { key: "invoiceAllowStaffViewAssigned", label: "Allow staff members to view invoices where they are assigned to" },
                                { key: "invoiceRequireClientLogin", label: "Require client to be logged in to view invoice" },
                                { key: "invoiceDeleteOnlyLast", label: "Delete invoice allowed only on last invoice" },
                                { key: "invoiceDecrementOnDelete", label: "Decrement invoice number on delete" },
                                { key: "invoiceExcludeDraftsFromClient", label: "Exclude invoices with draft status from customers area" },
                                { key: "invoiceShowSaleAgent", label: "Show Sale Agent On Invoice" },
                                { key: "invoiceShowProjectName", label: "Show Project Name On Invoice" },
                                { key: "invoiceShowTotalPaid", label: "Show Total Paid On Invoice" },
                                { key: "invoiceShowCreditsApplied", label: "Show Credits Applied On Invoice" },
                                { key: "invoiceShowAmountDue", label: "Show Amount Due On Invoice" },
                                { key: "invoiceAttachPdfToEmail", label: "Attach invoice PDF when sending payment receipt to email" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">{item.label}</Label>
                                    <RadioGroup
                                        value={invoiceForm[item.key as keyof typeof invoiceForm] ? "yes" : "no"}
                                        onValueChange={(val) => setInvoiceForm({ ...invoiceForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`${item.key}-yes`} />
                                            <Label htmlFor={`${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`${item.key}-no`} />
                                            <Label htmlFor={`${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        {/* Number Format */}
                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Invoice Number Format</Label>
                            <RadioGroup
                                value={invoiceForm.invoiceNumberFormat}
                                onValueChange={(val) => setInvoiceForm({ ...invoiceForm, invoiceNumberFormat: val as any })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="number_based" id="fmt-number" />
                                    <Label htmlFor="fmt-number" className="font-normal">Number Based (000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="year_based" id="fmt-year" />
                                    <Label htmlFor="fmt-year" className="font-normal">Year Based (YYYY/000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mixed" id="fmt-mixed" />
                                    <Label htmlFor="fmt-mixed" className="font-normal">000001-YY</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Predefined Client Note</Label>
                                <Textarea
                                    value={invoiceForm.invoiceDefaultClientNote}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDefaultClientNote: e.target.value })}
                                    className="h-24"
                                    placeholder="Thank you for doing business with us..."
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Predefined Terms & Conditions</Label>
                                <Textarea
                                    value={invoiceForm.invoiceDefaultTerms}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDefaultTerms: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={() => saveSettings(invoiceForm as any)}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-proposals") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Proposals</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Proposal Number Prefix</Label>
                                <Input
                                    value={proposalForm.proposalNumberPrefix}
                                    onChange={e => setProposalForm({ ...proposalForm, proposalNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Proposal Due After (days)</Label>
                                <Input
                                    type="number"
                                    value={proposalForm.proposalDueAfterDays}
                                    onChange={e => setProposalForm({ ...proposalForm, proposalDueAfterDays: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Pipeline limit per status</Label>
                                <Input
                                    type="number"
                                    value={proposalForm.proposalPipelineLimit}
                                    onChange={e => setProposalForm({ ...proposalForm, proposalPipelineLimit: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Sort */}
                        <div className="space-y-2">
                            <Label>Default pipeline sort</Label>
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                <Select
                                    value={proposalForm.proposalPipelineSort}
                                    onValueChange={(val) => setProposalForm({ ...proposalForm, proposalPipelineSort: val as any })}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sort By" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pipeline_order">Pipeline Order</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                                <RadioGroup
                                    value={proposalForm.proposalPipelineSortOrder}
                                    onValueChange={(val) => setProposalForm({ ...proposalForm, proposalPipelineSortOrder: val as any })}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="asc" id="sort-asc" />
                                        <Label htmlFor="sort-asc">Ascending</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="desc" id="sort-desc" />
                                        <Label htmlFor="sort-desc">Descending</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "proposalShowProjectName", label: "Show Project Name On Proposal" },
                                { key: "proposalExcludeDrafts", label: "Exclude proposals with draft status from customers area" },
                                { key: "proposalAutoConvert", label: "Auto convert the proposal to invoice after client accept (only customers related proposals)" },
                                { key: "proposalAllowStaffViewAssigned", label: "Allow staff members to view proposals where they are assigned to" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">{item.label}</Label>
                                    <RadioGroup
                                        value={proposalForm[item.key as keyof typeof proposalForm] ? "yes" : "no"}
                                        onValueChange={(val) => setProposalForm({ ...proposalForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`pf-${item.key}-yes`} />
                                            <Label htmlFor={`pf-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`pf-${item.key}-no`} />
                                            <Label htmlFor={`pf-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        <div>
                            <Label className="mb-2 block">Proposal Info Format (PDF and HTML)</Label>
                            <Textarea
                                value={proposalForm.proposalInfoFormat}
                                onChange={e => setProposalForm({ ...proposalForm, proposalInfoFormat: e.target.value })}
                                className="h-32 font-mono text-sm"
                            />
                            <p className="mt-2 text-xs text-blue-600 break-all">
                                {`{proposal_to}, {address}, {city}, {state}, {zip_code}, {country_code}, {country_name}, {phone}, {email}`}
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveProposalSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-estimates") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Estimates</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Estimate Number Prefix</Label>
                                <Input
                                    value={estimateForm.estimateNumberPrefix}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Next estimate Number</Label>
                                <Input
                                    value={estimateForm.estimateNextNumber}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateNextNumber: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Estimate Due After (days)</Label>
                                <Input
                                    type="number"
                                    value={estimateForm.estimateDueAfterDays}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateDueAfterDays: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "estimateDeleteOnlyLast", label: "Delete estimate allowed only on last invoice" }, // using last invoice label as per screenshot? "last invoice" text seems like copy paste error in design or actual text. I'll use text from screenshot "Delete estimate allowed only on last invoice"
                                { key: "estimateDecrementOnDelete", label: "Decrement estimate number on delete" },
                                { key: "estimateAllowStaffViewAssigned", label: "Allow staff members to view estimates where they are assigned to" },
                                { key: "estimateRequireClientLogin", label: "Require client to be logged in to view estimate" },
                                { key: "estimateShowSaleAgent", label: "Show Sale Agent On Estimate" },
                                { key: "estimateShowProjectName", label: "Show Project Name On Estimate" },
                                { key: "estimateAutoConvert", label: "Auto convert the estimate to invoice after client accept" },
                                { key: "estimateExcludeDraftsFromClient", label: "Exclude estimates with draft status from customers area" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        {(item.key === "estimateNextNumber" || item.key === "estimateDueAfterDays" || item.key === "estimateDecrementOnDelete") && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={estimateForm[item.key as keyof typeof estimateForm] ? "yes" : "no"}
                                        onValueChange={(val) => setEstimateForm({ ...estimateForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`ef-${item.key}-yes`} />
                                            <Label htmlFor={`ef-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`ef-${item.key}-no`} />
                                            <Label htmlFor={`ef-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        {/* Number Format */}
                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Estimate Number Format</Label>
                            <RadioGroup
                                value={estimateForm.estimateNumberFormat}
                                onValueChange={(val) => setEstimateForm({ ...estimateForm, estimateNumberFormat: val as any })}
                                className="flex gap-4 flex-wrap"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="number_based" id="est-fmt-number" />
                                    <Label htmlFor="est-fmt-number" className="font-normal">Number Based (000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="year_based" id="est-fmt-year" />
                                    <Label htmlFor="est-fmt-year" className="font-normal">Year Based (YYYY/000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mixed" id="est-fmt-mixed" />
                                    <Label htmlFor="est-fmt-mixed" className="font-normal">000001-YY</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="date_based" id="est-fmt-date" />
                                    <Label htmlFor="est-fmt-date" className="font-normal">000001/MM/YYYY</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>Pipeline limit per status</Label>
                                <Input
                                    type="number"
                                    value={estimateForm.estimatePipelineLimit}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimatePipelineLimit: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Sort */}
                        <div className="space-y-2">
                            <Label>Default pipeline sort</Label>
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                <Select
                                    value={estimateForm.estimatePipelineSort}
                                    onValueChange={(val) => setEstimateForm({ ...estimateForm, estimatePipelineSort: val as any })}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sort By" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pipeline_order">Pipeline Order</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                                <RadioGroup
                                    value={estimateForm.estimatePipelineSortOrder}
                                    onValueChange={(val) => setEstimateForm({ ...estimateForm, estimatePipelineSortOrder: val as any })}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="asc" id="est-sort-asc" />
                                        <Label htmlFor="est-sort-asc">Ascending</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="desc" id="est-sort-desc" />
                                        <Label htmlFor="est-sort-desc">Descending</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Predefined Client Note</Label>
                                <Textarea
                                    value={estimateForm.estimateDefaultClientNote}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateDefaultClientNote: e.target.value })}
                                    className="h-24"
                                    placeholder="Thank you for doing business with WasilaDev"
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Predefined Terms & Conditions</Label>
                                <Textarea
                                    value={estimateForm.estimateDefaultTerms}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateDefaultTerms: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveEstimateSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-credit-notes") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Credit Notes</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Credit Note Number Prefix</Label>
                                <Input
                                    value={creditNoteForm.creditNoteNumberPrefix}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Next Credit Note Number</Label>
                                <Input
                                    value={creditNoteForm.creditNoteNextNumber}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteNextNumber: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Number Format */}
                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Credit Note Number Format</Label>
                            <RadioGroup
                                value={creditNoteForm.creditNoteNumberFormat}
                                onValueChange={(val) => setCreditNoteForm({ ...creditNoteForm, creditNoteNumberFormat: val as any })}
                                className="flex gap-4 flex-wrap"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="number_based" id="cn-fmt-number" />
                                    <Label htmlFor="cn-fmt-number" className="font-normal">Number Based (000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="year_based" id="cn-fmt-year" />
                                    <Label htmlFor="cn-fmt-year" className="font-normal">Year Based (YYYY/000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mixed" id="cn-fmt-mixed" />
                                    <Label htmlFor="cn-fmt-mixed" className="font-normal">000001-YY</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "creditNoteDecrementOnDelete", label: "Decrement credit note number on delete." },
                                { key: "creditNoteShowProjectName", label: "Show Project Name On Credit Note" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        {item.key === "creditNoteDecrementOnDelete" && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={creditNoteForm[item.key as keyof typeof creditNoteForm] ? "yes" : "no"}
                                        onValueChange={(val) => setCreditNoteForm({ ...creditNoteForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`cnf-${item.key}-yes`} />
                                            <Label htmlFor={`cnf-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`cnf-${item.key}-no`} />
                                            <Label htmlFor={`cnf-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Predefined Client Note</Label>
                                <Textarea
                                    value={creditNoteForm.creditNoteDefaultClientNote}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteDefaultClientNote: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Predefined Terms & Conditions</Label>
                                <Textarea
                                    value={creditNoteForm.creditNoteDefaultTerms}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteDefaultTerms: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveCreditNoteSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-payment-gateways") {
            const [activeGatewayTab, setActiveGatewayTab] = useState("general");
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Payment Gateways</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">
                        <Tabs value={activeGatewayTab} onValueChange={setActiveGatewayTab}>
                            <TabsList>
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="paypal">Paypal</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-6 mt-6">
                                <div className="space-y-6">
                                    {[
                                        { key: "paymentNotificationEmail", label: "Receive notification when customer pay invoice (built-in)" },
                                        { key: "allowCustomerModifyAmount", label: "Allow customer to modify the amount to pay (for online payments)" },
                                    ].map((item) => (
                                        <div key={item.key}>
                                            <Label className="mb-2 block text-sm font-medium text-gray-700">{item.label}</Label>
                                            <RadioGroup
                                                value={gatewayForm[item.key as keyof typeof gatewayForm] ? "yes" : "no"}
                                                onValueChange={(val) => setGatewayForm({ ...gatewayForm, [item.key]: val === "yes" })}
                                                className="flex gap-4"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="yes" id={`pg-${item.key}-yes`} />
                                                    <Label htmlFor={`pg-${item.key}-yes`} className="font-normal">Yes</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="no" id={`pg-${item.key}-no`} />
                                                    <Label htmlFor={`pg-${item.key}-no`} className="font-normal">No</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="paypal" className="space-y-6 mt-6">
                                <h3 className="text-lg font-medium">Paypal</h3>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">Active</Label>
                                    <RadioGroup
                                        value={gatewayForm.paypalActive ? "yes" : "no"}
                                        onValueChange={(val) => setGatewayForm({ ...gatewayForm, paypalActive: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="pp-active-yes" />
                                            <Label htmlFor="pp-active-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="pp-active-no" />
                                            <Label htmlFor="pp-active-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label>Label</Label>
                                    <Input
                                        value={gatewayForm.paypalLabel}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalLabel: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Fixed Fee</Label>
                                    <Input
                                        value={gatewayForm.paypalFixedFee}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalFixedFee: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Percentage Fee</Label>
                                    <Input
                                        value={gatewayForm.paypalPercentageFee}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalPercentageFee: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>PayPal API Username</Label>
                                    <Input
                                        value={gatewayForm.paypalUsername}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalUsername: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>PayPal API Password</Label>
                                    <Input
                                        value={gatewayForm.paypalPassword}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalPassword: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>API Signature</Label>
                                    <Input
                                        value={gatewayForm.paypalSignature}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalSignature: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="mb-2 block">Gateway Dashbord Payment Description</Label>
                                    <Textarea
                                        value={gatewayForm.paypalDescription}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalDescription: e.target.value })}
                                        className="h-24"
                                    />
                                </div>

                                <div>
                                    <Label>Currencies (coma separated)</Label>
                                    <Input
                                        value={gatewayForm.paypalCurrencies}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalCurrencies: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">Enable Test Mode</Label>
                                    <RadioGroup
                                        value={gatewayForm.paypalTestMode ? "yes" : "no"}
                                        onValueChange={(val) => setGatewayForm({ ...gatewayForm, paypalTestMode: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="pp-test-yes" />
                                            <Label htmlFor="pp-test-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="pp-test-no" />
                                            <Label htmlFor="pp-test-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">Selected by default on invoice</Label>
                                    <RadioGroup
                                        value={gatewayForm.paypalDefaultSelected ? "yes" : "no"}
                                        onValueChange={(val) => setGatewayForm({ ...gatewayForm, paypalDefaultSelected: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="pp-def-yes" />
                                            <Label htmlFor="pp-def-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="pp-def-no" />
                                            <Label htmlFor="pp-def-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                            </TabsContent>
                        </Tabs>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveGatewaySettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "email") {
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Email</h2>
                        <Button variant="outline">Share details</Button>
                    </div>

                    <Tabs value={activeEmailTab} onValueChange={setActiveEmailTab}>
                        <TabsList>
                            <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
                            <TabsTrigger value="queue">Email Queue</TabsTrigger>
                        </TabsList>

                        <TabsContent value="smtp" className="space-y-6 mt-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4">SMTP Settings <span className="text-sm text-gray-500">Setup main email</span></h3>

                                <div className="space-y-4">
                                    <div>
                                        <Label>Mail Engine</Label>
                                        <RadioGroup defaultValue="phpmailer" className="flex gap-4 mt-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="phpmailer" id="phpmailer" />
                                                <Label htmlFor="phpmailer">PHPMailer</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="codeigniter" id="codeigniter" />
                                                <Label htmlFor="codeigniter">CodeIgniter</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                        <p className="text-sm text-yellow-900">
                                            The "mail" protocol is not the recommended protocol to send emails, you should strongly consider configuring the "SMTP" protocol to avoid any disruptions and delivery issues.
                                        </p>
                                    </div>

                                    <div>
                                        <Label>Email Protocol</Label>
                                        <RadioGroup defaultValue="mail" className="flex flex-wrap gap-4 mt-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="smtp" id="smtp" />
                                                <Label htmlFor="smtp">SMTP</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="oauth2" id="oauth2" />
                                                <Label htmlFor="oauth2">Microsoft OAuth 2.0</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="gmail" id="gmail" />
                                                <Label htmlFor="gmail">Gmail OAuth 2.0</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="sendmail" id="sendmail" />
                                                <Label htmlFor="sendmail">Sendmail</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="mail" id="mail" />
                                                <Label htmlFor="mail">Mail</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div>
                                        <Label>Email</Label>
                                        <Input defaultValue="dev@wasiladev.com" />
                                    </div>

                                    <div>
                                        <Label>Email Charset</Label>
                                        <Input defaultValue="utf-8" />
                                    </div>

                                    <div>
                                        <Label>BCC All Emails To</Label>
                                        <Input placeholder="BCC email address" />
                                    </div>

                                    <div>
                                        <Label>Email Signature</Label>
                                        <Textarea defaultValue="WasilaDev Team" className="min-h-[100px]" />
                                    </div>

                                    <div>
                                        <Label>Predefined Header</Label>
                                        <Textarea
                                            className="min-h-[150px] font-mono text-xs"
                                            defaultValue={`<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<style>
body {
  background-color: #f6f6f6;
  font-family: sans-serif;
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
  padding: 0;
  -ms-text-size-adjust: 100%;`}
                                        />
                                    </div>

                                    <div>
                                        <Label>Predefined Footer</Label>
                                        <Textarea
                                            className="min-h-[150px] font-mono text-xs"
                                            defaultValue={`</tr>
</table>
</td>
</tr>
<!-- END MAIN CONTENT AREA →
</table>
<!-- START FOOTER →
<div class="footer">
<table border="0" cellpadding="0" cellspacing="0">
<tr>
<td class="content-block">
<span>{companyname}</span>`}
                                        />
                                    </div>

                                    <div className="border-t pt-6">
                                        <h4 className="font-medium mb-4">Send Test Email</h4>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Send test email to make sure that your SMTP settings is set correctly.
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                defaultValue="a.darwish@wasiladev.com"
                                                className="flex-1"
                                            />
                                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                                Test
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                            Save Settings
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="queue" className="space-y-6 mt-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-3 block flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        Enable Email Queue
                                    </Label>
                                    <RadioGroup defaultValue="yes">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="queue-yes" />
                                                <Label htmlFor="queue-yes">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="queue-no" />
                                                <Label htmlFor="queue-no">No</Label>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label className="mb-3 block flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        Do not add emails with attachments in the queue?
                                    </Label>
                                    <RadioGroup defaultValue="yes">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="attach-yes" />
                                                <Label htmlFor="attach-yes">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="attach-no" />
                                                <Label htmlFor="attach-no">No</Label>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="pt-6">
                                    <h4 className="font-medium mb-4">Email Queue</h4>

                                    <div className="bg-white rounded-lg border">
                                        <div className="p-4 border-b flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <select className="border rounded px-3 py-1.5 text-sm">
                                                    <option>25</option>
                                                    <option>50</option>
                                                    <option>100</option>
                                                </select>
                                                <Button variant="outline" size="sm">Export</Button>
                                            </div>
                                            <div className="relative">
                                                <Input placeholder="Search..." className="w-64" />
                                            </div>
                                        </div>

                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm">New Ticket Reply [Ticket ID: 1984]</td>
                                                    <td className="px-4 py-3 text-sm">mohamed.fathi@egjc.com.eg</td>
                                                    <td className="px-4 py-3 text-sm">sent</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <button className="text-red-600 hover:text-red-800">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm">New Ticket Reply [Ticket ID: 1984]</td>
                                                    <td className="px-4 py-3 text-sm">mohamed.fathi@egjc.com.eg</td>
                                                    <td className="px-4 py-3 text-sm">sent</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <button className="text-red-600 hover:text-red-800">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="p-4 border-t flex items-center justify-between text-sm text-gray-600">
                                            <span>Showing 1 to 2 of 2 entries</span>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" disabled>Previous</Button>
                                                <Button variant="outline" size="sm" className="bg-gray-900 text-white">1</Button>
                                                <Button variant="outline" size="sm" disabled>Next</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                        Save Settings
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold capitalize">{activeSection.replace('-', ' ')}</h2>
                <p className="text-gray-500">This section is under development.</p>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r p-4">
                <h2 className="text-lg font-semibold mb-6">Settings</h2>

                <div className="space-y-6">
                    {sidebarSections.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                {section.title}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeSection === item.id
                                                ? 'bg-gray-100 text-gray-900 font-medium'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="max-w-4xl">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
