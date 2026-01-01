"use client";

import { useState } from "react";
import { usePerformanceNotes, ratingLabels, ratingColors, flagLabels, flagColors } from "@/lib/hooks/use-performance";
import { useEmployees, useCurrentEmployee } from "@/lib/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Plus, TrendingUp, AlertTriangle, MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { PerformanceRating, PerformanceFlag } from "@/lib/types/hr-types";

export default function PerformancePage() {
    const { employee: currentEmployee, loading: employeeLoading } = useCurrentEmployee();
    const { employees } = useEmployees({ status: "active" });
    const { notes, loading, performanceStats, createNote } = usePerformanceNotes();

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        employeeId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        rating: undefined as PerformanceRating | undefined,
        flag: "none" as PerformanceFlag,
        notes: "",
        isConfidential: false,
    });

    const isManager = currentEmployee?.hrRole === "manager" || currentEmployee?.hrRole === "hr_admin";

    const handleAddNote = async () => {
        if (!formData.employeeId || !formData.notes) {
            toast.error("Please fill in all required fields");
            return;
        }

        const employee = employees.find((e) => e.id === formData.employeeId);
        if (!employee) return;

        setIsSubmitting(true);
        try {
            await createNote(
                {
                    employeeId: formData.employeeId,
                    month: formData.month,
                    year: formData.year,
                    rating: formData.rating,
                    flag: formData.flag,
                    notes: formData.notes,
                    isConfidential: formData.isConfidential,
                },
                `${employee.firstName} ${employee.lastName}`
            );
            toast.success("Performance note added");
            setShowAddDialog(false);
            setFormData({
                employeeId: "",
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                rating: undefined,
                flag: "none",
                notes: "",
                isConfidential: false,
            });
        } catch (error) {
            toast.error("Failed to add note");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderRating = (rating: PerformanceRating | undefined) => {
        if (!rating) return null;
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                    />
                ))}
                <span className="text-sm text-gray-500 ml-2">{ratingLabels[rating]}</span>
            </div>
        );
    };

    const getMonthName = (month: number) => {
        return format(new Date(2024, month - 1), "MMMM");
    };

    if (loading || employeeLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Performance Notes</h2>
                    <p className="text-gray-500">Track employee performance and feedback</p>
                </div>
                {isManager && (
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <MessageSquare className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{performanceStats.totalNotes}</p>
                        <p className="text-sm text-gray-500">Total Notes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <p className="text-2xl font-bold">
                            {performanceStats.averageRating?.toFixed(1) || "-"}
                        </p>
                        <p className="text-sm text-gray-500">Avg Rating</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold">{performanceStats.promotionCandidates}</p>
                        <p className="text-sm text-gray-500">Promotion Candidates</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                        <p className="text-2xl font-bold">{performanceStats.performanceConcerns}</p>
                        <p className="text-sm text-gray-500">Performance Concerns</p>
                    </CardContent>
                </Card>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No performance notes yet</p>
                        {isManager && (
                            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                                Add First Note
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {notes.map((note) => (
                        <Card key={note.id}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                            {note.employeeName
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{note.employeeName}</p>
                                                {note.flag && note.flag !== "none" && (
                                                    <Badge className={flagColors[note.flag]}>
                                                        {note.flag === "promotion_candidate" && (
                                                            <TrendingUp className="h-3 w-3 mr-1" />
                                                        )}
                                                        {note.flag === "performance_concern" && (
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                        )}
                                                        {flagLabels[note.flag]}
                                                    </Badge>
                                                )}
                                                {note.isConfidential && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Confidential
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="h-4 w-4" />
                                                {getMonthName(note.month)} {note.year}
                                            </div>
                                        </div>
                                        {note.rating && <div className="mt-2">{renderRating(note.rating)}</div>}
                                        <p className="text-gray-700 mt-3">{note.notes}</p>
                                        <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                                            By {note.authorName} •{" "}
                                            {format(note.createdAt.toDate(), "MMM d, yyyy")}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Note Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Performance Note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Employee *</Label>
                            <Select
                                value={formData.employeeId}
                                onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select
                                    value={formData.month.toString()}
                                    onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                                                {getMonthName(i + 1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Rating (Optional)</Label>
                            <Select
                                value={formData.rating?.toString() || ""}
                                onValueChange={(v) =>
                                    setFormData({ ...formData, rating: v ? (parseInt(v) as PerformanceRating) : undefined })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <SelectItem key={r} value={r.toString()}>
                                            {r} - {ratingLabels[r as PerformanceRating]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Flag</Label>
                            <Select
                                value={formData.flag}
                                onValueChange={(v) => setFormData({ ...formData, flag: v as PerformanceFlag })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Flag</SelectItem>
                                    <SelectItem value="promotion_candidate">Promotion Candidate</SelectItem>
                                    <SelectItem value="performance_concern">Performance Concern</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes *</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Write your performance notes here..."
                                rows={4}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="confidential"
                                checked={formData.isConfidential}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, isConfidential: checked as boolean })
                                }
                            />
                            <Label htmlFor="confidential" className="text-sm">
                                Mark as confidential (visible only to HR)
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddNote} disabled={isSubmitting}>
                            {isSubmitting ? "Adding..." : "Add Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
