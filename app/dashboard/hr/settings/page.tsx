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
import { useTranslation } from "@/lib/i18n";

export default function HRSettingsPage() {
    const { t } = useTranslation();
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
            toast.error(t("hr.settings.deptNameRequired"));
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateDepartment(editingId, deptForm);
                toast.success(t("hr.settings.deptUpdated"));
            } else {
                await createDepartment(deptForm);
                toast.success(t("hr.settings.deptCreated"));
            }
            setShowDeptDialog(false);
            setDeptForm({ name: "", description: "" });
            setEditingId(null);
        } catch (error) {
            toast.error(t("hr.settings.deptSaveFailed"));
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
        if (!confirm(t("hr.settings.confirmDeleteDept"))) return;
        try {
            await deleteDepartment(id);
            toast.success(t("hr.settings.deptDeleted"));
        } catch (error) {
            toast.error(t("hr.settings.deptDeleteFailed"));
        }
    };

    // Job Title handlers
    const handleSaveTitle = async () => {
        if (!titleForm.name) {
            toast.error(t("hr.settings.titleNameRequired"));
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateJobTitle(editingId, titleForm);
                toast.success(t("hr.settings.titleUpdated"));
            } else {
                await createJobTitle(titleForm);
                toast.success(t("hr.settings.titleCreated"));
            }
            setShowTitleDialog(false);
            setTitleForm({ name: "", description: "", departmentId: "" });
            setEditingId(null);
        } catch (error) {
            toast.error(t("hr.settings.titleSaveFailed"));
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
        if (!confirm(t("hr.settings.confirmDeleteTitle"))) return;
        try {
            await deleteJobTitle(id);
            toast.success(t("hr.settings.titleDeleted"));
        } catch (error) {
            toast.error(t("hr.settings.titleDeleteFailed"));
        }
    };

    // Leave Type handlers
    const handleSaveLeave = async () => {
        if (!leaveForm.name || !leaveForm.code) {
            toast.error(t("hr.settings.leaveNameCodeRequired"));
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateLeaveType(editingId, leaveForm);
                toast.success(t("hr.settings.leaveUpdated"));
            } else {
                await createLeaveType(leaveForm);
                toast.success(t("hr.settings.leaveCreated"));
            }
            setShowLeaveDialog(false);
            resetLeaveForm();
            setEditingId(null);
        } catch (error) {
            toast.error(t("hr.settings.leaveSaveFailed"));
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
        if (!confirm(t("hr.settings.confirmDeleteLeave"))) return;
        try {
            await deleteLeaveType(id);
            toast.success(t("hr.settings.leaveDeleted"));
        } catch (error) {
            toast.error(t("hr.settings.leaveDeleteFailed"));
        }
    };

    const handleSeedDefaults = async () => {
        const defaults = getDefaultLeaveTypes();
        for (const type of defaults) {
            await createLeaveType(type);
        }
        toast.success(t("hr.settings.defaultsCreated"));
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
                <h2 className="text-xl font-semibold">{t("hr.settings.title")}</h2>
                <p className="text-gray-500">{t("hr.settings.subtitle")}</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="departments">
                <TabsList>
                    <TabsTrigger value="departments" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {t("hr.settings.departments")}
                    </TabsTrigger>
                    <TabsTrigger value="job-titles" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {t("hr.settings.jobTitles")}
                    </TabsTrigger>
                    <TabsTrigger value="leave-types" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {t("hr.settings.leaveTypes")}
                    </TabsTrigger>
                </TabsList>

                {/* Departments Tab */}
                <TabsContent value="departments" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("hr.settings.departments")}</CardTitle>
                                <CardDescription>{t("hr.settings.departmentsDesc")}</CardDescription>
                            </div>
                            <Button onClick={() => { setDeptForm({ name: "", description: "" }); setEditingId(null); setShowDeptDialog(true); }}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("hr.settings.addDepartment")}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("common.name")}</TableHead>
                                        <TableHead>{t("common.description")}</TableHead>
                                        <TableHead>{t("hr.settings.employees")}</TableHead>
                                        <TableHead className="text-right">{t("common.actions")}</TableHead>
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
                                                {t("hr.settings.noDepartments")}
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
                                <CardTitle>{t("hr.settings.jobTitles")}</CardTitle>
                                <CardDescription>{t("hr.settings.jobTitlesDesc")}</CardDescription>
                            </div>
                            <Button onClick={() => { setTitleForm({ name: "", description: "", departmentId: "" }); setEditingId(null); setShowTitleDialog(true); }}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("hr.settings.addJobTitle")}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("common.name")}</TableHead>
                                        <TableHead>{t("common.description")}</TableHead>
                                        <TableHead className="text-right">{t("common.actions")}</TableHead>
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
                                                {t("hr.settings.noJobTitles")}
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
                                <CardTitle>{t("hr.settings.leaveTypes")}</CardTitle>
                                <CardDescription>{t("hr.settings.leaveTypesDesc")}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {leaveTypes.length === 0 && (
                                    <Button variant="outline" onClick={handleSeedDefaults}>
                                        {t("hr.settings.seedDefaults")}
                                    </Button>
                                )}
                                <Button onClick={() => { resetLeaveForm(); setEditingId(null); setShowLeaveDialog(true); }}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("hr.settings.addLeaveType")}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("common.name")}</TableHead>
                                        <TableHead>{t("hr.settings.daysPerYear")}</TableHead>
                                        <TableHead>{t("hr.settings.paid")}</TableHead>
                                        <TableHead>{t("hr.settings.approval")}</TableHead>
                                        <TableHead>{t("hr.settings.carryOver")}</TableHead>
                                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaveTypes.map((type) => (
                                        <TableRow key={type.id}>
                                            <TableCell className="font-medium">{type.name}</TableCell>
                                            <TableCell>{type.defaultDaysPerYear}</TableCell>
                                            <TableCell>{type.isPaid ? t("common.yes") : t("common.no")}</TableCell>
                                            <TableCell>{type.requiresApproval ? t("hr.settings.required") : t("hr.settings.auto")}</TableCell>
                                            <TableCell>{type.allowsCarryOver ? t("hr.settings.maxDays", { days: type.maxCarryOverDays || 0 }) : t("common.no")}</TableCell>
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
                                                {t("hr.settings.noLeaveTypes")}
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
                        <DialogTitle>{editingId ? t("hr.settings.editDepartment") : t("hr.settings.addDepartment")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("hr.settings.nameRequired")}</Label>
                            <Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("common.description")}</Label>
                            <Textarea value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeptDialog(false)}>{t("common.cancel")}</Button>
                        <Button onClick={handleSaveDept} disabled={isSubmitting}>{isSubmitting ? t("common.saving") : t("common.save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Job Title Dialog */}
            <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? t("hr.settings.editJobTitle") : t("hr.settings.addJobTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("hr.settings.nameRequired")}</Label>
                            <Input value={titleForm.name} onChange={(e) => setTitleForm({ ...titleForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("common.description")}</Label>
                            <Textarea value={titleForm.description} onChange={(e) => setTitleForm({ ...titleForm, description: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTitleDialog(false)}>{t("common.cancel")}</Button>
                        <Button onClick={handleSaveTitle} disabled={isSubmitting}>{isSubmitting ? t("common.saving") : t("common.save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leave Type Dialog */}
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? t("hr.settings.editLeaveType") : t("hr.settings.addLeaveType")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("hr.settings.nameRequired")}</Label>
                            <Input value={leaveForm.name} onChange={(e) => setLeaveForm({ ...leaveForm, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("hr.settings.codeRequired")}</Label>
                                <Input value={leaveForm.code} onChange={(e) => setLeaveForm({ ...leaveForm, code: e.target.value.toLowerCase().replace(/\s/g, "_") })} placeholder={t("hr.settings.codePlaceholder")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("hr.settings.color")}</Label>
                                <Input type="color" value={leaveForm.color} onChange={(e) => setLeaveForm({ ...leaveForm, color: e.target.value })} className="h-10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("hr.settings.defaultDaysPerYear")}</Label>
                            <Input type="number" value={leaveForm.defaultDaysPerYear} onChange={(e) => setLeaveForm({ ...leaveForm, defaultDaysPerYear: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t("hr.settings.paidLeave")}</Label>
                            <Switch checked={leaveForm.isPaid} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, isPaid: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t("hr.settings.requiresApproval")}</Label>
                            <Switch checked={leaveForm.requiresApproval} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, requiresApproval: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t("hr.settings.allowHalfDay")}</Label>
                            <Switch checked={leaveForm.allowsHalfDay} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, allowsHalfDay: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t("hr.settings.allowCarryOver")}</Label>
                            <Switch checked={leaveForm.allowsCarryOver} onCheckedChange={(v) => setLeaveForm({ ...leaveForm, allowsCarryOver: v })} />
                        </div>
                        {leaveForm.allowsCarryOver && (
                            <div className="space-y-2">
                                <Label>{t("hr.settings.maxCarryOverDays")}</Label>
                                <Input type="number" value={leaveForm.maxCarryOverDays} onChange={(e) => setLeaveForm({ ...leaveForm, maxCarryOverDays: parseInt(e.target.value) || 0 })} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>{t("common.cancel")}</Button>
                        <Button onClick={handleSaveLeave} disabled={isSubmitting}>{isSubmitting ? t("common.saving") : t("common.save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
