"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTimesheets } from "@/lib/hooks/use-project-data";
import { useTasks } from "@/lib/hooks/use-projects";
import { useStaff } from "@/lib/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { timeLogSchema, type TimeLogFormData } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Plus, Loader2, StopCircle, PlayCircle, Clock, DollarSign, User } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/i18n";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

export default function TimesheetsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { logs, totalDuration, loading, logTime, startTimer, stopTimer } = useTimesheets(projectId);
    const { tasks } = useTasks({ projectId });
    const { staff } = useStaff();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string>("");

    // Find active timer if any (where endTime is missing)
    const activeTimer = logs.find(l => !l.endTime && l.startTime);

    // Calculate billable vs non-billable
    const billableTime = logs.filter(l => l.billable).reduce((acc, l) => acc + (l.duration || 0), 0);
    const nonBillableTime = logs.filter(l => !l.billable).reduce((acc, l) => acc + (l.duration || 0), 0);

    // Create a map of userId to staff member for quick lookup
    const staffMap = useMemo(() => {
        const map = new Map<string, { name: string; email: string }>();
        staff.forEach(s => {
            map.set(s.id, { name: `${s.firstName} ${s.lastName}`, email: s.email });
        });
        return map;
    }, [staff]);

    // Create a map of taskId to task name
    const taskMap = useMemo(() => {
        const map = new Map<string, string>();
        tasks.forEach(t => {
            map.set(t.id, t.name);
        });
        return map;
    }, [tasks]);

    // Get user display name
    const getUserName = (userId: string) => {
        const staffMember = staffMap.get(userId);
        if (staffMember) return staffMember.name;
        return t("projects.timesheets.unknownUser");
    };

    // Get task name
    const getTaskName = (taskId?: string) => {
        if (!taskId) return null;
        return taskMap.get(taskId) || t("projects.timesheets.unknownTask");
    };

    const form = useForm<TimeLogFormData>({
        resolver: zodResolver(timeLogSchema) as any,
        defaultValues: {
            projectId,
            note: "",
            billable: true,
        },
    });

    const onSubmit = async (data: TimeLogFormData) => {
        try {
            await logTime({ ...data, taskId: selectedTaskId || undefined });
            toast.success(t("projects.timesheets.toast.logged"));
            setDialogOpen(false);
            form.reset({ projectId, note: "", billable: true });
            setSelectedTaskId("");
        } catch (error) {
            console.error(error);
            toast.error(t("projects.timesheets.toast.logFailed"));
        }
    };

    const handleStartTimer = async () => {
        try {
            await startTimer(selectedTaskId || undefined, t("projects.timesheets.workInProgress"));
            toast.success(t("projects.timesheets.toast.timerStarted"));
        } catch {
            toast.error(t("projects.timesheets.toast.timerStartFailed"));
        }
    };

    const handleStopTimer = async (id: string) => {
        try {
            await stopTimer(id);
            toast.success(t("projects.timesheets.toast.timerStopped"));
        } catch {
            toast.error(t("projects.timesheets.toast.timerStopFailed"));
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{t("projects.timesheets.title")}</h2>
                    <p className="text-muted-foreground text-sm">{t("projects.timesheets.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    {/* Task Selector for Timer */}
                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t("projects.timesheets.selectTask")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">{t("projects.timesheets.noSpecificTask")}</SelectItem>
                            {tasks.map(task => (
                                <SelectItem key={task.id} value={task.id}>
                                    {task.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {activeTimer ? (
                        <Button variant="destructive" onClick={() => handleStopTimer(activeTimer.id)}>
                            <StopCircle className="mr-2 h-4 w-4 animate-pulse" /> {t("projects.timesheets.stopTimer")}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleStartTimer}>
                            <PlayCircle className="mr-2 h-4 w-4" /> {t("projects.timesheets.startTimer")}
                        </Button>
                    )}

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> {t("projects.timesheets.logManualTime")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("projects.timesheets.logTimeTitle")}</DialogTitle>
                                <DialogDescription>{t("projects.timesheets.logTimeDescription")}</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    {/* Task Selector */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t("projects.timesheets.taskOptional")}</label>
                                        <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("projects.timesheets.selectATask")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">{t("projects.timesheets.noSpecificTask")}</SelectItem>
                                                {tasks.map(task => (
                                                    <SelectItem key={task.id} value={task.id}>
                                                        {task.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="note"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("common.description")}</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder={t("projects.timesheets.workPlaceholder")} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Simplified Date Inputs for Prototype */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="startTime"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("projects.timesheets.startTime")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="datetime-local"
                                                            onChange={e => field.onChange(new Date(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="endTime"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("projects.timesheets.endTime")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="datetime-local"
                                                            onChange={e => field.onChange(new Date(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="billable"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>{t("projects.timesheets.billable")}</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                            {t("common.cancel")}
                                        </Button>
                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t("projects.timesheets.saveLog")}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            {t("projects.timesheets.totalTracked")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
                        <p className="text-xs text-muted-foreground">{t("projects.timesheets.timeEntries", { count: logs.length })}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            {t("projects.timesheets.billableTime")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatDuration(billableTime)}</div>
                        <p className="text-xs text-muted-foreground">
                            {t("projects.timesheets.percentOfTotal", { percent: Math.round((billableTime / (totalDuration || 1)) * 100) })}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-orange-600" />
                            {t("projects.timesheets.teamMembers")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(logs.map(l => l.userId)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">{t("projects.timesheets.contributors")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Time Logs Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("projects.timesheets.table.user")}</TableHead>
                            <TableHead>{t("projects.timesheets.table.task")}</TableHead>
                            <TableHead>{t("common.description")}</TableHead>
                            <TableHead>{t("projects.timesheets.startTime")}</TableHead>
                            <TableHead>{t("projects.timesheets.endTime")}</TableHead>
                            <TableHead>{t("projects.timesheets.table.duration")}</TableHead>
                            <TableHead>{t("projects.timesheets.billable")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    {t("projects.timesheets.noLogs")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7">
                                                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                                    {getUserName(log.userId).charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{getUserName(log.userId)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {log.taskId ? (
                                            <Badge variant="outline" className="text-xs">
                                                {getTaskName(log.taskId)}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">{log.note || "-"}</TableCell>
                                    <TableCell>{format(log.startTime.toDate(), "MMM d, HH:mm")}</TableCell>
                                    <TableCell>
                                        {log.endTime ? (
                                            format(log.endTime.toDate(), "MMM d, HH:mm")
                                        ) : (
                                            <span className="text-green-600 animate-pulse font-medium flex items-center gap-1">
                                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                {t("projects.timesheets.active")}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {log.endTime ? formatDuration(log.duration) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {log.billable ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">{t("common.yes")}</Badge>
                                        ) : (
                                            <Badge variant="secondary">{t("common.no")}</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
