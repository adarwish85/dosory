"use client";

import { useState, useEffect } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Globe, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CustomerPortalSettingsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { settings, loading: settingsLoading } = useOrganizationSettings();
    const [saving, setSaving] = useState(false);

    // Local state for settings
    const [portalEnabled, setPortalEnabled] = useState(false);

    // Load initial state
    useEffect(() => {
        if (customer) {
            setPortalEnabled(customer.portalEnabled ?? false); // Default to false if undefined
        }
    }, [customer]);

    if (customerLoading || settingsLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!customer) return <div>Customer not found</div>;

    // Construct Portal URL
    // Use custom subdomain if available, otherwise orgId, or fallback to current host
    const subdomain = settings.subdomain || customer.orgId;
    // Assuming the app is hosted on dosory.com or root domain. 
    // If running on localhost, handle that too.
    const rootDomain = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? 'localhost:3000'
        : (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dosory.com');

    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';

    // Portal URL: https://[subdomain].dosory.com/portal
    // OR if no subdomain logic yet for portal, maybe just /portal
    // Based on previous tasks, we have subdomain routing.
    const portalUrl = subdomain
        ? `${protocol}//${subdomain}.${rootDomain}/portal`
        : `${protocol}//${rootDomain}/portal`; // Fallback

    const handleSave = async () => {
        if (!customerId) return;
        setSaving(true);
        try {
            const customerRef = doc(db, "customers", customerId);
            await updateDoc(customerRef, {
                portalEnabled: portalEnabled,
                // Add other settings here as needed
            });
            toast.success("Portal settings updated");
        } catch (error) {
            console.error("Error updating portal settings:", error);
            toast.error("Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(portalUrl);
        toast.success("Link copied to clipboard");
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Portal Settings</h2>
                    <p className="text-gray-500">Manage client portal access and configuration for {customer.company}.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-gray-900 text-white hover:bg-gray-800">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                        Portal Access
                    </CardTitle>
                    <CardDescription>
                        Control whether contacts from this customer can log in to the client portal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">Enable Client Portal</Label>
                            <p className="text-sm text-gray-500">
                                Allow contacts to access invoices, projects, and tickets.
                            </p>
                        </div>
                        <Switch
                            checked={portalEnabled}
                            onCheckedChange={setPortalEnabled}
                            className="data-[state=checked]:bg-green-600"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Portal Link</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    readOnly
                                    value={portalUrl}
                                    className="pl-9 bg-gray-50 cursor-pointer"
                                    onClick={(e) => e.currentTarget.select()}
                                />
                            </div>
                            <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy Link">
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" asChild title="Open Portal">
                                <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Share this link with your customer contacts. They will need to log in with their email address.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Module Visibility (Global)</CardTitle>
                    <CardDescription>
                        Control which modules are visible to this customer's contacts by default.
                        (Can be overridden per contact).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 border border-dashed rounded-lg bg-gray-50 text-center text-gray-500">
                        <p>Global module permission settings coming soon.</p>
                        <p className="text-xs mt-1">For now, configure permissions individually in the Contacts tab.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
