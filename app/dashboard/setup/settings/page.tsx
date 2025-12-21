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
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [localSubdomain, setLocalSubdomain] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [mainDomain, setMainDomain] = useState("");
    const [rtlAdmin, setRtlAdmin] = useState("no");
    const [rtlCustomer, setRtlCustomer] = useState("no");
    const [allowedFileTypes, setAllowedFileTypes] = useState("");
    const [availability, setAvailability] = useState<"idle" | "loading" | "available" | "unavailable">("idle");
    const [checkError, setCheckError] = useState("");

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
                            <Label>Company Logo Light</Label>
                            <Input type="file" className="mt-2" accept="image/*" />
                        </div>

                        <div>
                            <Label>Company Logo Dark</Label>
                            <Input type="file" className="mt-2" accept="image/*" />
                        </div>

                        <div>
                            <Label>Favicon</Label>
                            <Input type="file" className="mt-2" accept="image/x-icon,image/png" />
                        </div>

                        <div>
                            <Label>Company Name</Label>
                            <Input
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="My Company"
                            />
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
