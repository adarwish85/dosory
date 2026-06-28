"use client";

import { useState } from "react";
import { useLeaveRequests, useLeaveBalances } from "@/lib/hooks/use-leaves";
import { useLeaveTypes } from "@/lib/hooks/use-hr-settings";
import { useCurrentEmployee } from "@/lib/hooks/use-employees";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar, Plus, Check, X, Clock, CalendarDays } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import type { LeaveRequestStatus } from "@/lib/types/hr-types";
import { useTranslation } from "@/lib/i18n";

export default function LeavesPage() {
    const { t } = useTranslation();
    const { employee: currentEmployee, loading: employeeLoading } = useCurrentEmployee();
    const { leaveTypes, loading: typesLoading } = useLeaveTypes();
    const { requests, loading, pendingCount, submitRequest, approveRequest, rejectRequest, cancelRequest } = useLeaveRequests();
    const { balances } = useLeaveBalances(currentEmployee?.id || null);

    const [showRequestDialog, setShowRequestDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Request form state
    const [requestForm, setRequestForm] = useState({
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
        isHalfDay: false,
    });

    const isManager = currentEmployee?.hrRole === "manager" || currentEmployee?.hrRole === "hr_admin";

    const handleSubmitRequest = async () => {
        if (!currentEmployee || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate) {
            toast.error(t("hr.toast.fillRequired"));
            return;
        }

        const leaveType = leaveTypes.find((t) => t.id === requestForm.leaveTypeId);
        if (!leaveType) return;

        setIsSubmitting(true);
        try {
            await submitRequest(
                {
                    leaveTypeId: requestForm.leaveTypeId,
                    startDate: new Date(requestForm.startDate),
                    endDate: new Date(requestForm.endDate),
                    reason: requestForm.reason,
                    isHalfDay: requestForm.isHalfDay,
                },
                currentEmployee.id,
                `${currentEmployee.firstName} ${currentEmployee.lastName}`,
                currentEmployee.departmentId,
                leaveType.name
            );
            toast.success(t("hr.leaves.requestSubmitted"));
            setShowRequestDialog(false);
            setRequestForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "", isHalfDay: false });
        } catch (error: any) {
            toast.error(error.message || t("hr.leaves.submitFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        try {
            await approveRequest(requestId);
            toast.success(t("hr.leaves.requestApproved"));
        } catch (error) {
            toast.error(t("hr.leaves.approveFailed"));
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !rejectReason) {
            toast.error(t("hr.leaves.provideRejectReason"));
            return;
        }
        try {
            await rejectRequest(selectedRequest, rejectReason);
            toast.success(t("hr.leaves.requestRejected"));
            setShowRejectDialog(false);
            setSelectedRequest(null);
            setRejectReason("");
        } catch (error) {
            toast.error(t("hr.leaves.rejectFailed"));
        }
    };

    const handleCancel = async (requestId: string) => {
        try {
            await cancelRequest(requestId);
            toast.success(t("hr.leaves.requestCancelled"));
        } catch (error) {
            toast.error(t("hr.leaves.cancelFailed"));
        }
    };

    const getStatusBadge = (status: LeaveRequestStatus) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-amber-100 text-amber-800">{t("hr.leaveStatus.pending")}</Badge>;
            case "approved":
                return <Badge className="bg-green-100 text-green-800">{t("hr.leaveStatus.approved")}</Badge>;
            case "rejected":
                return <Badge className="bg-red-100 text-red-800">{t("hr.leaveStatus.rejected")}</Badge>;
            case "cancelled":
                return <Badge className="bg-gray-100 text-gray-800">{t("hr.leaveStatus.cancelled")}</Badge>;
        }
    };

    // Split requests
    const myRequests = requests.filter((r) => r.employeeId === currentEmployee?.id);
    const pendingApprovals = requests.filter((r) => r.status === "pending" && r.employeeId !== currentEmployee?.id);

    if (loading || employeeLoading || typesLoading) {
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
                    <h2 className="text-xl font-semibold">{t("hr.leaves.title")}</h2>
                    <p className="text-gray-500">{t("hr.leaves.subtitle")}</p>
                </div>
                <Button onClick={() => setShowRequestDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("hr.leaves.requestLeave")}
                </Button>
            </div>

            {/* My Leave Balances */}
            {currentEmployee && balances.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                    {balances.map((balance) => (
                        <Card key={balance.id}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-gray-500">{balance.leaveTypeName}</p>
                                        <p className="text-2xl font-bold">{balance.remaining}</p>
                                        <p className="text-xs text-gray-400">{t("hr.leaves.daysRemaining")}</p>
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        <p>{t("hr.leaves.entitled", { count: balance.entitled })}</p>
                                        <p>{t("hr.leaves.used", { count: balance.used })}</p>
                                        {balance.pending > 0 && <p className="text-amber-600">{t("hr.leaves.pending", { count: balance.pending })}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="my-leaves">
                <TabsList>
                    <TabsTrigger value="my-leaves">{t("hr.leaves.tabMyLeaves")}</TabsTrigger>
                    {isManager && (
                        <TabsTrigger value="approvals" className="relative">
                            {t("hr.leaves.tabPendingApprovals")}
                            {pendingApprovals.length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                                    {pendingApprovals.length}
                                </span>
                            )}
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="all">{t("hr.leaves.tabAllRequests")}</TabsTrigger>
                </TabsList>

                <TabsContent value="my-leaves" className="mt-4">
                    {myRequests.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">{t("hr.leaves.noRequests")}</p>
                                <Button className="mt-4" onClick={() => setShowRequestDialog(true)}>
                                    {t("hr.leaves.requestLeave")}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {myRequests.map((request) => (
                                <Card key={request.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{request.leaveTypeName}</p>
                                                    {getStatusBadge(request.status)}
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {format(request.startDate.toDate(), "MMM d, yyyy")} -{" "}
                                                    {format(request.endDate.toDate(), "MMM d, yyyy")}
                                                    <span className="ml-2">({t("hr.leaves.daysCount", { count: request.totalDays })})</span>
                                                </p>
                                                {request.reason && (
                                                    <p className="text-sm text-gray-400 mt-1">{request.reason}</p>
                                                )}
                                            </div>
                                            {request.status === "pending" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCancel(request.id)}
                                                >
                                                    {t("common.cancel")}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {isManager && (
                    <TabsContent value="approvals" className="mt-4">
                        {pendingApprovals.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Check className="h-12 w-12 mx-auto mb-4 text-green-300" />
                                    <p className="text-gray-500">{t("hr.leaves.noPendingApprovals")}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {pendingApprovals.map((request) => (
                                    <Card key={request.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{request.employeeName}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {request.leaveTypeName} •{" "}
                                                        {format(request.startDate.toDate(), "MMM d")} -{" "}
                                                        {format(request.endDate.toDate(), "MMM d, yyyy")}
                                                        <span className="ml-2">({t("hr.leaves.daysCount", { count: request.totalDays })})</span>
                                                    </p>
                                                    {request.reason && (
                                                        <p className="text-sm text-gray-400 mt-1">{request.reason}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 hover:bg-red-50"
                                                        onClick={() => {
                                                            setSelectedRequest(request.id);
                                                            setShowRejectDialog(true);
                                                        }}
                                                    >
                                                        <X className="h-4 w-4 mr-1" />
                                                        {t("hr.leaves.reject")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleApprove(request.id)}
                                                    >
                                                        <Check className="h-4 w-4 mr-1" />
                                                        {t("hr.leaves.approve")}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                )}

                <TabsContent value="all" className="mt-4">
                    <div className="space-y-3">
                        {requests.map((request) => (
                            <Card key={request.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{request.employeeName}</p>
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {request.leaveTypeName} •{" "}
                                                {format(request.startDate.toDate(), "MMM d")} -{" "}
                                                {format(request.endDate.toDate(), "MMM d, yyyy")}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-400">{t("hr.leaves.daysCount", { count: request.totalDays })}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Request Leave Dialog */}
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("hr.leaves.requestLeave")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("hr.leaves.leaveTypeRequired")}</Label>
                            <Select
                                value={requestForm.leaveTypeId}
                                onValueChange={(v) => setRequestForm({ ...requestForm, leaveTypeId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("hr.leaves.selectLeaveType")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("hr.leaves.startDateRequired")}</Label>
                                <Input
                                    type="date"
                                    value={requestForm.startDate}
                                    onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("hr.leaves.endDateRequired")}</Label>
                                <Input
                                    type="date"
                                    value={requestForm.endDate}
                                    onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("hr.leaves.reasonOptional")}</Label>
                            <Textarea
                                value={requestForm.reason}
                                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                                placeholder={t("hr.leaves.reasonPlaceholder")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                            {isSubmitting ? t("hr.leaves.submitting") : t("hr.leaves.submitRequest")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("hr.leaves.rejectDialogTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>{t("hr.leaves.rejectionReasonRequired")}</Label>
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder={t("hr.leaves.rejectionPlaceholder")}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="destructive" onClick={handleReject}>
                            {t("hr.leaves.rejectRequest")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
