"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useMilestones, useTaskLists } from "@/lib/hooks";
import { Loader2 } from "lucide-react";

interface BulkAssignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onAssign: (projectId: string, milestoneId: string, taskListId: string) => Promise<void>;
}

export function BulkAssignDialog({ open, onOpenChange, selectedCount, onAssign }: BulkAssignDialogProps) {
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("");
    const [selectedTaskListId, setSelectedTaskListId] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch projects
    const { projects, loading: projectsLoading } = useProjects({});

    // Fetch milestones when project is selected
    const { milestones, loading: milestonesLoading } = useMilestones(selectedProjectId);

    // Fetch task lists when milestone is selected
    // passing milestoneId ensures we get lists for this milestone
    const { taskLists, loading: taskListsLoading } = useTaskLists({
        milestoneId: selectedMilestoneId,
        projectId: selectedProjectId, // fall back or context
    });

    // Reset downstream selections when upstream changes
    useEffect(() => {
        setSelectedMilestoneId("");
        setSelectedTaskListId("");
    }, [selectedProjectId]);

    useEffect(() => {
        setSelectedTaskListId("");
    }, [selectedMilestoneId]);

    const handleAssign = async () => {
        if (!selectedProjectId || !selectedMilestoneId || !selectedTaskListId) return;

        setIsSubmitting(true);
        try {
            await onAssign(selectedProjectId, selectedMilestoneId, selectedTaskListId);
            onOpenChange(false);
            // Reset state
            setSelectedProjectId("");
        } catch (error) {
            console.error("Failed to bulk assign:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Tasks</DialogTitle>
                    <DialogDescription>
                        Assign {selectedCount} selected task{selectedCount !== 1 ? "s" : ""} to a project hierarchy.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Project</Label>
                        <Select
                            value={selectedProjectId}
                            onValueChange={setSelectedProjectId}
                            disabled={projectsLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Milestone</Label>
                        <Select
                            value={selectedMilestoneId}
                            onValueChange={setSelectedMilestoneId}
                            disabled={!selectedProjectId || milestonesLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select milestone" />
                            </SelectTrigger>
                            <SelectContent>
                                {milestones.map((milestone) => (
                                    <SelectItem key={milestone.id} value={milestone.id}>
                                        {milestone.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Task List</Label>
                        <Select
                            value={selectedTaskListId}
                            onValueChange={setSelectedTaskListId}
                            disabled={!selectedMilestoneId || taskListsLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select task list" />
                            </SelectTrigger>
                            <SelectContent>
                                {taskLists.map((list) => (
                                    <SelectItem key={list.id} value={list.id}>
                                        {list.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={!selectedProjectId || !selectedMilestoneId || !selectedTaskListId || isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign Tasks
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
