"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { CreateMilestoneDialog } from "@/components/dashboard/projects/create-milestone-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, MoreHorizontal, Pencil, Trash, CheckCircle2, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function MilestonesPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { milestones, loading, deleteMilestone, updateMilestone } = useMilestones(projectId);

    // Optional: Sort by due date
    const sortedMilestones = [...milestones].sort((a, b) => {
        return a.dueDate.seconds - b.dueDate.seconds;
    });

    const isOverdue = (date: any) => {
        return new Date() > date.toDate() && date;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Milestones</h2>
                <CreateMilestoneDialog projectId={projectId} />
            </div>

            {milestones.length === 0 ? (
                <div className="text-center py-20 border rounded-lg bg-gray-50/50 border-dashed">
                    <h3 className="text-lg font-medium text-gray-900">No milestones yet</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-4">Create a milestone to track major project events.</p>
                    <CreateMilestoneDialog projectId={projectId} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedMilestones.map((milestone) => {
                        const isCompleted = milestone.status === "complete";
                        const overdue = !isCompleted && isOverdue(milestone.dueDate);

                        return (
                            <Card key={milestone.id} className={cn("transition-all hover:shadow-md", isCompleted ? "bg-gray-50 border-gray-200" : "bg-white")}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-semibold truncate pr-4">
                                        {milestone.name}
                                    </CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => updateMilestone(milestone.id, { status: isCompleted ? "incomplete" : "complete" })}>
                                                {isCompleted ? "Mark Incomplete" : "Mark Complete"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600" onClick={() => confirm("Delete milestone?") && deleteMilestone(milestone.id)}>
                                                <Trash className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span className={cn(overdue ? "text-red-600 font-medium" : "")}>
                                                    {format(milestone.dueDate.toDate(), "MMM d, yyyy")}
                                                </span>
                                            </div>
                                            <Badge variant={isCompleted ? "default" : overdue ? "destructive" : "secondary"} className={isCompleted ? "bg-green-500 hover:bg-green-600" : ""}>
                                                {isCompleted ? "Completed" : overdue ? "Overdue" : "In Progress"}
                                            </Badge>
                                        </div>

                                        <div
                                            className="h-2 w-full rounded-full bg-secondary overflow-hidden"
                                            style={{ backgroundColor: isCompleted ? "#dcfce7" : "#f3f4f6" }}
                                        >
                                            <div
                                                className="h-full transition-all duration-300"
                                                style={{
                                                    width: isCompleted ? "100%" : "0%", // TODO: Link to tasks completion %
                                                    backgroundColor: milestone.color || "#3b82f6"
                                                }}
                                            />
                                        </div>

                                        <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                                            {milestone.description || "No description provided."}
                                        </p>

                                        <Button
                                            variant={isCompleted ? "outline" : "default"}
                                            size="sm"
                                            className="w-full"
                                            onClick={() => updateMilestone(milestone.id, { status: isCompleted ? "incomplete" : "complete" })}
                                        >
                                            {isCompleted ? <Circle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                            {isCompleted ? "Reopen" : "Complete Milestone"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
