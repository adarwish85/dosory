"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { leadFormSchema, type LeadFormData } from "@/lib/schemas";
import type { Lead } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import { Printer, X, Plus, AlertTriangle } from "lucide-react";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";
import { useStaff } from "@/lib/hooks/use-staff";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeads } from "@/lib/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface LeadEditSheetProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onSave: (id: string, data: Partial<LeadFormData>) => Promise<void>;
}

export function LeadEditSheet({ open, onClose, lead, onSave }: LeadEditSheetProps) {
    const { staff } = useStaff();
    const { leads } = useLeads({});
    const [duplicateWarning, setDuplicateWarning] = useState<{ type: "email" | "phone"; duplicates: Lead[] } | null>(null);

    const form = useForm({
        resolver: zodResolver(leadFormSchema),
        defaultValues: {
            name: "",
            status: "new",
            description: "",
            isPublic: false,
        },
    });

    useEffect(() => {
        if (lead) {
            form.reset({
                name: lead.name,
                company: lead.company || "",
                email: lead.email || "",
                phone: lead.phone || "",
                website: lead.website || "",
                address: lead.address || {},
                source: lead.source || "",
                status: lead.status,
                assignedTo: lead.assignedTo || "",
                value: lead.value || undefined,
                tags: lead.tags || [],
                description: lead.description || "",
                position: lead.position || "",
                defaultLanguage: lead.defaultLanguage || "",
                isPublic: lead.isPublic || false,
                lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.toDate() : undefined,
            });
        }
    }, [lead, form]);

    // Check for duplicates when email or phone changes
    const watchedEmail = form.watch("email");
    const watchedPhone = form.watch("phone");

    useEffect(() => {
        if (!lead || !leads.length) return;

        // Check for email duplicates
        if (watchedEmail) {
            const emailDuplicates = leads.filter(l =>
                l.id !== lead.id &&
                l.email &&
                l.email.toLowerCase() === watchedEmail.toLowerCase()
            );
            if (emailDuplicates.length > 0) {
                setDuplicateWarning({ type: "email", duplicates: emailDuplicates });
                return;
            }
        }

        // Check for phone duplicates
        if (watchedPhone) {
            const phoneDuplicates = leads.filter(l =>
                l.id !== lead.id &&
                l.phone &&
                l.phone.replace(/\D/g, '') === watchedPhone.replace(/\D/g, '')
            );
            if (phoneDuplicates.length > 0) {
                setDuplicateWarning({ type: "phone", duplicates: phoneDuplicates });
                return;
            }
        }

        setDuplicateWarning(null);
    }, [watchedEmail, watchedPhone, leads, lead]);

    const handleSubmit = async (data: LeadFormData) => {
        if (!lead) return;
        try {
            await onSave(lead.id, data);
            onClose();
        } catch (error) {
            console.error("Failed to save lead", error);
        }
    };

    if (!lead) return null;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[90%] sm:max-w-[800px] p-0 gap-0 bg-white flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                        Edit Lead #{lead.id.substring(0, 4)}
                    </SheetTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                    {/* Duplicate Warning */}
                                    {duplicateWarning && (
                                        <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-800">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Potential Duplicate Found!</AlertTitle>
                                            <AlertDescription>
                                                A lead with this {duplicateWarning.type} already exists: {duplicateWarning.duplicates.map((d, i) => (
                                                    <span key={d.id}>
                                                        {i > 0 && ", "}
                                                        <strong>{d.name}</strong>
                                                        {d.company && ` (${d.company})`}
                                                    </span>
                                                ))}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Top Row: Status, Source, Assigned */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-red-500">* Status</FormLabel>
                                                    <div className="flex gap-2">
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select status" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {LEAD_STATUSES.map((status) => (
                                                                    <SelectItem key={status.value} value={status.value}>
                                                                        {status.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button type="button" variant="outline" size="icon" className="shrink-0">
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="source"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-red-500">* Source</FormLabel>
                                                    <div className="flex gap-2">
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select source" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {LEAD_SOURCES.map((source) => (
                                                                    <SelectItem key={source} value={source}>
                                                                        {source}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button type="button" variant="outline" size="icon" className="shrink-0">
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="assignedTo"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Assigned</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select staff member" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                                            {staff.map((member) => (
                                                                <SelectItem key={member.id} value={member.id}>
                                                                    {member.firstName} {member.lastName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Tags */}
                                    <FormField
                                        control={form.control}
                                        name="tags"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tags</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Tag" {...field} value={field.value?.join(", ") || ""} onChange={(e) => field.onChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-red-500">* Name</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-2">
                                            <FormLabel>Address</FormLabel>
                                            <Input {...form.register("address.street")} />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="position"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Position</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-2">
                                            <FormLabel>City</FormLabel>
                                            <Input {...form.register("address.city")} />
                                        </div>


                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email Address</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-2">
                                            <FormLabel>State</FormLabel>
                                            <Input {...form.register("address.state")} />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="website"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Website</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-2">
                                            <FormLabel>Country</FormLabel>
                                            <Select onValueChange={(val) => form.setValue("address.country", val)} defaultValue={form.getValues("address.country")}>
                                                <SelectTrigger><SelectValue placeholder="Nothing selected" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="USA">USA</SelectItem>
                                                    <SelectItem value="Egypt">Egypt</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-2">
                                            <FormLabel>Zip Code</FormLabel>
                                            <Input {...form.register("address.zipCode")} />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="value"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Lead value</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                                                        </FormControl>
                                                        <div className="flex items-center justify-center border rounded px-3 bg-gray-50 text-sm text-gray-500">
                                                            EGP
                                                        </div>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="defaultLanguage"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Default Language</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="System Default" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="en">English</SelectItem>
                                                            <SelectItem value="ar">Arabic</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="company"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Company</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
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
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} className="min-h-[100px]" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="lastContactedAt"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Last Contact</FormLabel>
                                                    <FormControl>
                                                        <DatePicker
                                                            date={field.value}
                                                            setDate={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="isPublic"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>
                                                            Public
                                                        </FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t bg-white mt-auto flex justify-end gap-2 sticky bottom-0">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={form.handleSubmit(handleSubmit)} className="bg-gray-900 text-white hover:bg-gray-800">
                        Save Changes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
