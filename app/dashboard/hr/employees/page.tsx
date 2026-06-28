"use client";

import { useState } from "react";
import { useEmployees, useEmployee } from "@/lib/hooks/use-employees";
import { useDepartments, useJobTitles } from "@/lib/hooks/use-hr-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { format } from "date-fns";
import type { Employee, EmployeeStatus } from "@/lib/types/hr-types";
import type { EmployeeFormData } from "@/lib/schemas";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function EmployeesPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "all">("all");
    const [departmentFilter, setDepartmentFilter] = useState<string>("all");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { employees, loading, createEmployee, employeeStats } = useEmployees({
        status: statusFilter === "all" ? "all" : statusFilter,
        departmentId: departmentFilter === "all" ? undefined : departmentFilter,
    });
    const { departments } = useDepartments();
    const { jobTitles } = useJobTitles();

    // Filter by search
    const filteredEmployees = employees.filter((emp) => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        return fullName.includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());
    });

    // Add employee form state
    const [formData, setFormData] = useState<Partial<EmployeeFormData>>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        employmentType: "full_time",
        departmentId: "",
        jobTitleId: "",
        hireDate: new Date(),
        status: "active",
        workLocation: "office",
        hrRole: "employee",
    });

    const handleAddEmployee = async () => {
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.departmentId || !formData.jobTitleId) {
            toast.error(t("hr.toast.fillRequired"));
            return;
        }

        setIsSubmitting(true);
        try {
            await createEmployee(formData as EmployeeFormData);
            toast.success(t("hr.toast.employeeAdded"));
            setShowAddDialog(false);
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                employmentType: "full_time",
                departmentId: "",
                jobTitleId: "",
                hireDate: new Date(),
                status: "active",
                workLocation: "office",
                hrRole: "employee",
            });
        } catch (error) {
            toast.error(t("hr.toast.employeeAddFailed"));
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status: EmployeeStatus) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800";
            case "on_leave":
                return "bg-amber-100 text-amber-800";
            case "terminated":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder={t("hr.employees.searchPlaceholder")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EmployeeStatus | "all")}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t("common.status")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("hr.employees.allStatus")}</SelectItem>
                            <SelectItem value="active">{t("hr.status.active")}</SelectItem>
                            <SelectItem value="on_leave">{t("hr.status.onLeave")}</SelectItem>
                            <SelectItem value="terminated">{t("hr.status.terminated")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder={t("hr.fields.department")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("hr.employees.allDepartments")}</SelectItem>
                            {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("hr.employees.addEmployee")}
                </Button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{employeeStats.total}</p>
                    <p className="text-xs text-blue-600">{t("hr.stats.total")}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{employeeStats.active}</p>
                    <p className="text-xs text-green-600">{t("hr.status.active")}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{employeeStats.onLeave}</p>
                    <p className="text-xs text-amber-600">{t("hr.status.onLeave")}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{employeeStats.terminated}</p>
                    <p className="text-xs text-red-600">{t("hr.status.terminated")}</p>
                </div>
            </div>

            {/* Employee Grid */}
            {filteredEmployees.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">{t("hr.employees.empty")}</p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                        {t("hr.employees.addFirst")}
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredEmployees.map((employee) => (
                        <Link key={employee.id} href={`/dashboard/hr/employees/${employee.id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={employee.avatar} />
                                            <AvatarFallback className="bg-blue-100 text-blue-600">
                                                {employee.firstName.charAt(0)}
                                                {employee.lastName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold truncate">
                                                    {employee.firstName} {employee.lastName}
                                                </h3>
                                                <Badge className={getStatusColor(employee.status)}>
                                                    {t(`hr.employeeStatus.${employee.status}`)}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">{employee.jobTitleName}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                            <span className="truncate">{employee.departmentName || t("hr.employees.noDepartment")}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span className="truncate">{employee.email}</span>
                                        </div>
                                        {employee.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                                <span>{employee.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                                        {t("hr.employees.hired", { date: format(employee.hireDate.toDate(), "MMM d, yyyy") })}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Add Employee Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("hr.employees.addDialogTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">{t("hr.fields.firstNameRequired")}</Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">{t("hr.fields.lastNameRequired")}</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">{t("hr.fields.emailRequired")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t("common.phone")}</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("hr.fields.departmentRequired")}</Label>
                                <Select
                                    value={formData.departmentId}
                                    onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("hr.fields.selectDepartment")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("hr.fields.jobTitleRequired")}</Label>
                                <Select
                                    value={formData.jobTitleId}
                                    onValueChange={(v) => setFormData({ ...formData, jobTitleId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("hr.fields.selectJobTitle")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jobTitles.map((job) => (
                                            <SelectItem key={job.id} value={job.id}>
                                                {job.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("hr.fields.employmentType")}</Label>
                                <Select
                                    value={formData.employmentType}
                                    onValueChange={(v) => setFormData({ ...formData, employmentType: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full_time">{t("hr.employmentType.fullTime")}</SelectItem>
                                        <SelectItem value="part_time">{t("hr.employmentType.partTime")}</SelectItem>
                                        <SelectItem value="contractor">{t("hr.employmentType.contractor")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("hr.fields.workLocation")}</Label>
                                <Select
                                    value={formData.workLocation}
                                    onValueChange={(v) => setFormData({ ...formData, workLocation: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="office">{t("hr.workLocation.office")}</SelectItem>
                                        <SelectItem value="remote">{t("hr.workLocation.remote")}</SelectItem>
                                        <SelectItem value="hybrid">{t("hr.workLocation.hybrid")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hireDate">{t("hr.fields.hireDate")}</Label>
                                <Input
                                    id="hireDate"
                                    type="date"
                                    value={formData.hireDate ? format(formData.hireDate, "yyyy-MM-dd") : ""}
                                    onChange={(e) => setFormData({ ...formData, hireDate: new Date(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("hr.fields.hrRole")}</Label>
                                <Select
                                    value={formData.hrRole}
                                    onValueChange={(v) => setFormData({ ...formData, hrRole: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">{t("hr.hrRole.employee")}</SelectItem>
                                        <SelectItem value="manager">{t("hr.hrRole.manager")}</SelectItem>
                                        <SelectItem value="hr_admin">{t("hr.hrRole.hrAdmin")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleAddEmployee} disabled={isSubmitting}>
                            {isSubmitting ? t("hr.employees.adding") : t("hr.employees.addEmployee")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
