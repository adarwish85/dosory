"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, File as FileIcon, X } from "lucide-react";
import { useCustomerFiles } from "@/lib/hooks/use-customer-data";
import { toast } from "sonner";
import { useCustomer } from "../customer-context";
import { useTranslation } from "@/lib/i18n";

interface UploadFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UploadFileDialog({ open, onOpenChange }: UploadFileDialogProps) {
    const { t } = useTranslation();
    const { customerId } = useCustomer();
    const { uploadFile } = useCustomerFiles();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !customerId) return;

        setUploading(true);
        try {
            await uploadFile(file, customerId);
            toast.success(t("customers.files.uploadSuccess"));
            onOpenChange(false);
            setFile(null);
        } catch (error) {
            console.error(error);
            toast.error(t("customers.files.uploadError"));
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("customers.files.uploadTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("customers.files.uploadDescription")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!file ? (
                        <div
                            className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm font-medium text-gray-900">{t("customers.files.clickToSelect")}</p>
                            <p className="text-xs text-gray-500 mt-1">{t("customers.files.dragAndDrop")}</p>
                            <Input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-md">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center shrink-0">
                                    <FileIcon className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                                <X className="h-4 w-4 text-gray-500" />
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || uploading}>
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("customers.files.uploading")}
                            </>
                        ) : (
                            t("customers.files.upload")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
