"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creditNoteFormSchema, type CreditNoteFormData } from "@/lib/schemas";
import { useCreditNotes } from "@/lib/hooks/use-customer-data";
import { useCustomers } from "@/lib/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ChevronLeft, Trash, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

export default function CreateCreditNotePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");
    // invoiceIdParam might be useful later for "Credit from Invoice" flow

    // Note: useCreditNotes in use-customer-data might need check if it exposes createCreditNote
    // If not, I'll need to use standard addDoc pattern or update the hook.
    // Assuming it works like other hooks for now.
    const { createCreditNote } = useCreditNotes({ customerId: customerIdParam || undefined });
    const { customers, loading: customersLoading } = useCustomers({ status: "active" });
    const { profile } = useUserProfile();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreditNoteFormData>({
        resolver: zodResolver(creditNoteFormSchema),
        defaultValues: {
            customerId: customerIdParam || "",
            date: new Date(),
            currency: "USD",
            items: [{ id: "1", description: "Credit Adjustment", quantity: 1, rate: 0, amount: 0 }],
            notes: "",
        },
    });

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const date = watch("date");
    const items = watch("items");

    // Calculate totals for display
    const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);

    // FAMILY A (#4) — the amount-sync useEffect that used to live here is GONE on purpose.
    // It setValue'd every row on every render behind an `item.amount !== amount` guard that a
    // cleared qty/rate (NaN via valueAsNumber) could never satisfy — an unbounded loop that
    // froze the tab — while on non-NaN paths react-hook-form 7.70's reference-stable
    // watch("items") meant it never re-ran and each row persisted amount: 0. Amounts are now
    // derived once at submit time: loop-proof, and always the right number.

    useEffect(() => {
        if (customerIdParam) {
            setValue("customerId", customerIdParam);
        }
    }, [customerIdParam, setValue]);

    const onSubmit = async (data: CreditNoteFormData) => {
        setIsSubmitting(true);
        try {
            const normalizedItems = data.items.map((i) => ({
                ...i,
                quantity: i.quantity || 0,
                rate: i.rate || 0,
                amount: (i.quantity || 0) * (i.rate || 0),
            }));
            // Review finding (HIGH): createCreditNote addDoc's the payload VERBATIM — it computes
            // nothing. Without these, every credit note rendered as "Draft" / "Unknown" / blank
            // amount in the list, detail page and customer statement. Compute them here.
            const cnSubtotal = normalizedItems.reduce((sum, i) => sum + i.amount, 0);
            // Customer's display field is `company` (lib/types.ts Customer) — there is no `name`.
            const customerName = customers.find((c) => c.id === data.customerId)?.company || "";
            await createCreditNote({
                ...data,
                items: normalizedItems,
                number: `CN-${Date.now().toString().slice(-6)}`,
                customerName,
                subtotal: cnSubtotal,
                taxTotal: 0,
                total: cnSubtotal,
                creditsUsed: 0,
                creditsRemaining: cnSubtotal,
            });
            toast.success(t("accounting.creditNotes.createSuccess"));

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/credit-notes`);
            } else {
                router.push("/dashboard/accounting/credit-notes");
            }
        } catch (error) {
            console.error("Error creating credit note:", error);
            toast.error(t("accounting.creditNotes.createFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Link
                    href={
                        customerIdParam
                            ? `/dashboard/customers/${customerIdParam}/credit-notes`
                            : "/dashboard/accounting/credit-notes"
                    }
                    className="flex items-center hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("accounting.creditNotes.backToList")}
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t("accounting.creditNotes.new")}</h1>
                <p className="text-gray-500 mt-1">{t("accounting.creditNotes.newDescription")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("accounting.creditNotes.detailsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="customerId">
                                    {t("accounting.payments.customer")} <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={watch("customerId")}
                                    onValueChange={(val) => setValue("customerId", val, { shouldValidate: true })}
                                    disabled={!!customerIdParam}
                                >
                                    <SelectTrigger className={cn(errors.customerId && "border-red-500")}>
                                        <SelectValue placeholder={t("accounting.creditNotes.selectCustomer")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.company}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.customerId && (
                                    <p className="text-red-500 text-xs">{errors.customerId.message}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="currency">{t("accounting.journal.currency")}</Label>
                                <Select value={watch("currency")} onValueChange={(val) => setValue("currency", val)}>
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

                        <div className="grid gap-2">
                            <Label>{t("common.date")}</Label>
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
                                        {date ? (
                                            format(date, "PPP")
                                        ) : (
                                            <span>{t("accounting.journal.new.pickDate")}</span>
                                        )}
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("accounting.creditNotes.itemsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 mb-2">
                            <div className="col-span-6">{t("accounting.journal.descriptionColumn")}</div>
                            <div className="col-span-2">{t("accounting.creditNotes.quantity")}</div>
                            <div className="col-span-2">{t("accounting.creditNotes.rate")}</div>
                            <div className="col-span-1">{t("common.amount")}</div>
                            <div className="col-span-1"></div>
                        </div>

                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b pb-4 md:border-0 md:pb-0"
                            >
                                <div className="md:col-span-6">
                                    <Label className="md:hidden">{t("accounting.journal.descriptionColumn")}</Label>
                                    <Input
                                        {...register(`items.${index}.description` as const)}
                                        placeholder={t("accounting.creditNotes.itemDescription")}
                                        className={cn(errors.items?.[index]?.description && "border-red-500")}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="md:hidden">{t("accounting.creditNotes.quantity")}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="md:hidden">{t("accounting.creditNotes.rate")}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...register(`items.${index}.rate` as const, { valueAsNumber: true })}
                                    />
                                </div>
                                <div className="md:col-span-1 py-2 md:py-0 text-right md:text-left font-medium">
                                    <span className="md:hidden mr-2 text-gray-500">
                                        {t("accounting.creditNotes.amountLabel")}
                                    </span>
                                    {(
                                        (watch(`items.${index}.quantity`) || 0) * (watch(`items.${index}.rate`) || 0)
                                    ).toFixed(2)}
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
                            onClick={() =>
                                append({ id: Date.now().toString(), description: "", quantity: 1, rate: 0, amount: 0 })
                            }
                            className="mt-2"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("accounting.creditNotes.addItem")}
                        </Button>

                        <div className="flex justify-end pt-4 border-t mt-4">
                            <div className="text-right">
                                <p className="text-gray-500 text-sm">{t("accounting.creditNotes.totalCredit")}</p>
                                <p className="text-2xl font-bold">
                                    {subtotal.toFixed(2)} {watch("currency")}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("accounting.creditNotes.reasonNotesTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="notes">{t("accounting.creditNotes.notes")}</Label>
                            <Textarea
                                {...register("notes")}
                                placeholder={t("accounting.creditNotes.notesPlaceholder")}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("accounting.creditNotes.issue")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
