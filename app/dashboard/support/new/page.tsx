"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSupportTickets, useStaff, useCustomers } from "@/lib/hooks";
import { SupportTicketPriority } from "@/lib/types/support";
import { useTranslation } from "@/lib/i18n";

export default function NewTicketPage() {
    const { t } = useTranslation();
    const router = useRouter();
    // FAMILY B (#9): the submit button was disabled={loading} where `loading` is the TICKET
    // LIST hook's flag — foreign state that stays true while the list query is pending (and
    // support_tickets(orgId,createdAt) had no index, so it could hang). The button now owns
    // its own submitting state.
    const { createTicket } = useSupportTickets();
    const [submitting, setSubmitting] = useState(false);
    const { staff } = useStaff();
    const { customers } = useCustomers();

    // The customer- and project-ticket tabs link here as
    // /dashboard/support/new?customerId=…(&projectId=…). Before 2026-08-07 the params were
    // ignored, so a ticket raised from a customer's tab came back unlinked and never
    // appeared in the tab that created it.
    const searchParams = useSearchParams();
    const presetCustomerId = searchParams.get("customerId") || "";
    const presetProjectId = searchParams.get("projectId") || null;

    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<SupportTicketPriority>("medium");
    const [category, setCategory] = useState("General");
    const [assignedAgentId, setAssignedAgentId] = useState<string>("unassigned");
    const [customerId, setCustomerId] = useState<string>(presetCustomerId);

    // Mock categories for V1
    const CATEGORIES = ["General", "Billing", "Technical", "Feature Request", "Bug"];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            await createTicket({
                subject,
                description,
                priority,
                category,
                source: "manual",
                status: "open",
                assignedAgentId: assignedAgentId === "unassigned" ? null : assignedAgentId,
                customerId: customerId || null,
                projectId: presetProjectId,
                metadata: {},
            });
            router.push("/dashboard/support");
        } catch (error) {
            console.error("Failed to create ticket", error);
            toast.error(error instanceof Error ? error.message : t("support.new.createFailed"));
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/support">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">{t("support.new.title")}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("support.new.detailsTitle")}</CardTitle>
                    <CardDescription>{t("support.new.detailsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label>{t("support.new.subject")}</Label>
                            <Input
                                placeholder={t("support.new.subjectPlaceholder")}
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("support.category")}</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("support.new.selectCategory")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {t(`support.categories.${c}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("support.priority")}</Label>
                                <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicketPriority)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("support.new.selectPriority")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t("support.priorities.low")}</SelectItem>
                                        <SelectItem value="medium">{t("support.priorities.medium")}</SelectItem>
                                        <SelectItem value="high">{t("support.priorities.high")}</SelectItem>
                                        <SelectItem value="critical">{t("support.priorities.critical")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("common.description")}</Label>
                            <Textarea
                                placeholder={t("support.new.descriptionPlaceholder")}
                                className="min-h-[150px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("support.new.customerOptional")}</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("support.new.selectCustomer")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.company}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("support.new.assignAgentOptional")}</Label>
                                <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("support.unassigned")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">{t("support.unassigned")}</SelectItem>
                                        {staff.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.firstName} {s.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={submitting}>
                                <Save className="mr-2 h-4 w-4" />
                                {submitting ? t("support.new.creating") : t("support.new.createButton")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
