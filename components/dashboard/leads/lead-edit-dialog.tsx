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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

// World Countries
const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia and Herzegovina", "Brazil", "Brunei", "Bulgaria",
    "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia",
    "Finland", "France", "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
    "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg",
    "Malaysia", "Mexico", "Moldova", "Monaco", "Morocco", "Netherlands", "New Zealand", "Nigeria", "North Korea", "Norway",
    "Oman", "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
    "Romania", "Russia", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain",
    "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan", "Thailand", "Tunisia", "Turkey",
    "UAE", "UK", "Ukraine", "Uruguay", "USA", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zimbabwe"
];


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

    // Add Status/Source dialogs
    const [showAddStatusDialog, setShowAddStatusDialog] = useState(false);
    const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
    const [newStatusValue, setNewStatusValue] = useState("");
    const [newSourceValue, setNewSourceValue] = useState("");
    const [customStatuses, setCustomStatuses] = useState<{ value: string; label: string }[]>([]);
    const [customSources, setCustomSources] = useState<string[]>([]);

    // Combined lists
    const allStatuses = useMemo(() => [...LEAD_STATUSES, ...customStatuses], [customStatuses]);
    const allSources = useMemo(() => [...LEAD_SOURCES, ...customSources], [customSources]);

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
        <>
            <Sheet open={open} onOpenChange={onClose}>
                <SheetContent className="w-[90%] sm:max-w-[800px] p-0 gap-0 bg-white flex flex-col">
                    <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                        <SheetTitle className="text-lg font-bold">
                            Edit Lead - {lead.name}
                        </SheetTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-gray-500">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
                        <ScrollArea className="flex-1">
                            <div className="p-4">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
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

                                        {/* Row 1: Status, Source, Assigned */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="status"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-red-500 text-xs">* Status</FormLabel>
                                                        <div className="flex gap-1">
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Select" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {allStatuses.map((status) => (
                                                                        <SelectItem key={status.value} value={status.value}>
                                                                            {status.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowAddStatusDialog(true)}>
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="source"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-red-500 text-xs">* Source</FormLabel>
                                                        <div className="flex gap-1">
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Select" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {allSources.map((source) => (
                                                                        <SelectItem key={source} value={source}>
                                                                            {source}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowAddSourceDialog(true)}>
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="assignedTo"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Assigned</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue placeholder="Select staff" />
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
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Row 2: Name, Email, Phone */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-red-500 text-xs">* Name</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Email</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Phone</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Row 3: Position, Company */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="position"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Position</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="company"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Company</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Row 4: Website, Country, City */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="website"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Website</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="space-y-1">
                                                <FormLabel className="text-xs">Country</FormLabel>
                                                <Select onValueChange={(val) => form.setValue("address.country", val)} value={form.watch("address.country") || ""}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Select country" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[200px]">
                                                        {COUNTRIES.map((country) => (
                                                            <SelectItem key={country} value={country}>{country}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <FormLabel className="text-xs">City</FormLabel>
                                                <Input {...form.register("address.city")} className="h-9" />
                                            </div>
                                        </div>

                                        {/* Row 5: Lead Value, Tags */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="value"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Lead Value</FormLabel>
                                                        <div className="flex gap-1">
                                                            <FormControl>
                                                                <Input type="number" {...field} className="h-9" onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                                                            </FormControl>
                                                            <div className="flex items-center border rounded px-2 bg-gray-50 text-xs text-gray-500">EGP</div>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="tags"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Tags</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Comma-separated" {...field} className="h-9" value={field.value?.join(", ") || ""} onChange={(e) => field.onChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </form>
                                </Form>
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="p-3 border-t bg-white mt-auto flex justify-end gap-2 sticky bottom-0">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                        <Button size="sm" onClick={form.handleSubmit(handleSubmit)} className="bg-gray-900 text-white hover:bg-gray-800">
                            Save Changes
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Add Status Dialog */}
            <Dialog open={showAddStatusDialog} onOpenChange={setShowAddStatusDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Add New Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            placeholder="Enter new status name"
                            value={newStatusValue}
                            onChange={(e) => setNewStatusValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newStatusValue.trim()) {
                                    const slug = newStatusValue.toLowerCase().replace(/\s+/g, "_");
                                    setCustomStatuses(prev => [...prev, { value: slug, label: newStatusValue.trim() }]);
                                    form.setValue("status", slug);
                                    setNewStatusValue("");
                                    setShowAddStatusDialog(false);
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddStatusDialog(false)}>Cancel</Button>
                        <Button
                            disabled={!newStatusValue.trim()}
                            onClick={() => {
                                const slug = newStatusValue.toLowerCase().replace(/\s+/g, "_");
                                setCustomStatuses(prev => [...prev, { value: slug, label: newStatusValue.trim() }]);
                                form.setValue("status", slug);
                                setNewStatusValue("");
                                setShowAddStatusDialog(false);
                            }}
                        >
                            Add Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Source Dialog */}
            <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Add New Source</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            placeholder="Enter new source name"
                            value={newSourceValue}
                            onChange={(e) => setNewSourceValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newSourceValue.trim()) {
                                    setCustomSources(prev => [...prev, newSourceValue.trim()]);
                                    form.setValue("source", newSourceValue.trim());
                                    setNewSourceValue("");
                                    setShowAddSourceDialog(false);
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddSourceDialog(false)}>Cancel</Button>
                        <Button
                            disabled={!newSourceValue.trim()}
                            onClick={() => {
                                setCustomSources(prev => [...prev, newSourceValue.trim()]);
                                form.setValue("source", newSourceValue.trim());
                                setNewSourceValue("");
                                setShowAddSourceDialog(false);
                            }}
                        >
                            Add Source
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
