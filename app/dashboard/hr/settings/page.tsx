"use client";

import { useState } from "react";
import { useDepartments, useJobTitles, useLeaveTypes, getDefaultLeaveTypes } from "@/lib/hooks/use-hr-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Building2, Briefcase, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function HRSettingsPage() {
    const { departments, loading: deptsLoading, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
    const { jobTitles, loading: titlesLoading, createJobTitle, updateJobTitle, deleteJobTitle } = useJobTitles();
    const { leaveTypes, loading: typesLoading, createLeaveType, updateLeaveType, deleteLeaveType } = useLeaveTypes();

    const [showDeptDialog, setShowDeptDialog] = useState(false);
    const [showTitleDialog, setShowTitleDialog] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [deptForm, setDeptForm] = useState({ name: "", description: "" });
    const [titleForm, setTitleForm] = useState({ name: "", description: "", departmentId: "" });
    const [leaveForm, setLeaveForm] = useState({
        name: "",
        code: "",
        color: "#22c55e",
        description: "",
        defaultDaysPerYear: 0,
        isPaid: true,
        requiresApproval: true,
        allowsHalfDay: false,
        allowsCarryOver: false,
        maxCarryOverDays: 0,
    });

    const loading = deptsLoading || titlesLoading || typesLoading;

    // Department handlers
    const handleSaveDept = async () => {
        if (!deptForm.name) {
            toast.error("Department name is required");
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateDepartment(editingId, deptForm);
                toast.success("Department updated");
            } else {
                await createDepartment(deptForm);
                toast.success("Department created");
            }
            setShowDeptDialog(false);
            setDeptForm({ name: "", description: "" });
            setEditingId(null);
        } catch (error) {
            toast.error("Failed to save department");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditDept = (dept: typeof departments[0]) => {
        setDeptForm({ name: dept.name, description: dept.description || "" });
        setEditingId(dept.id);
        setShowDeptDialog(true);
    };

    const handleDeleteDept = async (id: string) => {
        if (!confirm("Delete this department?")) return;
        try {
            await deleteDepartment(id);
            toast.success("Department deleted");
        } catch (error) {
            toast.error("Failed to delete department");
        }
    };

    // Job Title handlers
    const handleSaveTitle = async () => {
        if (!titleForm.name) {
            toast.error("Job title name is required");
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateJobTitle(editingId, titleForm);
                toast.success("Job title updated");
            } else {
                await createJobTitle(titleForm);
                toast.success("Job title created");
            }
            setShowTitleDialog(false);
            setTitleForm({ name: "", description: "", departmentId: "" });
            setEditingId(null);
        } catch (error) {
            toast.error("Failed to save job title");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditTitle = (title: typeof jobTitles[0]) => {
        setTitleForm({ name: title.name, description: title.description || "", departmentId: title.departmentId || "" });
        setEditingId(title.id);
        setShowTitleDialog(true);
    };

    const handleDeleteTitle = async (id: string) => {
        if (!confirm("Delete this job title?")) return;
        try {
            await deleteJobTitle(id);
            toast.success("Job title deleted");
        } catch (error) {
            toast.error("Failed to delete job title");
        }
    };

    // Leave Type handlers
    const handleSaveLeave = async () => {
        if (!leaveForm.name || !leaveForm.code) {
            toast.error("Leave type name and code are required");
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateLeaveType(editingId, leaveForm);
                toast.success("Leave type updated");
            } else {
                await createLeaveType(leaveForm);
                toast.success("Leave type created");
            }
            setShowLeaveDialog(false);
            resetLeaveForm();
            setEditingId(null);
        } catch (error) {
            toast.error("Failed to save leave type");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditLeave = (leave: typeof leaveTypes[0]) => {
        setLeaveForm({
            name: leave.name,
            code: leave.code,
            color: leave.color,
            description: leave.description || "",
            defaultDaysPerYear: leave.defaultDaysPerYear,
            isPaid: leave.isPaid,
            requiresApproval: leave.requiresApproval,
            allowsHalfDay: leave.allowsHalfDay,
            allowsCarryOver: leave.allowsCarryOver || false,
            maxCarryOverDays: leave.maxCarryOverDays || 0,
        });
        setEditingId(leave.id);
        setShowLeaveDialog(true);
    };

    const handleDeleteLeave = async (id: string) => {
        if (!confirm("Delete this leave type?")) return;
        try {
            await deleteLeaveType(id);
            toast.success("Leave type deleted");
        } catch (error) {
            toast.error("Failed to delete leave type");
        }
    };

    const handleSeedDefaults = async () => {
        const defaults = getDefaultLeaveTypes();
        for (const type of defaults) {
            await createLeaveType(type);
        }
        toast.success("Default leave types created");
    };

    const resetLeaveForm = () => {
        setLeaveForm({
            name: "",
            code: "",
            color: "#22c55e",
            description: "",
            defaultDaysPerYear: 0,
            isPaid: true,
            requiresApproval: true,
            allowsHalfDay: false,
            allowsCarryOver: false,
            maxCarryOverDays: 0,
        });
    };

    if (loading) {
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
            <div>
                <h2 className="text-xl font-semibold">HR Settings</h2>
                <p className="text-gray-500">Configure departments, job titles, and leave policies</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="departments">
                <TabsList>
                    <TabsTrigger value="departments" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Departments
                    </TabsTrigger>
                    <TabsTrigger value="job-titles" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Job Titles
                    </TabsTrigger>
                    <TabsTrigger value="leave-types" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Leave Types
                    </TabsTrigger>
                </TabsList>

                {/* Departments Tab */}
                <TabsContent value="departments" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Departments</CardTitle>
                                <CardDescription>Organization structure and departments</CardDescription>
                            </div>
                            <Button onClick={() => { setDeptForm({ name: "", description: "" }); setEditingId(null); setShowDeptDialog(true); }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Department
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Employees</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {departments.map((dept) => (
                                        <TableRow key={dept.id}>
                                            <TableCell className="font-medium">{dept.name}</TableCell>
                                            <TableCell>{dept.description || "-"}</TableCell>
                                            <TableCell>{dept.employeeCount || 0}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="icon" variant="ghost" onClick={() => handleEditDept(dept)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteDept(dept.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {departments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                No departments yet
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Job Titles Tab */}
                <TabsContent value="job-titles" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Job Titles</CardTitle>
                                <CardDescription>Define roles and positions</CardDescription>
                            </div>
                            <Button onClick={() => { setTitleForm({ name: "", description: "", departmentId: "" }); setEditingId(null); setShowTitleDialog(true); }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Job Title
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jobTitles.map((title) => (
                                        <TableRow key={title.id}>
                                            <TableCell className="font-medium">{title.name}</TableCell>
                                            <TableCell>{title.description || "-"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="icon" variant="ghost" onClick={() => handleEditTitle(title)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteTitle(title.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {jobTitles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                                                No job titles yet
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Leave Types Tab */}
                <TabsContent value="leave-types" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Leave Types</CardTitle>
                                <CardDescription>Define leave policies and entitlements</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {leaveTypes.length === 0 && (
                                    <Button variant="outline" onClick={handleSeedDefaults}>
                                        Seed Defaults
                                    </Button>
                                )}
                                <Button onClick={() => { resetLeaveForm(); setEditingId(null); setShowLeaveDialog(true); }}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Leave Type
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Days/Year</TableHead>
                                        <TableHead>Paid</TableHead>
                                        <TableHead>Approval</TableHead>
                                        <TableHead>Carry Over</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaveTypes.map((type) => (
                                        <TableRow key={type.id}>
                                            <TableCell className="font-medium">{type.name}</TableCell>
                                            <TableCell>{type.defaultDaysPerYear}</TableCell>
                                            <TableCell>{type.isPaid ? "Yes" : "No"}</TableCell>
                                            <TableCell>{type.requiresApproval ? "Required" : "Auto"}</TableCell>
                                            <TableCell>{type.allowsCarryOver ? `Max ${type.maxCarryOverDays}` : "No"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="icon" variant="ghost" onClick={() => handleEditLeave(type)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDeleteLeave(type.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {leaveTypes.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                                No leave types yet. Click &quot;Seed Defaults&quot; to add common leave types.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Department Dialog */}
            <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Department" : "Add Department"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeptDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveDept} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Job Title Dialog */}
            <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Job Title" : "Add Job Title"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={titleForm.name} onChange={(e) => setTitleForm({ ...titleForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={titleForm.description} onChange={(e) => setTitleForm({ ...titleForm, description: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTitleDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveTitle} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leave Type Dialog */}
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={leaveForm.name} onChange={(e) => setLeaveForm({ ...leaveForm, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input value={leaveForm.code} onChange={(e) => setLeaveForm({ ...leaveForm, code: e.target.value.toLowerCase().replace(/\s/g, "_") })} placeholder="e.g., annual" />
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <Input type="color" value={leaveForm.color} onChange={(e) => setLeaveForm({ ...leaveForm, color: e.target.value })} className="h-10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Default Days/Year</Label>
                            <Input type="number" value={leaveForm.defaultDaysPerYear} onChange={(e) => setLeaveForm({ ...leaveForm, defaultDaysPerYear: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Paid Leave</Label>
                            <Switch checked={leaveForm.isPaid} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, isPaid: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Requires Approval</Label>
                            <Switch checked={leaveForm.requiresApproval} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, requiresApproval: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Allow Half Day</Label>
                            <Switch checked={leaveForm.allowsHalfDay} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, allowsHalfDay: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Allow Carry Over</Label>
                            <Switch checked={leaveForm.allowsCarryOver} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, allowsCarryOver: v })} />
                        </div>
                        {leaveForm.allowsCarryOver && (
                            <div className="space-y-2">
                                <Label>Max Carry Over Days</Label>
                                <Input type="number" value={leaveForm.maxCarryOverDays} onChange={(e) => setLeaveForm({ ...leaveForm, maxCarryOverDays: parseInt(e.target.value) || 0 })} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveLeave} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
