"use client";

import { useState, useCallback } from "react";
import {
    X,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    Download,
    ArrowRight,
    ArrowLeft,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    MODULE_CONFIGS,
    ModuleConfig,
    ParsedData,
    ColumnMapping,
    ValidationError,
    parseCSV,
    autoDetectMappings,
    validateRow,
    transformRow,
    downloadTemplate,
} from "@/lib/import-utils";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";

interface ImportWizardProps {
    open: boolean;
    onClose: () => void;
    module: keyof typeof MODULE_CONFIGS;
    onSuccess?: (count: number) => void;
}

type WizardStep = "upload" | "mapping" | "preview" | "importing" | "complete";

export default function ImportWizard({ open, onClose, module, onSuccess }: ImportWizardProps) {
    const { profile } = useUserProfile();
    const { t } = useTranslation();
    const moduleConfig = MODULE_CONFIGS[module];

    const [step, setStep] = useState<WizardStep>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [importResult, setImportResult] = useState({ success: 0, failed: 0 });

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFile = e.target.files?.[0];
            if (!selectedFile) return;

            try {
                setFile(selectedFile);
                const data = await parseCSV(selectedFile);
                setParsedData(data);

                // Auto-detect mappings
                const autoMappings = autoDetectMappings(data.headers, moduleConfig);
                setMappings(autoMappings);

                setStep("mapping");
            } catch (error) {
                console.error("Error parsing file:", error);
                alert(t("import.errors.parseFailed"));
            }
        },
        [moduleConfig, t]
    );

    const handleMappingChange = (sourceColumn: string, targetField: string) => {
        setMappings((prev) => {
            const existing = prev.findIndex((m) => m.targetField === targetField);
            if (existing >= 0) {
                if (sourceColumn === "ignore") {
                    return prev.filter((_, i) => i !== existing);
                }
                return prev.map((m, i) => (i === existing ? { sourceColumn, targetField } : m));
            }
            if (sourceColumn) {
                return [...prev, { sourceColumn, targetField }];
            }
            return prev;
        });
    };

    const validateData = useCallback(() => {
        if (!parsedData) return;

        const allErrors: ValidationError[] = [];

        parsedData.rows.forEach((row, index) => {
            const transformedRow = transformRow(row, mappings, moduleConfig);
            const rowErrors = validateRow(transformedRow, moduleConfig);
            rowErrors.forEach((err) => {
                allErrors.push({ ...err, row: index + 1 });
            });
        });

        setErrors(allErrors);
        setStep("preview");
    }, [parsedData, mappings, moduleConfig]);

    const handleImport = useCallback(async () => {
        if (!parsedData || !profile?.orgId) return;

        setStep("importing");
        setImportProgress({ current: 0, total: parsedData.rows.length });

        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < parsedData.rows.length; i++) {
            try {
                const row = parsedData.rows[i];
                const transformedRow = transformRow(row, mappings, moduleConfig);

                // Add org metadata
                const docData: Record<string, any> = {
                    ...transformedRow,
                    orgId: profile.orgId,
                    status: transformedRow.status || "active",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    importedAt: serverTimestamp(),
                    createdBy: profile.uid,
                };

                // Handle special address structure for customers
                if (module === "customers" && transformedRow.address) {
                    docData.address = {
                        street: transformedRow.address || "",
                        city: transformedRow.city || "",
                        state: transformedRow.state || "",
                        zipCode: transformedRow.zipCode || "",
                        country: transformedRow.country || "",
                    };
                    // Remove flat fields
                    delete docData.city;
                    delete docData.state;
                    delete docData.zipCode;
                    delete docData.country;
                }

                await addDoc(collection(db, moduleConfig.collection), docData);
                successCount++;
            } catch (error) {
                console.error(`Failed to import row ${i + 1}:`, error);
                failedCount++;
            }

            setImportProgress({ current: i + 1, total: parsedData.rows.length });
        }

        setImportResult({ success: successCount, failed: failedCount });
        setStep("complete");
        onSuccess?.(successCount);
    }, [parsedData, mappings, moduleConfig, module, profile, onSuccess]);

    const handleClose = () => {
        setStep("upload");
        setFile(null);
        setParsedData(null);
        setMappings([]);
        setErrors([]);
        setImportProgress({ current: 0, total: 0 });
        setImportResult({ success: 0, failed: 0 });
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t("import.title", { module: moduleConfig.name })}</h2>
                        <p className="text-sm text-gray-500 mt-1">{t("import.subtitle")}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 py-4 border-b bg-gray-50">
                    {["upload", "mapping", "preview", "complete"].map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                    step === s || (step === "importing" && s === "preview")
                                        ? "bg-blue-600 text-white"
                                        : ["upload", "mapping", "preview", "importing", "complete"].indexOf(step) > i
                                          ? "bg-green-600 text-white"
                                          : "bg-gray-200 text-gray-600"
                                )}
                            >
                                {i + 1}
                            </div>
                            {i < 3 && <ArrowRight className="h-4 w-4 text-gray-400" />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Upload */}
                    {step === "upload" && (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                                <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{t("import.upload.dropHere")}</h3>
                                <p className="text-sm text-gray-500 mb-4">{t("import.upload.orBrowse")}</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload">
                                    <Button asChild variant="outline">
                                        <span>
                                            <Upload className="mr-2 h-4 w-4" />
                                            {t("import.upload.selectFile")}
                                        </span>
                                    </Button>
                                </label>
                            </div>

                            <div className="flex items-center justify-center">
                                <Button
                                    variant="link"
                                    onClick={() => downloadTemplate(moduleConfig)}
                                    className="text-blue-600"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    {t("import.upload.downloadTemplate")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Column Mapping */}
                    {step === "mapping" && parsedData && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>{parsedData.totalRows}</strong>{" "}
                                    {t("import.mapping.instructions", { module: moduleConfig.name })}
                                </p>
                            </div>

                            <div className="space-y-3">
                                {moduleConfig.fields.map((field) => {
                                    const currentMapping = mappings.find((m) => m.targetField === field.field);
                                    return (
                                        <div key={field.field} className="flex items-center gap-4">
                                            <div className="w-1/3">
                                                <label className="text-sm text-gray-700">
                                                    {field.required && <span className="text-red-500">*</span>}
                                                    {field.label}
                                                </label>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-gray-400" />
                                            <div className="flex-1">
                                                <Select
                                                    value={currentMapping?.sourceColumn || ""}
                                                    onValueChange={(value) => handleMappingChange(value, field.field)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("import.mapping.selectColumn")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ignore">{t("import.mapping.skip")}</SelectItem>
                                                        {parsedData.headers.map((header) => (
                                                            <SelectItem key={header} value={header}>
                                                                {header}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === "preview" && parsedData && (
                        <div className="space-y-4">
                            {errors.length > 0 ? (
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                        <AlertCircle className="h-5 w-5" />
                                        <strong>{t("import.preview.validationWarnings", { count: errors.length })}</strong>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto text-sm text-yellow-700">
                                        {errors.slice(0, 10).map((err, i) => (
                                            <div key={i}>
                                                {t("import.preview.rowError", { row: err.row, message: err.message })}
                                            </div>
                                        ))}
                                        {errors.length > 10 && <div>{t("import.preview.andMore", { count: errors.length - 10 })}</div>}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 p-4 rounded-lg flex items-center gap-2 text-green-800">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>{t("import.preview.allValid", { count: parsedData.totalRows })}</span>
                                </div>
                            )}

                            {/* Preview table */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="overflow-x-auto max-h-64">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-gray-600">#</th>
                                                {mappings.map((m) => (
                                                    <th
                                                        key={m.targetField}
                                                        className="px-4 py-2 text-left text-gray-600"
                                                    >
                                                        {
                                                            moduleConfig.fields.find((f) => f.field === m.targetField)
                                                                ?.label
                                                        }
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.rows.slice(0, 5).map((row, i) => {
                                                const transformedRow = transformRow(row, mappings, moduleConfig);
                                                return (
                                                    <tr key={i} className="border-t">
                                                        <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                                                        {mappings.map((m) => (
                                                            <td key={m.targetField} className="px-4 py-2">
                                                                {transformedRow[m.targetField] || "-"}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {parsedData.totalRows > 5 && (
                                    <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 border-t">
                                        {t("import.preview.showingCount", { total: parsedData.totalRows })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Importing */}
                    {step === "importing" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{t("import.importing.title")}</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {t("import.importing.progress", { current: importProgress.current, total: importProgress.total })}
                            </p>
                            <div className="w-64 bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Complete */}
                    {step === "complete" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{t("import.complete.title")}</h3>
                            <p className="text-gray-600 mb-4">
                                {t("import.complete.successPrefix")} <strong>{importResult.success}</strong> {t("import.complete.successSuffix")}
                                {importResult.failed > 0 && (
                                    <span className="text-red-600"> {t("import.complete.failedCount", { count: importResult.failed })}</span>
                                )}
                            </p>
                            <Button onClick={handleClose}>{t("common.done")}</Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!["importing", "complete"].includes(step) && (
                    <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (step === "mapping") setStep("upload");
                                else if (step === "preview") setStep("mapping");
                            }}
                            disabled={step === "upload"}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("common.back")}
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleClose}>
                                {t("common.cancel")}
                            </Button>
                            {step === "mapping" && (
                                <Button onClick={validateData}>
                                    {t("common.continue")}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                            {step === "preview" && (
                                <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
                                    {t("import.preview.importButton", { count: parsedData?.totalRows ?? 0 })}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
