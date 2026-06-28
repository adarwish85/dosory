"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useReminders } from "@/lib/hooks/use-reminders"; // Created in previous step
import { useStaff } from "@/lib/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Bell, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { CreateReminderDialog } from "@/components/dashboard/reminders/create-reminder-dialog";
import { useTranslation } from "@/lib/i18n";

export default function LeadRemindersPage() {
    const params = useParams();
    const leadId = params?.id as string;
    const { t } = useTranslation();

    // Fetch reminders related to this lead
    const { reminders, loading, deleteReminder } = useReminders({
        relatedTo: { type: "lead", id: leadId }
    });

    const { staff } = useStaff();

    const [isCreateOpen, setIsCreateOpen] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "PP p"); // Date and Time
        } catch {
            return "-";
        }
    };

    const getStaffName = (id: string) => {
        const member = staff.find(s => s.id === id);
        return member ? `${member.firstName} ${member.lastName}` : t("leads.reminders.unknown");
    };

    const handleDelete = async (id: string) => {
        if (confirm(t("leads.reminders.deleteConfirm"))) {
            await deleteReminder(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t("leads.reminders.title")}</h2>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("leads.reminders.setReminder")}
                </Button>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900">{t("leads.reminders.table.description")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.reminders.table.dateTime")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.reminders.table.assignedTo")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.reminders.table.createdBy")}</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reminders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Bell className="h-8 w-8 text-gray-300" />
                                        <p>{t("leads.reminders.empty")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            reminders.map((reminder) => (
                                <TableRow key={reminder.id} className="group hover:bg-gray-50">
                                    <TableCell className="font-medium">
                                        {reminder.description}
                                    </TableCell>
                                    <TableCell className="text-gray-500">{formatDate(reminder.date)}</TableCell>
                                    <TableCell className="text-gray-500">
                                        {getStaffName(reminder.assignedTo)}
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {getStaffName(reminder.createdBy)}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(reminder.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CreateReminderDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                leadId={leadId}
            />
        </div>
    );
}
