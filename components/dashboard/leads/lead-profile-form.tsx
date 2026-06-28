"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLead } from "./lead-context";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

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

export function LeadProfileForm() {
    const router = useRouter();
    const { lead, loading, leadId, refreshLead } = useLead();
    const { register, handleSubmit, setValue } = useForm();
    const { t } = useTranslation();

    useEffect(() => {
        if (lead) {
            setValue("name", lead.name || "");
            setValue("company", lead.company || "");
            setValue("email", lead.email || "");
            setValue("phone", lead.phone || "");
            setValue("website", lead.website || "");
            setValue("position", lead.position || "");
            setValue("status", lead.status || "new");
            setValue("source", lead.source || "");
            setValue("value", lead.value || 0);
            setValue("tags", lead.tags?.join(", ") || "");
            setValue("description", lead.description || "");
            setValue("address.street", lead.address?.street || "");
            setValue("address.city", lead.address?.city || "");
            setValue("address.state", lead.address?.state || "");
            setValue("address.country", lead.address?.country || "");
            setValue("address.zipCode", lead.address?.zipCode || "");
        }
    }, [lead, setValue]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onSave = async (data: any) => {
        if (!leadId) return;

        try {
            const docRef = doc(db, "leads", leadId);
            await updateDoc(docRef, {
                name: data.name,
                company: data.company,
                email: data.email,
                phone: data.phone,
                website: data.website,
                position: data.position,
                status: data.status,
                source: data.source,
                value: parseFloat(data.value) || 0,
                tags:
                    data.tags
                        ?.split(",")
                        .map((t: string) => t.trim())
                        .filter(Boolean) || [],
                description: data.description,
                address: {
                    street: data["address.street"],
                    city: data["address.city"],
                    state: data["address.state"],
                    country: data["address.country"],
                    zipCode: data["address.zipCode"],
                },
                updatedAt: new Date(),
            });
            refreshLead();
            toast.success(t("leads.form.updateSuccess"));
        } catch (error) {
            console.error("Error updating lead:", error);
            toast.error(t("leads.form.updateError"));
        }
    };

    if (loading) {
        return <div className="p-8">{t("leads.form.loading")}</div>;
    }

    if (!lead) {
        return <div className="p-8">{t("leads.notFound")}</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold">{t("leads.form.editProfile")}</h2>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                {/* Row 1: Status, Source */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-red-500 text-sm">* {t("common.status")}</Label>
                        <Select defaultValue={lead.status} onValueChange={(val) => setValue("status", val)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("leads.form.selectStatus")} />
                            </SelectTrigger>
                            <SelectContent>
                                {LEAD_STATUSES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-red-500 text-sm">* {t("leads.fields.source")}</Label>
                        <Select defaultValue={lead.source} onValueChange={(val) => setValue("source", val)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("leads.form.selectSource")} />
                            </SelectTrigger>
                            <SelectContent>
                                {LEAD_SOURCES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 2: Name, Company */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-red-500 text-sm">* {t("common.name")}</Label>
                        <Input {...register("name", { required: true })} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("leads.fields.company")}</Label>
                        <Input {...register("company")} />
                    </div>
                </div>

                {/* Row 3: Email, Phone */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("common.email")}</Label>
                        <Input {...register("email")} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("common.phone")}</Label>
                        <Input {...register("phone")} />
                    </div>
                </div>

                {/* Row 4: Position, Website */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("leads.fields.position")}</Label>
                        <Input {...register("position")} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("leads.fields.website")}</Label>
                        <Input {...register("website")} />
                    </div>
                </div>

                {/* Row 5: Tags (Full Width) */}
                <div className="grid gap-1.5">
                    <Label className="text-sm">{t("leads.fields.tags")}</Label>
                    <Input placeholder={t("leads.form.commaSeparated")} {...register("tags")} />
                </div>

                {/* Row 6: Country, City */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("leads.fields.country")}</Label>
                        <Select
                            defaultValue={lead.address?.country || ""}
                            onValueChange={(val) => setValue("address.country", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("leads.form.selectCountry")} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {COUNTRIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("leads.fields.city")}</Label>
                        <Input {...register("address.city")} />
                    </div>
                </div>

                {/* Row 7: Street, State */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("leads.fields.streetAddress")}</Label>
                        <Input {...register("address.street")} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-sm">{t("leads.fields.stateZip")}</Label>
                        <div className="flex gap-2">
                            <Input placeholder={t("leads.fields.state")} {...register("address.state")} />
                            <Input placeholder={t("leads.fields.zip")} className="w-28" {...register("address.zipCode")} />
                        </div>
                    </div>
                </div>

                {/* Row 8: Description */}
                <div className="grid gap-1.5">
                    <Label className="text-sm">{t("common.description")}</Label>
                    <Textarea className="min-h-[80px]" {...register("description")} />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button type="submit">{t("common.saveChanges")}</Button>
                    <Button type="button" variant="outline" onClick={() => router.push("/dashboard/leads")}>
                        {t("common.cancel")}
                    </Button>
                </div>
            </form>
        </div>
    );
}
