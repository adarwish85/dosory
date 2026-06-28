"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useContract, useContracts, useCustomers } from "@/lib/hooks";
import { ContractFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import { useTranslation } from "@/lib/i18n";

export default function EditContractPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    // Hooks
    const { contract, loading: contractLoading } = useContract(id);
    const { updateContract } = useContracts();
    const { customers, loading: customersLoading } = useCustomers({ limit: 1000, status: "active" });

    // Local State
    const [selectedClientId, setSelectedClientId] = useState("");
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [subject, setSubject] = useState("");
    const [contractValue, setContractValue] = useState<string>("0");
    const [description, setDescription] = useState("");
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Initialize state when contract loads
    useEffect(() => {
        if (contract) {
            setSelectedClientId(contract.customerId);
            setSubject(contract.subject);
            setContractValue(contract.contractValue?.toString() || "0");
            setDescription(contract.description || "");
            setContent(contract.content || "");

            // Handle Dates (Firestore Timestamp or Date)
            if (contract.startDate) {
                const date =
                    contract.startDate instanceof Timestamp
                        ? contract.startDate.toDate()
                        : new Date(contract.startDate);
                setStartDate(date);
            }
            if (contract.endDate) {
                const date =
                    contract.endDate instanceof Timestamp ? contract.endDate.toDate() : new Date(contract.endDate);
                setEndDate(date);
            }
        }
    }, [contract]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedClientId) {
            toast.error(t("contracts.edit.selectClientError"));
            return;
        }
        if (!startDate) {
            toast.error(t("contracts.edit.startDateError"));
            return;
        }

        setSubmitting(true);
        try {
            const formData: ContractFormData = {
                subject,
                customerId: selectedClientId,
                startDate: startDate,
                endDate: endDate,
                contractValue: parseFloat(contractValue) || 0,
                description,
                content,
            };

            await updateContract(id, formData);
            toast.success(t("contracts.toast.updated"));
            router.push(`/dashboard/contracts/${id}`);
        } catch (error) {
            console.error("Error updating contract:", error);
            toast.error(t("contracts.toast.updateFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    if (contractLoading || customersLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!contract) {
        return <div className="p-8 text-center text-gray-500">{t("contracts.detail.notFound")}</div>;
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">{t("contracts.edit.title")}</h2>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("contracts.edit.sectionDetails")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>
                                {t("contracts.form.subject")} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t("contracts.edit.subjectPlaceholder")}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>
                                {t("contracts.edit.client")} <span className="text-red-500">*</span>
                            </Label>
                            <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("contracts.edit.selectClient")} />
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
                            <Label>{t("contracts.form.value")}</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={contractValue}
                                onChange={(e) => setContractValue(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>
                                    {t("contracts.form.startDate")} <span className="text-red-500">*</span>
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : <span>{t("contracts.form.pickDate")}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("contracts.form.endDate")}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !endDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "PPP") : <span>{t("contracts.form.pickDate")}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("contracts.form.description")}</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("contracts.edit.descriptionPlaceholder")}
                                className="h-24"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t("contracts.form.content")}</Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={t("contracts.edit.contentPlaceholder")}
                                className="h-48 font-mono text-sm"
                            />
                        </div>
                    </CardContent>
                    <div className="flex justify-end p-6 border-t bg-gray-50 rounded-b-lg">
                        <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("contracts.edit.updating")}
                                </>
                            ) : (
                                t("contracts.edit.submit")
                            )}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
