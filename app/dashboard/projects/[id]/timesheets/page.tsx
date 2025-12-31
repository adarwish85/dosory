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

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

export default function TimesheetsPage() {
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
        return "Unknown User";
    };

    // Get task name
    const getTaskName = (taskId?: string) => {
        if (!taskId) return null;
        return taskMap.get(taskId) || "Unknown Task";
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
            toast.success("Time logged successfully");
            setDialogOpen(false);
            form.reset({ projectId, note: "", billable: true });
            setSelectedTaskId("");
        } catch (error) {
            console.error(error);
            toast.error("Failed to log time");
        }
    };

    const handleStartTimer = async () => {
        try {
            await startTimer(selectedTaskId || undefined, "Work in progress");
            toast.success("Timer started");
        } catch {
            toast.error("Failed to start timer");
        }
    };

    const handleStopTimer = async (id: string) => {
        try {
            await stopTimer(id);
            toast.success("Timer stopped");
        } catch {
            toast.error("Failed to stop timer");
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Timesheets</h2>
                    <p className="text-muted-foreground text-sm">Track time spent on this project.</p>
                </div>
                <div className="flex gap-2">
                    {/* Task Selector for Timer */}
                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select task..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">No specific task</SelectItem>
                            {tasks.map(task => (
                                <SelectItem key={task.id} value={task.id}>
                                    {task.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {activeTimer ? (
                        <Button variant="destructive" onClick={() => handleStopTimer(activeTimer.id)}>
                            <StopCircle className="mr-2 h-4 w-4 animate-pulse" /> Stop Timer
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleStartTimer}>
                            <PlayCircle className="mr-2 h-4 w-4" /> Start Timer
                        </Button>
                    )}

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Log Manual Time
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Log Time</DialogTitle>
                                <DialogDescription>Manually enter time duration.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    {/* Task Selector */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Task (Optional)</label>
                                        <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a task..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">No specific task</SelectItem>
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
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="What did you work on?" {...field} />
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
                                                    <FormLabel>Start Time</FormLabel>
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
                                                    <FormLabel>End Time</FormLabel>
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
                                                    <FormLabel>Billable</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Log
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
                            Total Tracked
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
                        <p className="text-xs text-muted-foreground">{logs.length} time entries</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Billable Time
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatDuration(billableTime)}</div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round((billableTime / (totalDuration || 1)) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-orange-600" />
                            Team Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(logs.map(l => l.userId)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">Contributors</p>
                    </CardContent>
                </Card>
            </div>

            {/* Time Logs Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Task</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Billable</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    No time logs found. Start tracking time!
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
                                                Active
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {log.endTime ? formatDuration(log.duration) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {log.billable ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Yes</Badge>
                                        ) : (
                                            <Badge variant="secondary">No</Badge>
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
