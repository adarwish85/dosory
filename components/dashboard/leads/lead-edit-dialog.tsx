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
import { useAssignableStaff } from "@/lib/hooks/use-staff";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeads, usePermission } from "@/lib/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

// World Countries
const COUNTRIES = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahrain",
    "Bangladesh",
    "Belarus",
    "Belgium",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Chile",
    "China",
    "Colombia",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Estonia",
    "Ethiopia",
    "Finland",
    "France",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Guatemala",
    "Honduras",
    "Hong Kong",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kuwait",
    "Latvia",
    "Lebanon",
    "Libya",
    "Lithuania",
    "Luxembourg",
    "Malaysia",
    "Mexico",
    "Moldova",
    "Monaco",
    "Morocco",
    "Netherlands",
    "New Zealand",
    "Nigeria",
    "North Korea",
    "Norway",
    "Oman",
    "Pakistan",
    "Palestine",
    "Panama",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Saudi Arabia",
    "Serbia",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "South Africa",
    "South Korea",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Thailand",
    "Tunisia",
    "Turkey",
    "UAE",
    "UK",
    "Ukraine",
    "Uruguay",
    "USA",
    "Uzbekistan",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zimbabwe",
];

interface LeadEditSheetProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onSave: (id: string, data: Partial<LeadFormData>) => Promise<void>;
}

export function LeadEditSheet({ open, onClose, lead, onSave }: LeadEditSheetProps) {
    const { t } = useTranslation();
    const { staff } = useAssignableStaff();
    const { leads } = useLeads({});
    const { can } = usePermission();
    const [duplicateWarning, setDuplicateWarning] = useState<{ type: "email" | "phone"; duplicates: Lead[] } | null>(
        null
    );

    // Add Status/Source dialogs
    const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
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
            const emailDuplicates = leads.filter(
                (l) => l.id !== lead.id && l.email && l.email.toLowerCase() === watchedEmail.toLowerCase()
            );
            if (emailDuplicates.length > 0) {
                setDuplicateWarning({ type: "email", duplicates: emailDuplicates });
                return;
            }
        }

        // Check for phone duplicates
        if (watchedPhone) {
            const phoneDuplicates = leads.filter(
                (l) => l.id !== lead.id && l.phone && l.phone.replace(/\D/g, "") === watchedPhone.replace(/\D/g, "")
            );
            if (phoneDuplicates.length > 0) {
                setDuplicateWarning({ type: "phone", duplicates: phoneDuplicates });
                return;
            }
        }

        setDuplicateWarning(null);
    }, [watchedEmail, watchedPhone, leads, lead]);

    // SWEEP B: this sheet renders no <FormMessage> anywhere, so a zod failure produced no
    // visible feedback at all — Save simply did nothing. Surface the first failing field.
    const handleInvalid = (errors: Record<string, { message?: string }>) => {
        const first = Object.keys(errors)[0];
        toast.error(errors[first]?.message || t("leads.edit.validationFailed"));
    };

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
                            {t("leads.edit.title", { name: lead.name })}
                        </SheetTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 text-gray-400 hover:text-gray-500"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
                        <ScrollArea className="flex-1">
                            <div className="p-4">
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
                                        className="space-y-3"
                                    >
                                        {/* Duplicate Warning */}
                                        {duplicateWarning && (
                                            <Alert
                                                variant="destructive"
                                                className="bg-yellow-50 border-yellow-300 text-yellow-800"
                                            >
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>{t("leads.edit.duplicateTitle")}</AlertTitle>
                                                <AlertDescription>
                                                    {t("leads.edit.duplicateDesc", {
                                                        type: duplicateWarning.type,
                                                    })}{" "}
                                                    {duplicateWarning.duplicates.map((d, i) => (
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
                                                        <FormLabel className="text-red-500 text-xs">
                                                            {t("leads.edit.statusLabel")}
                                                        </FormLabel>
                                                        <div className="flex gap-1">
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue
                                                                            placeholder={t(
                                                                                "leads.edit.selectPlaceholder"
                                                                            )}
                                                                        />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {allStatuses.map((status) => (
                                                                        <SelectItem
                                                                            key={status.value}
                                                                            value={status.value}
                                                                        >
                                                                            {status.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="source"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-red-500 text-xs">
                                                            {t("leads.edit.sourceLabel")}
                                                        </FormLabel>
                                                        <div className="flex gap-1">
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue
                                                                            placeholder={t(
                                                                                "leads.edit.selectPlaceholder"
                                                                            )}
                                                                        />
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
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-9 w-9 shrink-0"
                                                                onClick={() => setShowAddSourceDialog(true)}
                                                                disabled={!can("leads-edit")}
                                                            >
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
                                                        <FormLabel className="text-xs">
                                                            {t("leads.edit.assigned")}
                                                        </FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue
                                                                        placeholder={t("leads.edit.selectStaff")}
                                                                    />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="unassigned">
                                                                    {t("leads.edit.unassigned")}
                                                                </SelectItem>
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
                                                        <FormLabel className="text-red-500 text-xs">
                                                            {t("leads.edit.nameLabel")}
                                                        </FormLabel>
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
                                                        <FormLabel className="text-xs">{t("common.email")}</FormLabel>
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
                                                        <FormLabel className="text-xs">{t("common.phone")}</FormLabel>
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
                                                        <FormLabel className="text-xs">
                                                            {t("leads.edit.position")}
                                                        </FormLabel>
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
                                                        <FormLabel className="text-xs">
                                                            {t("leads.edit.company")}
                                                        </FormLabel>
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
                                                        <FormLabel className="text-xs">
                                                            {t("leads.edit.website")}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="space-y-1">
                                                <FormLabel className="text-xs">{t("leads.edit.country")}</FormLabel>
                                                <Select
                                                    onValueChange={(val) => form.setValue("address.country", val)}
                                                    value={form.watch("address.country") || ""}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder={t("leads.edit.selectCountry")} />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[200px]">
                                                        {COUNTRIES.map((country) => (
                                                            <SelectItem key={country} value={country}>
                                                                {country}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <FormLabel className="text-xs">{t("leads.edit.city")}</FormLabel>
                                                <Input {...form.register("address.city")} className="h-9" />
                                            </div>
                                        </div>

                                        {/* Row 5: Lead Value, Tags */}
                                        <div className="grid grid-cols-1">
                                            <FormField
                                                control={form.control}
                                                name="tags"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">
                                                            {t("leads.edit.tags")}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={t("leads.edit.tagsPlaceholder")}
                                                                {...field}
                                                                className="h-9"
                                                                value={field.value?.join(", ") || ""}
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        e.target.value
                                                                            .split(",")
                                                                            .map((t) => t.trim())
                                                                            .filter(Boolean)
                                                                    )
                                                                }
                                                            />
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
                        <Button variant="outline" size="sm" onClick={onClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            size="sm"
                            onClick={form.handleSubmit(handleSubmit, handleInvalid)}
                            className="bg-gray-900 text-white hover:bg-gray-800"
                            disabled={!can("leads-edit")}
                        >
                            {t("common.saveChanges")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* The "+ Add Status" affordance was REMOVED on 2026-08-08.
                It slugified free text and called form.setValue("status", slug), but `status`
                is a fixed zod enum (leadStatusSchema). The value never validated, so Save
                silently did nothing from that moment on — the sheet was bricked until reload.
                Per the CLAUDE.md rule, an affordance the schema rejects is a bug: it is either
                wired end-to-end or removed. Persisting custom lead statuses would need a
                per-tenant status collection plus dynamic validation everywhere status is read
                — a feature, not a fix — so the fixed vocabulary stands and the button is gone.
                NOTE: the "+ Add Source" dialog below is NOT the same case and stays: `source`
                is z.string().optional(), so any value it writes validates. */}
            <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{t("leads.edit.addSourceTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            placeholder={t("leads.edit.sourceNamePlaceholder")}
                            value={newSourceValue}
                            onChange={(e) => setNewSourceValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newSourceValue.trim()) {
                                    setCustomSources((prev) => [...prev, newSourceValue.trim()]);
                                    form.setValue("source", newSourceValue.trim());
                                    setNewSourceValue("");
                                    setShowAddSourceDialog(false);
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddSourceDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            disabled={!newSourceValue.trim()}
                            onClick={() => {
                                setCustomSources((prev) => [...prev, newSourceValue.trim()]);
                                form.setValue("source", newSourceValue.trim());
                                setNewSourceValue("");
                                setShowAddSourceDialog(false);
                            }}
                        >
                            {t("leads.edit.addSourceButton")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
