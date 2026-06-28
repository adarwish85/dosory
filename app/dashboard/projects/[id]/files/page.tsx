"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useProjectFiles } from "@/lib/hooks/use-project-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FileText, Download, Trash2, Upload, Loader2, File } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils"; // Assuming this utility exists, if not I'll inline it
import { useTranslation } from "@/lib/i18n";

function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function ProjectFilesPage() {
    const { t } = useTranslation();
    const params = useParams();
    const projectId = params.id as string;
    const { files, loading, uploadFile, deleteFile } = useProjectFiles(projectId);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await uploadFile(file);
            toast.success(t("projects.files.uploadedToast"));
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error(error);
            toast.error(t("projects.files.uploadFailedToast"));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(t("projects.files.deleteConfirm", { name }))) {
            try {
                await deleteFile(id);
                toast.success(t("projects.files.deletedToast"));
            } catch (error) {
                toast.error(t("projects.files.deleteFailedToast"));
            }
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t("projects.files.title")}</h2>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {t("projects.files.uploadButton")}
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("common.name")}</TableHead>
                            <TableHead>{t("projects.files.size")}</TableHead>
                            <TableHead>{t("projects.files.type")}</TableHead>
                            <TableHead>{t("projects.files.uploaded")}</TableHead>
                            <TableHead className="text-right">{t("common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <File className="h-10 w-10 opacity-20" />
                                        <p>{t("projects.files.empty")}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            files.map((file) => (
                                <TableRow key={file.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">
                                            {file.name}
                                        </a>
                                    </TableCell>
                                    <TableCell>{formatFileSize(file.size)}</TableCell>
                                    <TableCell className="max-w-[150px] truncate" title={file.type}>{file.type}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span>{format(file.createdAt.toDate(), "MMM d, yyyy")}</span>
                                            <span className="text-muted-foreground">{t("projects.files.byUploader", { name: file.uploadedBy })}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="icon">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </a>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(file.id, file.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
