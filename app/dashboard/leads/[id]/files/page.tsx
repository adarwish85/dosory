"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useFiles } from "@/lib/hooks/use-files";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, File as FileIcon, Trash2, Download, UploadCloud } from "lucide-react";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function LeadFilesPage() {
    const params = useParams();
    const leadId = params?.id as string;
    const { t } = useTranslation();

    const { files, loading, uploading, uploadFile, deleteFile } = useFiles({
        relatedTo: { type: "lead", id: leadId }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "PP p");
        } catch {
            return "-";
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                await uploadFile(file);
                toast.success(t("leads.files.uploadSuccess"));
            } catch (error: any) {
                console.error("File upload error:", error);
                toast.error(t("leads.files.uploadError"), {
                    description: error.message || t("leads.files.uploadErrorDesc")
                });
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        }
    };

    const handleDelete = async (file: any) => { // Type as any for simplicity or define FileDoc
        if (confirm(t("leads.files.deleteConfirm", { name: file.name }))) {
            await deleteFile(file);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t("leads.files.title")}</h2>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <UploadCloud className="mr-2 h-4 w-4" />
                        )}
                        {t("leads.files.uploadFile")}
                    </Button>
                </div>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900">{t("leads.files.table.name")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.files.table.size")}</TableHead>
                            <TableHead className="font-semibold text-gray-900">{t("leads.files.table.dateUploaded")}</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <FileIcon className="h-8 w-8 text-gray-300" />
                                        <p>{t("leads.files.empty")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            files.map((file) => (
                                <TableRow key={file.id} className="group hover:bg-gray-50">
                                    <TableCell className="font-medium">
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-blue-600 hover:underline"
                                        >
                                            <FileIcon className="mr-2 h-4 w-4" />
                                            {file.name}
                                        </a>
                                    </TableCell>
                                    <TableCell className="text-gray-500">{formatBytes(file.size)}</TableCell>
                                    <TableCell className="text-gray-500">{formatDate(file.createdAt)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="sm">
                                                    <Download className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </a>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(file)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
