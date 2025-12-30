"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/lib/hooks/use-customers";
import { ContactDialog } from "./contacts/contact-dialog";

interface AddCustomerPanelProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerFormSchema, type CustomerFormData } from "@/lib/schemas";
import { CURRENCIES, LANGUAGES, COUNTRIES, CUSTOMER_GROUPS } from "@/lib/constants";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function AddCustomerPanel({ open, onClose, onSuccess }: AddCustomerPanelProps) {
    const { createCustomer, loading } = useCustomers();
    const [activeTab, setActiveTab] = useState<"details" | "billing">("details");
    const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
    const [showContactDialog, setShowContactDialog] = useState(false);
    const [shouldOpenContact, setShouldOpenContact] = useState(false);

    const form = useForm<CustomerFormData>({
        resolver: zodResolver(customerFormSchema) as any,
        defaultValues: {
            company: "",
            vatNumber: "",
            phone: "",
            website: "",
            groups: [],
            currency: "USD",
            defaultLanguage: "en",
            status: "active",
            notes: "",
            address: {
                street: "",
                city: "",
                state: "",
                zipCode: "",
                country: "",
            },
            shippingAddress: {
                street: "",
                city: "",
                state: "",
                zipCode: "",
                country: "",
            },
        },
    });

    const onSubmit = async (data: CustomerFormData) => {
        try {
            // Ensure website is valid URL or empty string (zod handles validation but double check if needed)
            const customerId = await createCustomer(data);
            setNewCustomerId(customerId);

            if (shouldOpenContact) {
                setShowContactDialog(true);
            } else {
                onSuccess?.();
                onClose();
            }

            form.reset();
        } catch (error: any) {
            console.error("Failed to create customer:", error);
            // Form error handling would go here
        }
    };

    // Wrapper to handle the two save buttons
    const handleSaveClick = (openContact: boolean) => {
        setShouldOpenContact(openContact);
        form.handleSubmit(onSubmit)();
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
                        <Form {...form}>
                            <div className="space-y-5">
                                {/* Company */}
                                <FormField
                                    control={form.control}
                                    name="company"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700">
                                                <span className="text-red-500">*</span> Company
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter company name" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* VAT Number */}
                                <FormField
                                    control={form.control}
                                    name="vatNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700">VAT Number</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter VAT number" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Phone */}
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700">Phone</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter phone number" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Website */}
                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700">Website</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="https://example.com" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Groups */}
                                <FormField
                                    control={form.control}
                                    name="groups"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-700">Groups</FormLabel>
                                            <div className="flex gap-2">
                                                <Select
                                                    onValueChange={(val) => field.onChange([val])}
                                                    defaultValue={field.value?.[0]}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="flex-1">
                                                            <SelectValue placeholder="Select group" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {CUSTOMER_GROUPS.map((g) => (
                                                            <SelectItem key={g.value} value={g.value}>
                                                                {g.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" variant="outline" size="icon">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Currency & Language */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="currency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700">Currency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="System Default" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {CURRENCIES.map((c) => (
                                                            <SelectItem key={c.value} value={c.value}>
                                                                {c.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="defaultLanguage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-700">Language</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="System Default" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {LANGUAGES.map((l) => (
                                                            <SelectItem key={l.value} value={l.value}>
                                                                {l.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Billing Address (Primary) */}
                                <div className="pt-4 border-t">
                                    <h3 className="text-sm font-medium mb-3">Billing Address</h3>
                                    <FormField
                                        control={form.control}
                                        name="address.street"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Street Address</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} rows={2} placeholder="Street address" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <FormField
                                            control={form.control}
                                            name="address.city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>City</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address.state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>State</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address.zipCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Zip Code</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address.country"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Country</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Country" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {COUNTRIES.map((c) => (
                                                                <SelectItem key={c.value} value={c.value}>
                                                                    {c.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Form>
                    )}

                    {activeTab === "billing" && (
                        <Form {...form}>
                            <div className="space-y-5">
                                {/* Shipping Address */}
                                <FormField
                                    control={form.control}
                                    name="shippingAddress.street"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Shipping Address</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} rows={3} placeholder="Enter shipping address" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* City */}
                                <FormField
                                    control={form.control}
                                    name="shippingAddress.city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter city" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* State */}
                                <FormField
                                    control={form.control}
                                    name="shippingAddress.state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter state/province" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Zip Code */}
                                <FormField
                                    control={form.control}
                                    name="shippingAddress.zipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Zip Code</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter zip/postal code" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Country */}
                                <FormField
                                    control={form.control}
                                    name="shippingAddress.country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Country" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {COUNTRIES.map((c) => (
                                                        <SelectItem key={c.value} value={c.value}>
                                                            {c.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </Form>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => handleSaveClick(true)} disabled={loading}>
                        Save and create contact
                    </Button>
                    <Button
                        onClick={() => handleSaveClick(false)}
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
