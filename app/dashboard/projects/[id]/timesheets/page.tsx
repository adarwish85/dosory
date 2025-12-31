"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTimesheets } from "@/lib/hooks/use-project-data";
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
import { format } from "date-fns";
import { Plus, Loader2, StopCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

export default function TimesheetsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { logs, totalDuration, loading, logTime, startTimer, stopTimer } = useTimesheets(projectId);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Find active timer if any (where endTime is missing)
    const activeTimer = logs.find(l => !l.endTime && l.startTime);

    const form = useForm<TimeLogFormData>({
        resolver: zodResolver(timeLogSchema),
        defaultValues: {
            projectId,
            note: "",
            billable: true,
            // Dates handling is tricky with Zod date() and HTML input datetime-local
            // We'll manage date inputs manually or use a date picker
        },
    });

    const onSubmit = async (data: TimeLogFormData) => {
        try {
            await logTime(data);
            toast.success("Time logged successfully");
            setDialogOpen(false);
            form.reset({ projectId, note: "", billable: true });
        } catch (error) {
            console.error(error);
            toast.error("Failed to log time");
        }
    };

    const handleStartTimer = async () => {
        try {
            await startTimer(undefined, "Work in progress");
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
                                    <FormField
                                        control={form.control}
                                        name="note" // Using note as description
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
                                                        // value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
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
                                                        // value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
                    </CardContent>
                </Card>
                {/* Additional stats specific to logging can go here */}
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No time logs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">
                                        {/* Ideally fetch user name or just show ID/Me */}
                                        User
                                    </TableCell>
                                    <TableCell>{log.note || "-"}</TableCell>
                                    <TableCell>{format(log.startTime.toDate(), "MMM d, HH:mm")}</TableCell>
                                    <TableCell>
                                        {log.endTime ? format(log.endTime.toDate(), "MMM d, HH:mm") : <span className="text-green-600 animate-pulse font-medium">Active</span>}
                                    </TableCell>
                                    <TableCell>
                                        {log.endTime ? formatDuration(log.duration) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* Actions like Edit/Delete */}
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
