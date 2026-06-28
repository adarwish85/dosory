"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLeads } from "@/lib/hooks/use-leads";
import { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstimates } from "@/lib/hooks/use-sales";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

const convertSchema = z.object({
    createContact: z.boolean(),
    createProjectFromDeal: z.boolean(),
    createInvoiceFromEstimate: z.boolean(),
    selectedEstimateId: z.string().optional(),
});

type ConvertFormData = z.infer<typeof convertSchema>;

interface ConvertLeadDialogProps {
    lead: Lead;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ConvertLeadDialog({ lead, trigger, open, onOpenChange }: ConvertLeadDialogProps) {
    const { t } = useTranslation();
    const { convertToCustomer, isConverting, conversionStep } = useLeads();
    const { estimates } = useEstimates({ leadId: lead.id }); // Fetch estimates for this lead
    // const [isLoading, setIsLoading] = useState(false); // Deprecated in favor of hook state
    const router = useRouter();

    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const onOpenChangeHandler = isControlled ? onOpenChange : setInternalOpen;

    const form = useForm<ConvertFormData>({
        resolver: zodResolver(convertSchema),
        defaultValues: {
            createContact: true,
            createProjectFromDeal: false,
            createInvoiceFromEstimate: false,
        },
    });

    const createProject = form.watch("createProjectFromDeal");
    const createInvoice = form.watch("createInvoiceFromEstimate");

    const onSubmit = async (data: ConvertFormData) => {
        try {
            // setIsLoading(true); // Handled by hook
            const customerId = await convertToCustomer(lead, {
                createContact: data.createContact,
                createProjectFromDeal: data.createProjectFromDeal,
                createInvoiceFromEstimate: data.createInvoiceFromEstimate,
                selectedEstimateId: data.selectedEstimateId,
            });

            toast.success(t("leads.convertDialog.successTitle"), {
                description: t("leads.convertDialog.successDesc"),
            });

            onOpenChangeHandler?.(false);
            router.push(`/dashboard/customers/${customerId}`);
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"), {
                description: t("leads.convertDialog.errorDesc"),
            });
        } finally {
            // setIsLoading(false); // Handled by hook
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChangeHandler}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("leads.convertDialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t("leads.convertDialog.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                            {/* Create Customer (Always checked) */}
                            <div className="flex items-start space-x-3">
                                <Checkbox checked disabled />
                                <div className="grid gap-1.5 leading-none">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {t("leads.convertDialog.createCustomerCompany")}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        {t("leads.convertDialog.createsInCustomers", {
                                            name: lead.company || lead.name,
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Create Contact */}
                            <FormField
                                control={form.control}
                                name="createContact"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>{t("leads.convertDialog.createContactPerson")}</FormLabel>
                                            <FormDescription>
                                                {t("leads.convertDialog.createsPrimaryContact", { name: lead.name })}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* Create Project */}
                            <FormField
                                control={form.control}
                                name="createProjectFromDeal"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={!lead.deal}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>{t("leads.convertDialog.createProjectFromDeal")}</FormLabel>
                                            <FormDescription>
                                                {lead.deal
                                                    ? t("leads.convertDialog.createsProject", {
                                                          subject: lead.deal.subject,
                                                      })
                                                    : t("leads.convertDialog.noDealData")}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* Create Invoice */}
                            <FormField
                                control={form.control}
                                name="createInvoiceFromEstimate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={!estimates || estimates.length === 0}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>{t("leads.convertDialog.createInvoiceFromEstimate")}</FormLabel>
                                            <FormDescription>
                                                {estimates && estimates.length > 0
                                                    ? t("leads.convertDialog.convertsEstimate")
                                                    : t("leads.convertDialog.noEstimates")}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {createInvoice && estimates && estimates.length > 0 && (
                            <FormField
                                control={form.control}
                                name="selectedEstimateId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("leads.convertDialog.selectEstimate")}</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value || estimates[0]?.id}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("leads.convertDialog.selectEstimatePlaceholder")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {estimates.map((est) => (
                                                    <SelectItem key={est.id} value={est.id}>
                                                        {est.number} - {est.currency} {est.total}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>{t("leads.convertDialog.markedAccepted")}</FormDescription>
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChangeHandler?.(false)}
                                disabled={isConverting}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isConverting}>
                                {isConverting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {conversionStep || t("leads.convertDialog.converting")}
                                    </>
                                ) : (
                                    t("leads.convertDialog.convertButton")
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
