"use client";

import { useState } from "react";
import { useActivities } from "@/lib/hooks/use-activities";
import { ActivityTypeBadge } from "./activity-type-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Search, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import type { Activity, ActivityType, ActivityOutcome } from "@/lib/types";
import { CreateActivityDialog } from "./create-activity-dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface ActivitiesTableProps {
    relatedToType: "lead" | "customer";
    relatedToId: string;
}

const outcomeColors: Record<ActivityOutcome, { bg: string; text: string }> = {
    completed: { bg: "bg-green-100", text: "text-green-700" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
    cancelled: { bg: "bg-red-100", text: "text-red-700" },
};

export function ActivitiesTable({ relatedToType, relatedToId }: ActivitiesTableProps) {
    const { t } = useTranslation();
    const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
    const [outcomeFilter, setOutcomeFilter] = useState<ActivityOutcome | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);

    const { activities, loading, deleteActivity } = useActivities({
        relatedToType,
        relatedToId,
        type: typeFilter,
        outcome: outcomeFilter,
    });

    // Client-side search filter
    const filteredActivities = activities.filter(
        (a) =>
            searchQuery === "" ||
            a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async () => {
        if (!deletingActivity) return;
        try {
            await deleteActivity(deletingActivity.id);
            toast.success(t("activities.toast.deleted"));
            setDeletingActivity(null);
        } catch (error) {
            console.error(error);
            toast.error(t("activities.toast.deleteFailed"));
        }
    };

    const formatDateTime = (timestamp: Timestamp) => {
        try {
            return format(timestamp.toDate(), "MMM d, yyyy h:mm a");
        } catch {
            return "-";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder={t("activities.searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ActivityType | "all")}>
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder={t("activities.filter.type")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("activities.filter.allTypes")}</SelectItem>
                            <SelectItem value="meeting">{t("activities.type.meeting")}</SelectItem>
                            <SelectItem value="call">{t("activities.type.call")}</SelectItem>
                            <SelectItem value="follow_up">{t("activities.type.followUp")}</SelectItem>
                            <SelectItem value="email">{t("activities.type.email")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v as ActivityOutcome | "all")}>
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder={t("activities.filter.outcome")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("activities.filter.allOutcomes")}</SelectItem>
                            <SelectItem value="pending">{t("activities.outcome.pending")}</SelectItem>
                            <SelectItem value="completed">{t("activities.outcome.completed")}</SelectItem>
                            <SelectItem value="cancelled">{t("activities.outcome.cancelled")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("activities.logActivity")}
                </Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-white overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900">{t("activities.table.type")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("activities.table.subject")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("activities.table.dateTime")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("activities.table.duration")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("activities.table.outcome")}</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredActivities.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Calendar className="h-8 w-8 text-gray-300" />
                                        <p>{t("activities.empty.title")}</p>
                                        <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                                            <Plus className="mr-2 h-4 w-4" /> {t("activities.empty.action")}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredActivities.map((activity) => (
                                <TableRow key={activity.id} className="group hover:bg-gray-50">
                                    <TableCell>
                                        <ActivityTypeBadge type={activity.type} size="sm" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-gray-900">{activity.subject}</div>
                                        {activity.notes && (
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                                {activity.notes}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm">
                                        {formatDateTime(activity.dateTime)}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm">
                                        {activity.duration ? (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {t("activities.durationMinutes", { count: activity.duration })}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`${outcomeColors[activity.outcome].bg} ${outcomeColors[activity.outcome].text} border-0 capitalize`}
                                        >
                                            {t(`activities.outcome.${activity.outcome}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setEditingActivity(activity)}
                                            >
                                                <Pencil className="h-4 w-4 text-gray-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setDeletingActivity(activity)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Dialog */}
            <CreateActivityDialog
                open={showCreateDialog || !!editingActivity}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setEditingActivity(null);
                    }
                }}
                relatedTo={{ type: relatedToType, id: relatedToId }}
                activity={editingActivity}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("activities.delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("activities.delete.description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
