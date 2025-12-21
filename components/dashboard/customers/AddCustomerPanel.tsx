"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/lib/hooks/use-customers";
import { ContactDialog } from "./contacts/contact-dialog";

interface AddCustomerPanelProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const currencies = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
    { value: "AED", label: "AED - UAE Dirham" },
    { value: "SAR", label: "SAR - Saudi Riyal" },
];

const languages = [
    { value: "en", label: "English" },
    { value: "ar", label: "Arabic" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
];

const countries = [
    { value: "AE", label: "United Arab Emirates" },
    { value: "SA", label: "Saudi Arabia" },
    { value: "US", label: "United States" },
    { value: "UK", label: "United Kingdom" },
    { value: "EG", label: "Egypt" },
];

export default function AddCustomerPanel({ open, onClose, onSuccess }: AddCustomerPanelProps) {
    const { createCustomer, loading } = useCustomers();
    const [activeTab, setActiveTab] = useState<"details" | "billing">("details");
    const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
    const [showContactDialog, setShowContactDialog] = useState(false);
    const [formData, setFormData] = useState({
        // Customer Details
        company: "",
        vatNumber: "",
        phone: "",
        website: "",
        groups: "",
        currency: "",
        language: "",
        // Billing & Shipping
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        // Shipping (same structure)
        shippingAddress: "",
        shippingCity: "",
        shippingState: "",
        shippingZipCode: "",
        shippingCountry: "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (createContact: boolean = false) => {
        if (!formData.company.trim()) {
            alert("Company name is required");
            return;
        }

        try {
            // Build customer data, only include website if valid URL
            const customerData: any = {
                company: formData.company,
                status: "active" as const,
                currency: formData.currency || undefined,
                defaultLanguage: formData.language || undefined,
                address: {
                    street: formData.address || undefined,
                    city: formData.city || undefined,
                    state: formData.state || undefined,
                    zipCode: formData.zipCode || undefined,
                    country: formData.country || undefined,
                },
            };

            // Only add optional fields if they have values
            if (formData.vatNumber) customerData.vatNumber = formData.vatNumber;
            if (formData.phone) customerData.phone = formData.phone;

            // Only add website if it's a valid URL
            if (formData.website && formData.website.startsWith('http')) {
                customerData.website = formData.website;
            }

            // Add shipping address if different from billing
            if (formData.shippingAddress || formData.shippingCity) {
                customerData.shippingAddress = {
                    street: formData.shippingAddress || formData.address || undefined,
                    city: formData.shippingCity || formData.city || undefined,
                    state: formData.shippingState || formData.state || undefined,
                    zipCode: formData.shippingZipCode || formData.zipCode || undefined,
                    country: formData.shippingCountry || formData.country || undefined,
                };
            }

            const customerId = await createCustomer(customerData);
            setNewCustomerId(customerId);

            // If createContact flag is set, open contact dialog
            if (createContact) {
                setShowContactDialog(true);
            } else {
                onSuccess?.();
                onClose();
            }

            // Reset form
            setFormData({
                company: "", vatNumber: "", phone: "", website: "", groups: "",
                currency: "", language: "", address: "", city: "", state: "",
                zipCode: "", country: "", shippingAddress: "", shippingCity: "",
                shippingState: "", shippingZipCode: "", shippingCountry: "",
            });
        } catch (error: any) {
            console.error("Failed to create customer:", error);
            alert(`Failed to create customer: ${error.message || "Unknown error"}`);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
                    open ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out flex flex-col",
                    open ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white px-6">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === "details"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Customer Details
                    </button>
                    <button
                        onClick={() => setActiveTab("billing")}
                        className={cn(
                            "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === "billing"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Billing & Shipping
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "details" && (
                        <div className="space-y-5">
                            {/* Company */}
                            <div>
                                <Label className="text-gray-700">
                                    <span className="text-red-500">*</span> Company
                                </Label>
                                <Input
                                    value={formData.company}
                                    onChange={(e) => handleChange("company", e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter company name"
                                />
                            </div>

                            {/* VAT Number */}
                            <div>
                                <Label className="text-gray-700">VAT Number</Label>
                                <Input
                                    value={formData.vatNumber}
                                    onChange={(e) => handleChange("vatNumber", e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter VAT number"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <Label className="text-gray-700">Phone</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter phone number"
                                />
                            </div>

                            {/* Website */}
                            <div>
                                <Label className="text-gray-700">Website</Label>
                                <Input
                                    value={formData.website}
                                    onChange={(e) => handleChange("website", e.target.value)}
                                    className="mt-1"
                                    placeholder="https://example.com"
                                />
                            </div>

                            {/* Groups */}
                            <div>
                                <Label className="text-gray-700">Groups</Label>
                                <div className="flex gap-2 mt-1">
                                    <Select
                                        value={formData.groups}
                                        onValueChange={(value) => handleChange("groups", value)}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Nothing selected" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vip">VIP</SelectItem>
                                            <SelectItem value="enterprise">Enterprise</SelectItem>
                                            <SelectItem value="startup">Startup</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Currency & Language */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-700">Currency</Label>
                                    <Select
                                        value={formData.currency}
                                        onValueChange={(value) => handleChange("currency", value)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="System Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencies.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-gray-700">Default Language</Label>
                                    <Select
                                        value={formData.language}
                                        onValueChange={(value) => handleChange("language", value)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="System Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {languages.map((l) => (
                                                <SelectItem key={l.value} value={l.value}>
                                                    {l.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <Label className="text-gray-700">Address</Label>
                                <Textarea
                                    value={formData.address}
                                    onChange={(e) => handleChange("address", e.target.value)}
                                    className="mt-1"
                                    rows={3}
                                    placeholder="Enter address"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "billing" && (
                        <div className="space-y-5">
                            {/* Address */}
                            <div>
                                <Label className="text-gray-700">Address</Label>
                                <Textarea
                                    value={formData.shippingAddress || formData.address}
                                    onChange={(e) => handleChange("shippingAddress", e.target.value)}
                                    className="mt-1"
                                    rows={3}
                                    placeholder="Enter billing/shipping address"
                                />
                            </div>

                            {/* City */}
                            <div>
                                <Label className="text-gray-700">City</Label>
                                <Input
                                    value={formData.shippingCity || formData.city}
                                    onChange={(e) => handleChange("shippingCity", e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter city"
                                />
                            </div>

                            {/* State */}
                            <div>
                                <Label className="text-gray-700">State</Label>
                                <Input
                                    value={formData.shippingState || formData.state}
                                    onChange={(e) => handleChange("shippingState", e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter state/province"
                                />
                            </div>

                            {/* Zip Code */}
                            <div>
                                <Label className="text-gray-700">Zip Code</Label>
                                <Input
                                    value={formData.shippingZipCode || formData.zipCode}
                                    onChange={(e) => handleChange("shippingZipCode", e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter zip/postal code"
                                />
                            </div>

                            {/* Country */}
                            <div>
                                <Label className="text-gray-700">Country</Label>
                                <Select
                                    value={formData.shippingCountry || formData.country}
                                    onValueChange={(value) => handleChange("shippingCountry", value)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Nothing selected" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <Button
                        variant="outline"
                        onClick={() => handleSave(true)}
                        disabled={loading}
                    >
                        Save and create contact
                    </Button>
                    <Button
                        onClick={() => handleSave(false)}
                        disabled={loading}
                        className="bg-gray-900 hover:bg-gray-800"
                    >
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            {/* Contact Dialog - shown after customer is created with "Save and Add Contact" */}
            {showContactDialog && newCustomerId && (
                <ContactDialog
                    customerId={newCustomerId}
                    open={showContactDialog}
                    onOpenChange={(isOpen) => {
                        setShowContactDialog(isOpen);
                        if (!isOpen) {
                            // When contact dialog closes, also close the customer panel
                            onSuccess?.();
                            onClose();
                        }
                    }}
                />
            )}
        </>
    );
}
