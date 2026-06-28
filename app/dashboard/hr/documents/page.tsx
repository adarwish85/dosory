"use client";

import { useState } from "react";
import { useEmployeeDocuments } from "@/lib/hooks/use-employee-documents";
import { useEmployees } from "@/lib/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FileText, Upload, Download, Trash2, AlertTriangle, Search, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import type { DocumentType } from "@/lib/types/hr-types";

const documentTypeKeys: Record<DocumentType, string> = {
    contract: "hr.documents.type.contract",
    id_proof: "hr.documents.type.idProof",
    resume: "hr.documents.type.resume",
    certification: "hr.documents.type.certification",
    tax_form: "hr.documents.type.taxForm",
    review: "hr.documents.type.review",
    other: "hr.documents.type.other",
};

export default function DocumentsPage() {
    const { t } = useTranslation();
    const { documents, loading, expiringDocuments, uploadDocument, deleteDocument } = useEmployeeDocuments();
    const { employees } = useEmployees({ status: "active" });

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Upload form state
    const [formData, setFormData] = useState({
        employeeId: "",
        documentType: "other" as DocumentType,
        name: "",
        fileUrl: "",
        description: "",
        expiryDate: "",
    });

    const filteredDocuments = documents.filter((doc) => {
        const matchesSearch =
            doc.name.toLowerCase().includes(search.toLowerCase()) ||
            doc.employeeName.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || doc.documentType === typeFilter;
        return matchesSearch && matchesType;
    });

    const handleUpload = async () => {
        if (!formData.employeeId || !formData.name || !formData.fileUrl) {
            toast.error(t("hr.documents.fillRequired"));
            return;
        }

        const employee = employees.find((e) => e.id === formData.employeeId);
        if (!employee) return;

        setIsSubmitting(true);
        try {
            await uploadDocument(formData.employeeId, `${employee.firstName} ${employee.lastName}`, {
                documentType: formData.documentType,
                name: formData.name,
                fileUrl: formData.fileUrl,
                description: formData.description,
                expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
            });
            toast.success(t("hr.documents.uploaded"));
            setShowUploadDialog(false);
            setFormData({
                employeeId: "",
                documentType: "other",
                name: "",
                fileUrl: "",
                description: "",
                expiryDate: "",
            });
        } catch (error) {
            toast.error(t("hr.documents.uploadFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("hr.documents.confirmDelete"))) return;
        try {
            await deleteDocument(id);
            toast.success(t("hr.documents.deleted"));
        } catch (error) {
            toast.error(t("hr.documents.deleteFailed"));
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">{t("hr.documents.title")}</h2>
                    <p className="text-gray-500">{t("hr.documents.subtitle")}</p>
                </div>
                <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("hr.documents.uploadDocument")}
                </Button>
            </div>

            {/* Expiring Documents Alert */}
            {expiringDocuments.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <div>
                                <p className="font-medium text-amber-800">
                                    {t("hr.documents.expiringSoon", { count: expiringDocuments.length })}
                                </p>
                                <p className="text-sm text-amber-600">
                                    {t("hr.documents.reviewRenew")}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t("hr.documents.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentType | "all")}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("hr.documents.documentType")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("hr.documents.allTypes")}</SelectItem>
                        {Object.entries(documentTypeKeys).map(([value, key]) => (
                            <SelectItem key={value} value={value}>
                                {t(key)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Documents Table */}
            {filteredDocuments.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">{t("hr.documents.noDocuments")}</p>
                        <Button className="mt-4" onClick={() => setShowUploadDialog(true)}>
                            {t("hr.documents.uploadFirst")}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("hr.documents.document")}</TableHead>
                                <TableHead>{t("hr.documents.employee")}</TableHead>
                                <TableHead>{t("hr.documents.type")}</TableHead>
                                <TableHead>{t("hr.documents.uploaded")}</TableHead>
                                <TableHead>{t("hr.documents.expiry")}</TableHead>
                                <TableHead className="text-right">{t("common.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocuments.map((doc) => {
                                const isExpiring =
                                    doc.expiryDate &&
                                    Math.ceil(
                                        (doc.expiryDate.toDate().getTime() - new Date().getTime()) /
                                        (1000 * 60 * 60 * 24)
                                    ) <= 30;

                                return (
                                    <TableRow key={doc.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">{doc.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{doc.employeeName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{t(documentTypeKeys[doc.documentType])}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {format(doc.createdAt.toDate(), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            {doc.expiryDate ? (
                                                <span
                                                    className={
                                                        isExpiring ? "text-amber-600 font-medium" : "text-gray-500"
                                                    }
                                                >
                                                    {format(doc.expiryDate.toDate(), "MMM d, yyyy")}
                                                    {isExpiring && (
                                                        <AlertTriangle className="h-3 w-3 inline ml-1" />
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => window.open(doc.fileUrl, "_blank")}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => handleDelete(doc.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("hr.documents.uploadDocument")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("hr.documents.employeeRequired")}</Label>
                            <Select
                                value={formData.employeeId}
                                onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("hr.documents.selectEmployee")} />
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
                        <div className="space-y-2">
                            <Label>{t("hr.documents.documentType")}</Label>
                            <Select
                                value={formData.documentType}
                                onValueChange={(v) => setFormData({ ...formData, documentType: v as DocumentType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(documentTypeKeys).map(([value, key]) => (
                                        <SelectItem key={value} value={value}>
                                            {t(key)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("hr.documents.documentNameRequired")}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t("hr.documents.documentNamePlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("hr.documents.fileUrlRequired")}</Label>
                            <Input
                                value={formData.fileUrl}
                                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                placeholder="https://..."
                            />
                            <p className="text-xs text-gray-500">
                                {t("hr.documents.fileUrlHint")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("hr.documents.expiryDateOptional")}</Label>
                            <Input
                                type="date"
                                value={formData.expiryDate}
                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("hr.documents.descriptionOptional")}</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t("hr.documents.descriptionPlaceholder")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleUpload} disabled={isSubmitting}>
                            {isSubmitting ? t("hr.documents.uploading") : t("hr.documents.upload")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
