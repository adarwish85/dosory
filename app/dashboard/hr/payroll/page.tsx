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
import type { PayrollAllowance, PayrollDeduction } from "@/lib/types/hr-types";

export default function PayrollPage() {
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
            toast.error("Please fill in all required fields");
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
            toast.success("Payroll input created");
            setShowAddDialog(false);
            resetForm();
        } catch (error) {
            toast.error("Failed to create payroll input");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!selectedPeriod) {
            toast.error("Please select a period");
            return;
        }
        setIsSubmitting(true);
        try {
            await generateSummary(selectedPeriod);
            toast.success("Payroll summary generated");
            setShowSummaryDialog(false);
        } catch (error) {
            toast.error("Failed to generate summary");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExport = async (summaryId: string) => {
        try {
            await exportToAccounting(summaryId);
            toast.success("Exported to accounting");
        } catch (error) {
            toast.error("Failed to export");
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
                    <h2 className="text-xl font-semibold">Payroll Inputs</h2>
                    <p className="text-gray-500">Manage salary, allowances, and deductions</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowSummaryDialog(true)}>
                        <Calculator className="h-4 w-4 mr-2" />
                        Generate Summary
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payroll
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
                                <p className="text-sm text-gray-500">Total Monthly Cost</p>
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
                                <p className="text-sm text-gray-500">Active Payrolls</p>
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
                                <p className="text-sm text-gray-500">Generated Summaries</p>
                                <p className="text-2xl font-bold">{summaries.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="inputs">
                <TabsList>
                    <TabsTrigger value="inputs">Payroll Inputs</TabsTrigger>
                    <TabsTrigger value="summaries">Summaries</TabsTrigger>
                </TabsList>

                <TabsContent value="inputs" className="mt-4">
                    {payrollInputs.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No payroll records yet</p>
                                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                                    Add First Payroll
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Base Salary</TableHead>
                                        <TableHead>Allowances</TableHead>
                                        <TableHead>Deductions</TableHead>
                                        <TableHead>Gross</TableHead>
                                        <TableHead>Net</TableHead>
                                        <TableHead>Status</TableHead>
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
                                                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                                                ) : (
                                                    <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
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
                                <p className="text-gray-500">No payroll summaries generated yet</p>
                                <Button className="mt-4" onClick={() => setShowSummaryDialog(true)}>
                                    Generate Summary
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
                                                <h3 className="font-semibold">Payroll Summary - {summary.period}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {summary.totalEmployees} employees • Generated{" "}
                                                    {format(summary.generatedAt.toDate(), "MMM d, yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Total Net</p>
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
                                                            Export to Accounting
                                                        </Button>
                                                    )}
                                                    {summary.exportedToAccounting && (
                                                        <Badge className="bg-green-100 text-green-800">Exported</Badge>
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
                        <DialogTitle>Add Payroll Input</DialogTitle>
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
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Base Salary *</Label>
                                <Input
                                    type="number"
                                    value={formData.baseSalary}
                                    onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
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
                                <Label>Effective From</Label>
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
                                <Label>Allowances</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addAllowance}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                </Button>
                            </div>
                            {formData.allowances.map((allowance, index) => (
                                <div key={allowance.id} className="flex gap-2">
                                    <Input
                                        placeholder="Name"
                                        value={allowance.name}
                                        onChange={(e) => {
                                            const updated = [...formData.allowances];
                                            updated[index].name = e.target.value;
                                            setFormData({ ...formData, allowances: updated });
                                        }}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Amount"
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
                                <Label>Deductions</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                </Button>
                            </div>
                            {formData.deductions.map((deduction, index) => (
                                <div key={deduction.id} className="flex gap-2">
                                    <Input
                                        placeholder="Name"
                                        value={deduction.name}
                                        onChange={(e) => {
                                            const updated = [...formData.deductions];
                                            updated[index].name = e.target.value;
                                            setFormData({ ...formData, deductions: updated });
                                        }}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Amount"
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
                            Cancel
                        </Button>
                        <Button onClick={handleAddPayroll} disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Payroll"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generate Summary Dialog */}
            <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Payroll Summary</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Select Period</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select period" />
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
                            Cancel
                        </Button>
                        <Button onClick={handleGenerateSummary} disabled={isSubmitting}>
                            {isSubmitting ? "Generating..." : "Generate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
