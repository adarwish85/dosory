"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useContracts } from "@/lib/hooks/use-contracts";
import { useProject } from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
    FileText,
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash,
    Send,
    Download,
    Eye,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import type { Contract, ContractStatus } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

const statusConfig: Record<ContractStatus, { labelKey: string; color: string; icon: React.ReactNode }> = {
    draft: { labelKey: "projects.contracts.status.draft", color: "bg-gray-100 text-gray-700", icon: <FileText className="h-3 w-3" /> },
    sent: { labelKey: "projects.contracts.status.sent", color: "bg-blue-100 text-blue-700", icon: <Send className="h-3 w-3" /> },
    signed: { labelKey: "projects.contracts.status.signed", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    expired: { labelKey: "projects.contracts.status.expired", color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
    trash: { labelKey: "projects.contracts.status.trash", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function ProjectContractsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { project, loading: projectLoading } = useProject(projectId);
    const { contracts, loading, contractStats, updateStatus, deleteContract } = useContracts({ projectId });

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter contracts
    const filteredContracts = useMemo(() => {
        let result = contracts;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.subject.toLowerCase().includes(q) ||
                c.customerName?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "all") {
            result = result.filter(c => c.status === statusFilter);
        }
        return result;
    }, [contracts, searchQuery, statusFilter]);

    // Calculate totals
    const totals = useMemo(() => {
        const signed = contracts.filter(c => c.status === "signed");
        const signedValue = signed.reduce((sum, c) => sum + (c.contractValue || 0), 0);
        const totalValue = contracts.reduce((sum, c) => sum + (c.contractValue || 0), 0);
        return { signedValue, totalValue, signedCount: signed.length };
    }, [contracts]);

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setIsDeleting(true);
        try {
            await deleteContract(deleteConfirm);
            toast.success(t("projects.contracts.deletedToast"));
        } catch {
            toast.error(t("projects.contracts.deleteFailedToast"));
        } finally {
            setIsDeleting(false);
            setDeleteConfirm(null);
        }
    };

    if (loading || projectLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
                <Skeleton className="h-[400px] rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">{t("projects.contracts.totalContracts")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{contracts.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600">{t("projects.contracts.status.signed")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">{totals.signedCount}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-600">{t("projects.contracts.totalValue")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">{formatCurrency(totals.totalValue)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600">{t("projects.contracts.signedValue")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">{formatCurrency(totals.signedValue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                        "border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors",
                        statusFilter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    )}
                >
                    <span className="font-bold">{contracts.length}</span> {t("projects.contracts.filterAll")}
                </button>
                {(["draft", "sent", "signed", "expired"] as ContractStatus[]).map(status => {
                    const config = statusConfig[status];
                    const count = contractStats[status] || 0;
                    const isActive = statusFilter === status;
                    return (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(isActive ? "all" : status)}
                            className={cn(
                                "border rounded-full px-3 py-1 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors",
                                isActive ? config.color : "bg-white text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            {config.icon}
                            <span className="font-bold">{count}</span> {t(config.labelKey)}
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder={t("projects.contracts.searchPlaceholder")}
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link href={`/dashboard/contracts/new?projectId=${projectId}&projectName=${encodeURIComponent(project?.name || "")}&customerId=${project?.customerId || ""}`}>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" /> {t("projects.contracts.new")}
                    </Button>
                </Link>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">{t("projects.contracts.subject")}</TableHead>
                            <TableHead>{t("projects.contracts.customer")}</TableHead>
                            <TableHead>{t("projects.contracts.value")}</TableHead>
                            <TableHead>{t("projects.contracts.startDate")}</TableHead>
                            <TableHead>{t("projects.contracts.endDate")}</TableHead>
                            <TableHead>{t("common.status")}</TableHead>
                            <TableHead className="w-20 text-center">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredContracts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                    <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">{t("projects.contracts.emptyTitle")}</p>
                                    <p className="text-sm mt-1">
                                        {searchQuery ? t("projects.contracts.emptySearch") : t("projects.contracts.emptyHint")}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredContracts.map(contract => {
                                const config = statusConfig[contract.status];
                                return (
                                    <TableRow key={contract.id} className="group hover:bg-gray-50">
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/dashboard/contracts/${contract.id}`}
                                                className="hover:text-blue-600 hover:underline"
                                            >
                                                {contract.subject}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{contract.customerName || "-"}</TableCell>
                                        <TableCell className="font-medium">
                                            {contract.contractValue ? formatCurrency(contract.contractValue) : "-"}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {contract.startDate ? format(contract.startDate.toDate(), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {contract.endDate ? format(contract.endDate.toDate(), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("flex items-center gap-1 w-fit", config.color)}>
                                                {config.icon} {t(config.labelKey)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/contracts/${contract.id}`}>
                                                            <Eye className="mr-2 h-4 w-4" /> {t("common.view")}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/contracts/${contract.id}/edit`}>
                                                            <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {contract.status === "draft" && (
                                                        <DropdownMenuItem onClick={() => updateStatus(contract.id, "sent")}>
                                                            <Send className="mr-2 h-4 w-4" /> {t("projects.contracts.markAsSent")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {contract.status === "sent" && (
                                                        <DropdownMenuItem onClick={() => updateStatus(contract.id, "signed")}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" /> {t("projects.contracts.markAsSigned")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => setDeleteConfirm(contract.id)}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" /> {t("common.delete")}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("projects.contracts.deleteDialogTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("projects.contracts.deleteDialogDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t("common.cancel")}</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("common.delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
