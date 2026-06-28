"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountFormSchema } from "@/lib/schemas";
import { Account, AccountType, AccountSubType } from "@/lib/types/finance";
import { z } from "zod";
import { useTranslation } from "@/lib/i18n";

type FormData = z.infer<typeof accountFormSchema>;

const ACCOUNT_TYPES: Record<AccountType, string> = {
    asset: "finance.account.types.asset",
    liability: "finance.account.types.liability",
    equity: "finance.account.types.equity",
    income: "finance.account.types.income",
    expense: "finance.account.types.expense",
};

const ACCOUNT_SUBTYPES: Record<AccountSubType, string> = {
    current_asset: "finance.account.subtypes.current_asset",
    fixed_asset: "finance.account.subtypes.fixed_asset",
    current_liability: "finance.account.subtypes.current_liability",
    long_term_liability: "finance.account.subtypes.long_term_liability",
    sales: "finance.account.subtypes.sales",
    other_income: "finance.account.subtypes.other_income",
    operating_expense: "finance.account.subtypes.operating_expense",
    cost_of_goods_sold: "finance.account.subtypes.cost_of_goods_sold",
    retained_earnings: "finance.account.subtypes.retained_earnings",
    owner_equity: "finance.account.subtypes.owner_equity",
};

interface AccountFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<Account>) => Promise<void>;
    initialData?: Account;
}

export function AccountFormDialog({ open, onOpenChange, onSubmit, initialData }: AccountFormDialogProps) {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            code: "",
            name: "",
            type: "asset",
            subType: "current_asset",
            description: "",
            currency: "USD",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                code: initialData?.code || "",
                name: initialData?.name || "",
                type: initialData?.type || "asset",
                subType: initialData?.subType || "current_asset",
                description: initialData?.description || "",
                currency: initialData?.currency || "USD",
            });
        }
    }, [open, initialData, form]);

    const handleSubmit = async (data: FormData) => {
        setSubmitting(true);
        try {
            await onSubmit(data);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? t("finance.account.editTitle") : t("finance.account.newTitle")}</DialogTitle>
                    <DialogDescription>
                        {initialData ? t("finance.account.editDescription") : t("finance.account.newDescription")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("finance.account.code")}</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t("finance.account.codePlaceholder")} disabled={!!initialData} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("finance.account.name")}</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t("finance.account.namePlaceholder")} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("finance.account.type")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("finance.account.selectType")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {t(label)}
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
                                name="subType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("finance.account.subType")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("finance.account.selectSubtype")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(ACCOUNT_SUBTYPES).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {t(label)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("common.description")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={t("finance.account.descriptionPlaceholder")} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? t("common.saving") : initialData ? t("finance.account.update") : t("common.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
