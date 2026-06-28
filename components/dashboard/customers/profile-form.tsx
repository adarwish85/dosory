"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer } from "@/lib/types";
import { useCustomFields } from "@/lib/hooks/use-settings";
import { useTranslation } from "@/lib/i18n";

export function CustomerProfileForm() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const customerId = params?.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const { register, handleSubmit, setValue, watch } = useForm();

    // Fetch Custom Fields for Customers
    const { customFields, loading: fieldsLoading } = useCustomFields("customers");

    useEffect(() => {
        if (!customerId) return;

        // Load Customer
        async function loadCustomer() {
            try {
                const docRef = doc(db, "customers", customerId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCustomer({ id: docSnap.id, ...data } as Customer);
                    // Populate form
                    setValue("company", data.company);
                    setValue("vatNumber", data.vatNumber || "");
                    setValue("phone", data.phone || "");
                    setValue("website", data.website || "");
                    setValue("currency", data.currency || "usd");
                    setValue("defaultLanguage", data.defaultLanguage || "default");
                    setValue("address", data.address?.street || "");
                    setValue("city", data.address?.city || "");
                    setValue("state", data.address?.state || "");
                    setValue("zipCode", data.address?.zipCode || "");
                    setValue("country", data.address?.country || "");

                    // Populate Custom Fields
                    if (data.customFields) {
                        Object.entries(data.customFields).forEach(([key, value]) => {
                            setValue(`customFields.${key}`, value);
                        });
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        loadCustomer();
    }, [customerId, setValue]);

    const onSave = async (data: any) => {
        if (!customerId) return;

        try {
            const docRef = doc(db, "customers", customerId);

            // Extract custom fields
            const customFieldData: Record<string, any> = {};
            if (data.customFields) {
                Object.keys(data.customFields).forEach(key => {
                    customFieldData[key] = data.customFields[key];
                });
            }

            await updateDoc(docRef, {
                company: data.company,
                vatNumber: data.vatNumber,
                phone: data.phone,
                website: data.website,
                currency: data.currency,
                defaultLanguage: data.defaultLanguage,
                address: {
                    street: data.address,
                    city: data.city,
                    state: data.state,
                    zipCode: data.zipCode,
                    country: data.country,
                },
                customFields: customFieldData,
                updatedAt: new Date(),
            });

            alert(t("customers.profile.updateSuccess"));
        } catch (error) {
            console.error("Error updating customer:", error);
            alert(t("customers.profile.updateError"));
        }
    };

    if (loading || fieldsLoading) {
        return <div className="p-8">{t("customers.profile.loading")}</div>;
    }

    if (!customer) {
        return <div className="p-8">{t("customers.profile.notFound")}</div>;
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <h2 className="text-xl font-bold text-gray-900">{t("customers.profile.details")}</h2>

            <form onSubmit={handleSubmit(onSave)} className="space-y-6">
                <div className="flex items-start space-x-2">
                    <Checkbox id="show-contact" className="mt-1" defaultChecked />
                    <label
                        htmlFor="show-contact"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700"
                    >
                        {t("customers.profile.showPrimaryContact")}
                    </label>
                </div>

                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="company" className="text-red-500 font-semibold">
                            * <span className="text-gray-700">{t("customers.field.company")}</span>
                        </Label>
                        <Input id="company" {...register("company", { required: true })} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="vat">{t("customers.field.vatNumber")}</Label>
                        <Input id="vat" {...register("vatNumber")} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">{t("common.phone")}</Label>
                        <Input id="phone" {...register("phone")} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="website">{t("customers.field.website")}</Label>
                        <Input id="website" {...register("website")} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>{t("customers.field.currency")}</Label>
                            <Select
                                defaultValue={customer.currency || "usd"}
                                onValueChange={(val) => setValue("currency", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("customers.profile.systemDefault")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="usd">USD</SelectItem>
                                    <SelectItem value="eur">EUR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t("customers.field.defaultLanguage")}</Label>
                            <Select
                                defaultValue={customer.defaultLanguage || "default"}
                                onValueChange={(val) => setValue("defaultLanguage", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("customers.profile.systemDefault")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">{t("customers.profile.systemDefault")}</SelectItem>
                                    <SelectItem value="en">{t("customers.profile.english")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">{t("customers.field.address")}</Label>
                        <Textarea id="address" className="min-h-[100px]" {...register("address")} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="city">{t("customers.field.city")}</Label>
                            <Input id="city" {...register("city")} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="state">{t("customers.field.state")}</Label>
                            <Input id="state" {...register("state")} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="zipCode">{t("customers.field.zipCode")}</Label>
                            <Input id="zipCode" {...register("zipCode")} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="country">{t("customers.field.country")}</Label>
                            <Input id="country" {...register("country")} />
                        </div>
                    </div>

                    {/* Custom Fields Section */}
                    {customFields.length > 0 && (
                        <div className="pt-6 border-t">
                            <h3 className="text-lg font-semibold mb-4">{t("customers.profile.additionalInfo")}</h3>
                            <div className="grid grid-cols-12 gap-4">
                                {customFields.map((field) => (
                                    <div
                                        key={field.id}
                                        className={`col-span-12 md:col-span-${field.gridWidth || 12} grid gap-2`}
                                    >
                                        <Label htmlFor={field.slug}>
                                            {field.required && <span className="text-red-500 mr-1">*</span>}
                                            {field.name}
                                        </Label>

                                        {field.type === "text" && (
                                            <Input
                                                id={field.slug}
                                                {...register(`customFields.${field.slug}`, { required: field.required })}
                                                defaultValue={field.defaultValue}
                                            />
                                        )}

                                        {field.type === "textarea" && (
                                            <Textarea
                                                id={field.slug}
                                                {...register(`customFields.${field.slug}`, { required: field.required })}
                                                defaultValue={field.defaultValue}
                                            />
                                        )}

                                        {field.type === "number" && (
                                            <Input
                                                id={field.slug}
                                                type="number"
                                                {...register(`customFields.${field.slug}`, { required: field.required })}
                                                defaultValue={field.defaultValue}
                                            />
                                        )}

                                        {field.type === "date" && (
                                            <Input
                                                id={field.slug}
                                                type="date"
                                                {...register(`customFields.${field.slug}`, { required: field.required })}
                                                defaultValue={field.defaultValue}
                                            />
                                        )}

                                        {field.type === "checkbox" && (
                                            <div className="flex items-center space-x-2 h-10">
                                                <Checkbox
                                                    id={field.slug}
                                                    onCheckedChange={(checked) => setValue(`customFields.${field.slug}`, checked)}
                                                    defaultChecked={field.defaultValue === "true"}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-4">
                    <Button type="submit">{t("common.saveChanges")}</Button>
                    <Button type="button" variant="outline" onClick={() => router.push("/dashboard/customers")}>
                        {t("common.cancel")}
                    </Button>
                </div>
            </form>
        </div>
    );
}
