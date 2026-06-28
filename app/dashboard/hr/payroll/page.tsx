"use client";

import { useState } from "react";
import { usePayrollInputs, usePayrollSummary } from "@/lib/hooks/use-payroll";
import { useEmployees } from "@/lib/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DollarSign, Plus, FileDown, Calculator, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { useTranslation } from "@/lib/i18n";
import type { PayrollAllowance, PayrollDeduction } from "@/lib/types/hr-types";

export default function PayrollPage() {
    const { t } = useTranslation();
    const { payrollInputs, loading, totalPayrollCost, createPayrollInput } = usePayrollInputs();
    const { summaries, generateSummary, exportToAccounting } = usePayrollSummary();
    const { employees } = useEmployees({ status: "active" });

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showSummaryDialog, setShowSummaryDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        employeeId: "",
        baseSalary: 0,
        currency: "USD",
        payFrequency: "monthly" as const,
        effectiveFrom: new Date().toISOString().split("T")[0],
        overtimeRate: 1.5,
        allowances: [] as PayrollAllowance[],
        deductions: [] as PayrollDeduction[],
    });

    const handleAddPayroll = async () => {
        if (!formData.employeeId || formData.baseSalary <= 0) {
            toast.error(t("hr.payroll.fillRequired"));
            return;
        }

        const employee = employees.find((e) => e.id === formData.employeeId);
        if (!employee) return;

        setIsSubmitting(true);
        try {
            await createPayrollInput(
                {
                    ...formData,
                    effectiveFrom: new Date(formData.effectiveFrom),
                },
                `${employee.firstName} ${employee.lastName}`
            );
            toast.success(t("hr.payroll.inputCreated"));
            setShowAddDialog(false);
            resetForm();
        } catch (error) {
            toast.error(t("hr.payroll.createFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!selectedPeriod) {
            toast.error(t("hr.payroll.selectPeriod"));
            return;
        }
        setIsSubmitting(true);
        try {
            await generateSummary(selectedPeriod);
            toast.success(t("hr.payroll.summaryGenerated"));
            setShowSummaryDialog(false);
        } catch (error) {
            toast.error(t("hr.payroll.generateFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExport = async (summaryId: string) => {
        try {
            await exportToAccounting(summaryId);
            toast.success(t("hr.payroll.exported"));
        } catch (error) {
            toast.error(t("hr.payroll.exportFailed"));
        }
    };

    const resetForm = () => {
        setFormData({
            employeeId: "",
            baseSalary: 0,
            currency: "USD",
            payFrequency: "monthly",
            effectiveFrom: new Date().toISOString().split("T")[0],
            overtimeRate: 1.5,
            allowances: [],
            deductions: [],
        });
    };

    const addAllowance = () => {
        setFormData({
            ...formData,
            allowances: [
                ...formData.allowances,
                { id: nanoid(), type: "other", name: "", amount: 0, isRecurring: true },
            ],
        });
    };

    const addDeduction = () => {
        setFormData({
            ...formData,
            deductions: [
                ...formData.deductions,
                { id: nanoid(), type: "other", name: "", amount: 0, isRecurring: true },
            ],
        });
    };

    const formatCurrency = (amount: number, currency: string = "USD") => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
    };

    // Generate period options (last 12 months)
    const periodOptions = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return format(date, "yyyy-MM");
    });

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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">{t("hr.payroll.title")}</h2>
                    <p className="text-gray-500">{t("hr.payroll.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowSummaryDialog(true)}>
                        <Calculator className="h-4 w-4 mr-2" />
                        {t("hr.payroll.generateSummary")}
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("hr.payroll.addPayroll")}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t("hr.payroll.totalMonthlyCost")}</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalPayrollCost)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t("hr.payroll.activePayrolls")}</p>
                                <p className="text-2xl font-bold">{payrollInputs.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Calculator className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{t("hr.payroll.generatedSummaries")}</p>
                                <p className="text-2xl font-bold">{summaries.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="inputs">
                <TabsList>
                    <TabsTrigger value="inputs">{t("hr.payroll.title")}</TabsTrigger>
                    <TabsTrigger value="summaries">{t("hr.payroll.summariesTab")}</TabsTrigger>
                </TabsList>

                <TabsContent value="inputs" className="mt-4">
                    {payrollInputs.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">{t("hr.payroll.noRecords")}</p>
                                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                                    {t("hr.payroll.addFirst")}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("hr.payroll.employee")}</TableHead>
                                        <TableHead>{t("hr.payroll.baseSalary")}</TableHead>
                                        <TableHead>{t("hr.payroll.allowances")}</TableHead>
                                        <TableHead>{t("hr.payroll.deductions")}</TableHead>
                                        <TableHead>{t("hr.payroll.gross")}</TableHead>
                                        <TableHead>{t("hr.payroll.net")}</TableHead>
                                        <TableHead>{t("common.status")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollInputs.map((payroll) => (
                                        <TableRow key={payroll.id}>
                                            <TableCell className="font-medium">{payroll.employeeName}</TableCell>
                                            <TableCell>{formatCurrency(payroll.baseSalary, payroll.currency)}</TableCell>
                                            <TableCell className="text-green-600">
                                                +{formatCurrency(payroll.totalAllowances, payroll.currency)}
                                            </TableCell>
                                            <TableCell className="text-red-600">
                                                -{formatCurrency(payroll.totalDeductions, payroll.currency)}
                                            </TableCell>
                                            <TableCell>{formatCurrency(payroll.grossSalary, payroll.currency)}</TableCell>
                                            <TableCell className="font-semibold">
                                                {formatCurrency(payroll.netSalary, payroll.currency)}
                                            </TableCell>
                                            <TableCell>
                                                {payroll.isActive ? (
                                                    <Badge className="bg-green-100 text-green-800">{t("hr.payroll.active")}</Badge>
                                                ) : (
                                                    <Badge className="bg-gray-100 text-gray-800">{t("hr.payroll.inactive")}</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="summaries" className="mt-4">
                    {summaries.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">{t("hr.payroll.noSummaries")}</p>
                                <Button className="mt-4" onClick={() => setShowSummaryDialog(true)}>
                                    {t("hr.payroll.generateSummary")}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {summaries.map((summary) => (
                                <Card key={summary.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold">{t("hr.payroll.summaryFor", { period: summary.period })}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {t("hr.payroll.employeesGenerated", {
                                                        count: summary.totalEmployees,
                                                        date: format(summary.generatedAt.toDate(), "MMM d, yyyy"),
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">{t("hr.payroll.totalNet")}</p>
                                                    <p className="text-xl font-bold">{formatCurrency(summary.totalNet)}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!summary.exportedToAccounting && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleExport(summary.id)}
                                                        >
                                                            <FileDown className="h-4 w-4 mr-1" />
                                                            {t("hr.payroll.exportToAccounting")}
                                                        </Button>
                                                    )}
                                                    {summary.exportedToAccounting && (
                                                        <Badge className="bg-green-100 text-green-800">{t("hr.payroll.exportedBadge")}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Add Payroll Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t("hr.payroll.addInputTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("hr.payroll.employeeRequired")}</Label>
                            <Select
                                value={formData.employeeId}
                                onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("hr.payroll.selectEmployee")} />
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
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>{t("hr.payroll.baseSalaryRequired")}</Label>
                                <Input
                                    type="number"
                                    value={formData.baseSalary}
                                    onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("hr.payroll.currency")}</Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                        <SelectItem value="AED">AED</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("hr.payroll.effectiveFrom")}</Label>
                                <Input
                                    type="date"
                                    value={formData.effectiveFrom}
                                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Allowances */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t("hr.payroll.allowances")}</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addAllowance}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    {t("common.add")}
                                </Button>
                            </div>
                            {formData.allowances.map((allowance, index) => (
                                <div key={allowance.id} className="flex gap-2">
                                    <Input
                                        placeholder={t("common.name")}
                                        value={allowance.name}
                                        onChange={(e) => {
                                            const updated = [...formData.allowances];
                                            updated[index].name = e.target.value;
                                            setFormData({ ...formData, allowances: updated });
                                        }}
                                    />
                                    <Input
                                        type="number"
                                        placeholder={t("hr.payroll.amount")}
                                        value={allowance.amount}
                                        onChange={(e) => {
                                            const updated = [...formData.allowances];
                                            updated[index].amount = parseFloat(e.target.value) || 0;
                                            setFormData({ ...formData, allowances: updated });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Deductions */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t("hr.payroll.deductions")}</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    {t("common.add")}
                                </Button>
                            </div>
                            {formData.deductions.map((deduction, index) => (
                                <div key={deduction.id} className="flex gap-2">
                                    <Input
                                        placeholder={t("common.name")}
                                        value={deduction.name}
                                        onChange={(e) => {
                                            const updated = [...formData.deductions];
                                            updated[index].name = e.target.value;
                                            setFormData({ ...formData, deductions: updated });
                                        }}
                                    />
                                    <Input
                                        type="number"
                                        placeholder={t("hr.payroll.amount")}
                                        value={deduction.amount}
                                        onChange={(e) => {
                                            const updated = [...formData.deductions];
                                            updated[index].amount = parseFloat(e.target.value) || 0;
                                            setFormData({ ...formData, deductions: updated });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleAddPayroll} disabled={isSubmitting}>
                            {isSubmitting ? t("hr.payroll.creating") : t("hr.payroll.createPayroll")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate Summary Dialog */}
            <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("hr.payroll.generateSummaryTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>{t("hr.payroll.selectPeriodLabel")}</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder={t("hr.payroll.selectPeriodPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {periodOptions.map((period) => (
                                    <SelectItem key={period} value={period}>
                                        {format(new Date(period + "-01"), "MMMM yyyy")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleGenerateSummary} disabled={isSubmitting}>
                            {isSubmitting ? t("hr.payroll.generating") : t("hr.payroll.generate")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
