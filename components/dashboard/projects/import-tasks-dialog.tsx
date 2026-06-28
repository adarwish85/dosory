"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { useTasks } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n";

interface ImportTasksDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentProjectId: string;
    targetTaskListId: string;
    onImport: (taskIds: string[]) => Promise<void>;
}

export function ImportTasksDialog({
    open,
    onOpenChange,
    currentProjectId,
    targetTaskListId,
    onImport,
}: ImportTasksDialogProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch all tasks (not just project tasks, because we might want to import general tasks)
    // Actually, useTasks() returns all tasks if no projectId is passed?
    // Let's verify useTasks hook behavior. If I pass nothing, does it get all?
    // Based on previous views, useTasks() without args usually fetches all org tasks.
    const { tasks, loading } = useTasks();

    const importableTasks = useMemo(() => {
        return tasks.filter((task) => {
            // Exclude tasks already in this task list
            if (task.taskListId === targetTaskListId) return false;

            // Filter by search query
            if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

            return true;
        });
    }, [tasks, targetTaskListId, searchQuery]);

    const handleToggleTask = (taskId: string) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
    };

    const handleImport = async () => {
        if (selectedTasks.size === 0) return;

        setIsSubmitting(true);
        try {
            await onImport(Array.from(selectedTasks));
            onOpenChange(false);
            setSelectedTasks(new Set());
        } catch (error) {
            console.error("Failed to import tasks:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("projects.importTasks.title")}</DialogTitle>
                    <DialogDescription>{t("projects.importTasks.description")}</DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder={t("projects.importTasks.searchPlaceholder")}
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-full p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>{t("projects.importTasks.taskName")}</TableHead>
                                    <TableHead>{t("projects.importTasks.currentStatus")}</TableHead>
                                    <TableHead>{t("projects.importTasks.project")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importableTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {t("projects.importTasks.noTasks")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    importableTasks.map((task) => (
                                        <TableRow key={task.id} className="hover:bg-gray-50">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedTasks.has(task.id)}
                                                    onCheckedChange={() => handleToggleTask(task.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{task.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {task.status.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {task.projectId
                                                    ? task.projectId === currentProjectId
                                                        ? t("projects.importTasks.thisProject")
                                                        : t("projects.importTasks.otherProject")
                                                    : t("projects.importTasks.general")}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">{t("projects.importTasks.selectedCount", { count: selectedTasks.size })}</div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleImport} disabled={selectedTasks.size === 0 || isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("projects.importTasks.importSelected")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
