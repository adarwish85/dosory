"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useCustomerFiles } from "@/lib/hooks/use-customer-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Upload, Search, RefreshCw, Loader2, FileText, FileImage, FileVideo, File, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

export default function FilesPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { files, loading: filesLoading, deleteFile } = useCustomerFiles({ customerId: customerId || undefined });

    if (customerLoading || filesLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "dd/MM/yyyy HH:mm");
        } catch {
            return "-";
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
        if (type.startsWith("video/")) return <FileVideo className="h-4 w-4 text-purple-500" />;
        if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
        return <File className="h-4 w-4 text-gray-500" />;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Files</h2>

            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Upload className="mr-2 h-4 w-4" /> Upload File
            </Button>

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search files..." className="pl-9" />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">File Name</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Size</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Uploaded</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                        No files found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                files.map((file) => (
                                    <TableRow key={file.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getFileIcon(file.type)}
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-blue-600 hover:underline"
                                                >
                                                    {file.name}
                                                </a>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{formatFileSize(file.size)}</TableCell>
                                        <TableCell className="text-gray-500">{formatDate(file.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <a href={file.url} download>
                                                        <Download className="h-4 w-4 text-gray-500" />
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => deleteFile(file.id)}
                                                >
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
        </div>
    );
}
