"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Timestamp } from "firebase/firestore";

import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useFinance } from "@/lib/hooks/use-finance";
import { useCustomers } from "@/lib/hooks/use-customers";
// import { useVendors } from "@/lib/hooks/use-vendors"; // V1.1 TODO: Add Vendor Hook

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { useTranslation } from "@/lib/i18n";

// Schema
const journalLineSchema = z.object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.number().min(0),
    credit: z.number().min(0),
    description: z.string().optional(),
    entityType: z.enum(["customer", "vendor"]).optional(),
    entityId: z.string().optional(),
});

const journalEntryFormSchema = z.object({
    date: z.date(),
    reference: z.string().optional(),
    description: z.string().optional(),
    currency: z.string().min(1, "Currency is required"),
    fxRate: z.number().min(0.000001, "Rate must be positive"),
    lines: z.array(journalLineSchema).min(2, "At least two lines are required"),
});

type JournalEntryValues = z.infer<typeof journalEntryFormSchema>;

export default function NewJournalEntryPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { profile } = useUserProfile();
    const { accounts, fetchAccounts, recordJournalEntry } = useFinance();
    const { customers } = useCustomers();
    // const { vendors } = useVendors();

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (profile?.orgId) {
            fetchAccounts();
        }
    }, [profile?.orgId, fetchAccounts]);

    const form = useForm<JournalEntryValues>({
        resolver: zodResolver(journalEntryFormSchema),
        defaultValues: {
            date: new Date(),
            currency: "USD",
            fxRate: 1.0,
            lines: [
                { accountId: "", debit: 0, credit: 0, description: "" },
                { accountId: "", debit: 0, credit: 0, description: "" },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    });

    // Calculate totals
    const watchedLines = form.watch("lines");
    const totalDebits = watchedLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredits = watchedLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const onSubmit = async (data: JournalEntryValues) => {
        if (!isBalanced) {
            toast.error(t("accounting.journal.unbalanced", { difference: (totalDebits - totalCredits).toFixed(2) }));
            return;
        }

        setIsSubmitting(true);
        try {
            // Map lines to include accountName (required by backend type)
            const finalLines = data.lines.map((line) => {
                const acc = accounts.find((a) => a.id === line.accountId);
                return {
                    ...line,
                    accountName: acc?.name || "Unknown Account",
                };
            });

            await recordJournalEntry({
                date: Timestamp.fromDate(data.date), // Convert Date to Timestamp
                description: data.description || "Manual Journal Entry",
                referenceId: data.reference,
                referenceType: "manual",
                status: "posted",
                currency: data.currency,
                fxRate: data.fxRate,
                lines: finalLines,
                totalAmount: totalDebits,
            });

            toast.success(t("accounting.journal.recorded"));
            // router.push("/dashboard/accounting/journal");
            form.reset();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t("accounting.journal.recordFailed");
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2 pl-0">
                <ArrowLeft className="h-4 w-4" /> {t("common.back")}
            </Button>

            <PageHeader
                title={t("accounting.journal.new.title")}
                description={t("accounting.journal.new.description")}
            />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("accounting.journal.new.transactionDetails")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{t("common.date")}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>{t("accounting.journal.new.pickDate")}</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="reference"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("accounting.journal.new.referenceLabel")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("accounting.journal.new.referencePlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-3">
                                        <FormLabel>{t("accounting.journal.new.memoLabel")}</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={t("accounting.journal.new.memoPlaceholder")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* V1.1 Multi-Currency */}
                            <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("accounting.journal.currency")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("accounting.journal.new.selectCurrency")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                                <SelectItem value="CAD">CAD ($)</SelectItem>
                                                <SelectItem value="AUD">AUD ($)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="fxRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("accounting.journal.new.exchangeRate", { currency: form.watch("currency") })}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.000001"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                disabled={form.watch("currency") === "USD"} // Assume USD Base for V1
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("accounting.journal.new.linesTitle")}</CardTitle>
                            <CardDescription>{t("accounting.journal.new.linesDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[250px]">{t("accounting.journal.new.account")}</TableHead>
                                        <TableHead className="w-[120px]">{t("accounting.journal.new.debit")}</TableHead>
                                        <TableHead className="w-[120px]">{t("accounting.journal.new.credit")}</TableHead>
                                        <TableHead>{t("accounting.journal.descriptionColumn")}</TableHead>
                                        <TableHead className="w-[150px]">{t("accounting.journal.new.entityOptional")}</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`lines.${index}.accountId`}
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={t("accounting.journal.new.selectAccount")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {accounts.map((acc) => (
                                                                    <SelectItem key={acc.id} value={acc.id}>
                                                                        {acc.code} - {acc.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`lines.${index}.debit`}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(parseFloat(e.target.value) || 0)
                                                            }
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`lines.${index}.credit`}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(parseFloat(e.target.value) || 0)
                                                            }
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`lines.${index}.description`}
                                                    render={({ field }) => <Input {...field} placeholder={t("accounting.journal.new.lineMemo")} />}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {/* Entity Selector - Basic V1 Implementation */}
                                                <FormField
                                                    control={form.control}
                                                    name={`lines.${index}.entityId`}
                                                    render={({ field }) => (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="-" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">{t("accounting.journal.new.entityNone")}</SelectItem>
                                                                {customers.map((c) => (
                                                                    <SelectItem key={c.id} value={c.id}>
                                                                        {c.company}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => remove(index)}
                                                    disabled={fields.length <= 2}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => append({ accountId: "", debit: 0, credit: 0 })}
                            >
                                <Plus className="mr-2 h-4 w-4" /> {t("accounting.journal.new.addLine")}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between items-center bg-gray-50 p-6 rounded-lg border">
                        <div className="text-sm text-gray-500">
                            {t("accounting.journal.new.totalDebits")} <span className="font-mono font-bold">{totalDebits.toFixed(2)}</span>
                            <span className="mx-4">|</span>
                            {t("accounting.journal.new.totalCredits")} <span className="font-mono font-bold">{totalCredits.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" type="button" onClick={() => router.back()}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !isBalanced}>
                                {isSubmitting ? t("accounting.journal.new.recording") : t("accounting.journal.new.post")}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
