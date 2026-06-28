"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { estimateFormSchema, type EstimateFormData } from "@/lib/schemas";
import { useEstimates } from "@/lib/hooks/use-sales";
import { useCustomers } from "@/lib/hooks/use-customers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ChevronLeft, Trash, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

export default function CreateEstimatePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const { createEstimate } = useEstimates();
    const { customers, loading: customersLoading } = useCustomers({ status: "active" });
    const { profile } = useUserProfile(); // Fallback if useSettings doesn't provide currency directly

    // Default currency
    const defaultCurrency = "USD";

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EstimateFormData>({
        resolver: zodResolver(estimateFormSchema),
        defaultValues: {
            customerId: customerIdParam || "",
            date: new Date(),
            expiryDate: addDays(new Date(), 14),
            currency: defaultCurrency,
            items: [{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }],
            notes: "",
            terms: "",
        },
    });

    const { register, control, handleSubmit, formState: { errors }, setValue, watch } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const date = watch("date");
    const expiryDate = watch("expiryDate");
    const items = watch("items");

    // Calculate totals for display
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

    // Update item amount when qty/rate changes
    useEffect(() => {
        items.forEach((item, index) => {
            const amount = item.quantity * item.rate;
            if (item.amount !== amount) {
                setValue(`items.${index}.amount`, amount);
            }
        });
    }, [items, setValue]);

    useEffect(() => {
        if (customerIdParam) {
            setValue("customerId", customerIdParam);
        }
    }, [customerIdParam, setValue]);

    const onSubmit = async (data: EstimateFormData) => {
        setIsSubmitting(true);
        try {
            await createEstimate(data);
            toast.success(t("sales.estimates.new.toast.success"));

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/estimates`);
            } else {
                router.push("/dashboard/sales/estimates");
            }
        } catch (error) {
            console.error("Error creating estimate:", error);
            toast.error(t("sales.estimates.new.toast.error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Link
                    href={customerIdParam ? `/dashboard/customers/${customerIdParam}/estimates` : "/dashboard/sales/estimates"}
                    className="flex items-center hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("sales.estimates.new.back")}
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t("sales.estimates.new.title")}</h1>
                <p className="text-gray-500 mt-1">{t("sales.estimates.new.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("sales.estimates.new.detailsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="customerId">{t("sales.estimates.new.customer")} <span className="text-red-500">*</span></Label>
                                <Select
                                    value={watch("customerId")}
                                    onValueChange={(val) => setValue("customerId", val, { shouldValidate: true })}
                                    disabled={!!customerIdParam}
                                >
                                    <SelectTrigger className={cn(errors.customerId && "border-red-500")}>
                                        <SelectValue placeholder={t("sales.estimates.new.selectCustomer")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.customerId && <p className="text-red-500 text-xs">{errors.customerId.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="currency">{t("sales.estimates.new.currency")}</Label>
                                <Select
                                    value={watch("currency")}
                                    onValueChange={(val) => setValue("currency", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="GBP">GBP (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>{t("sales.estimates.new.estimateDate")}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>{t("sales.estimates.new.pickDate")}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(date) => setValue("date", date as Date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid gap-2">
                                <Label>{t("sales.estimates.new.expiryDate")}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !expiryDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {expiryDate ? format(expiryDate, "PPP") : <span>{t("sales.estimates.new.pickDate")}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={expiryDate}
                                            onSelect={(date) => setValue("expiryDate", date as Date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("sales.estimates.new.itemsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 mb-2">
                            <div className="col-span-6">{t("sales.estimates.new.itemDescription")}</div>
                            <div className="col-span-2">{t("sales.estimates.new.quantity")}</div>
                            <div className="col-span-2">{t("sales.estimates.new.rate")}</div>
                            <div className="col-span-1">{t("common.amount")}</div>
                            <div className="col-span-1"></div>
                        </div>

                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b pb-4 md:border-0 md:pb-0">
                                <div className="md:col-span-6">
                                    <Label className="md:hidden">{t("sales.estimates.new.itemDescription")}</Label>
                                    <Input
                                        {...register(`items.${index}.description` as const)}
                                        placeholder={t("sales.estimates.new.itemDescriptionPlaceholder")}
                                        className={cn(errors.items?.[index]?.description && "border-red-500")}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="md:hidden">{t("sales.estimates.new.quantity")}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="md:hidden">{t("sales.estimates.new.rate")}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...register(`items.${index}.rate` as const, { valueAsNumber: true })}
                                    />
                                </div>
                                <div className="md:col-span-1 py-2 md:py-0 text-right md:text-left font-medium">
                                    <span className="md:hidden mr-2 text-gray-500">{t("sales.estimates.new.amountLabel")}</span>
                                    {((watch(`items.${index}.quantity`) || 0) * (watch(`items.${index}.rate`) || 0)).toFixed(2)}
                                </div>
                                <div className="md:col-span-1 flex justify-end md:justify-center">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ id: Date.now().toString(), description: "", quantity: 1, rate: 0, amount: 0 })}
                            className="mt-2"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("sales.estimates.new.addItem")}
                        </Button>

                        <div className="flex justify-end pt-4 border-t mt-4">
                            <div className="text-right">
                                <p className="text-gray-500 text-sm">{t("common.subtotal")}</p>
                                <p className="text-2xl font-bold">{subtotal.toFixed(2)} {watch("currency")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("sales.estimates.new.notesTermsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="notes">{t("sales.estimates.new.notes")}</Label>
                            <Textarea {...register("notes")} placeholder={t("sales.estimates.new.notesPlaceholder")} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="terms">{t("sales.estimates.new.terms")}</Label>
                            <Textarea {...register("terms")} placeholder={t("sales.estimates.new.termsPlaceholder")} />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("sales.estimates.new.submit")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
