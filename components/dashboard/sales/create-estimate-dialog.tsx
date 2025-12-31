"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { estimateFormSchema } from "@/lib/schemas";
import { useEstimates } from "@/lib/hooks/use-sales";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useSettings } from "@/lib/hooks";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Extend schema for form usage if needed, but schema is good.
type EstimateFormData = z.infer<typeof estimateFormSchema>;

interface CreateEstimateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId?: string;
    customerId?: string;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
    initialData?: Partial<EstimateFormData>;
}

export function CreateEstimateDialog({
    open,
    onOpenChange,
    leadId,
    customerId,
    trigger,
    onSuccess,
    initialData,
}: CreateEstimateDialogProps) {
    const { createEstimate } = useEstimates();
    const { profile } = useUserProfile();
    const { settings } = useSettings();
    const currency = settings.currency || "USD";

    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<{ id: string; company: string }[]>([]);

    // Fetch clients if no context provided (or even if provided, to allow switch? No, context locks it usually)
    // If inside Lead profile, we hide Client Select.
    // If inside Customer profile, we auto-select Client.
    useEffect(() => {
        async function fetchClients() {
            if (!profile?.orgId) return;
            // Only fetch if we need to select a client
            if (!leadId && !customerId) {
                const q = query(collection(db, "customers"), where("orgId", "==", profile.orgId));
                const querySnapshot = await getDocs(q);
                const clientList: { id: string; company: string }[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    clientList.push({ id: doc.id, company: data.company });
                });
                setClients(clientList);
            }
        }
        fetchClients();
    }, [profile?.orgId, leadId, customerId]);

    const form = useForm<EstimateFormData>({
        resolver: zodResolver(estimateFormSchema),
        defaultValues: {
            customerId: customerId || "",
            leadId: leadId || "",
            date: new Date(),
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            currency: currency,
            items: [{ id: "1", description: "Service", quantity: 1, rate: 100, amount: 100 }],
            notes: "",
            terms: "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    // Reset when open changes
    useEffect(() => {
        if (open) {
            form.reset({
                customerId: customerId || undefined,
                leadId: leadId || undefined,
                date: new Date(),
                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                currency: currency,
                items: [{ id: "1", description: "Service", quantity: 1, rate: 100, amount: 100 }],
                notes: "",
                terms: "",
                ...initialData,
            });
        }
    }, [open, customerId, leadId, currency, form, initialData]);

    const onSubmit = async (data: EstimateFormData) => {
        try {
            setIsLoading(true);
            await createEstimate(data);
            toast.success("Estimate Created");
            onOpenChange(false);
            onSuccess?.();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create estimate", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate total for display
    const items = form.watch("items");
    const total = items?.reduce((sum, item) => sum + item.quantity * item.rate, 0) || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Estimate</DialogTitle>
                    <DialogDescription>
                        Create an estimate for {leadId ? "this lead" : customerId ? "this customer" : "a client"}.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Client Selection - Hide if locked */}
                            {!leadId && !customerId && (
                                <FormField
                                    control={form.control}
                                    name="customerId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a client" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {clients.map((client) => (
                                                        <SelectItem key={client.id} value={client.id}>
                                                            {client.company}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date</FormLabel>
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
                                                            <span>Pick a date</span>
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
                                name="expiryDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Expiry Date</FormLabel>
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
                                                            <span>Pick a date</span>
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
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel className="text-base font-semibold">Line Items</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        append({
                                            id: Math.random().toString(),
                                            description: "",
                                            quantity: 1,
                                            rate: 0,
                                            amount: 0,
                                        })
                                    }
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="grid grid-cols-12 gap-2 items-start border p-2 rounded-md bg-gray-50/50"
                                    >
                                        <div className="col-span-5">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.description`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input placeholder="Description" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="Qty"
                                                                {...field}
                                                                onChange={(e) =>
                                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.rate`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="Rate"
                                                                {...field}
                                                                onChange={(e) =>
                                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total)}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Additional notes..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Estimate
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
