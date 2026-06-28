"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "@/lib/i18n";

interface EditProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: any;
}

interface ProjectFormData {
    name: string;
    customerId: string;
    billingType: string;
    status: string;
    estimatedHours: string;
    startDate: string;
    deadline: string;
    description: string;
    calculateProgressFromTasks: boolean;
    sendNotifications: string;
    allowCustomerViewTasks: boolean;
    allowCustomerCreateTasks: boolean;
    allowCustomerUploadFiles: boolean;
    allowCustomerViewMilestones: boolean;
}

const defaultFormData: ProjectFormData = {
    name: "",
    customerId: "",
    billingType: "fixed",
    status: "in-progress",
    estimatedHours: "",
    startDate: "",
    deadline: "",
    description: "",
    calculateProgressFromTasks: true,
    sendNotifications: "all",
    allowCustomerViewTasks: false,
    allowCustomerCreateTasks: false,
    allowCustomerUploadFiles: true,
    allowCustomerViewMilestones: true,
};

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<ProjectFormData>(defaultFormData);

    const totalSteps = 2;

    useEffect(() => {
        if (project && open) {
            setFormData({
                name: project.name || "",
                customerId: project.customerId || "",
                billingType: project.billingType || "fixed",
                status: project.status || "in-progress",
                estimatedHours: project.estimatedHours?.toString() || "",
                startDate: project.startDate || "",
                deadline: project.deadline || "",
                description: project.description || "",
                calculateProgressFromTasks: project.calculateProgressFromTasks ?? true,
                sendNotifications: project.sendNotifications || "all",
                allowCustomerViewTasks: project.allowCustomerViewTasks ?? false,
                allowCustomerCreateTasks: project.allowCustomerCreateTasks ?? false,
                allowCustomerUploadFiles: project.allowCustomerUploadFiles ?? true,
                allowCustomerViewMilestones: project.allowCustomerViewMilestones ?? true,
            });
        }
    }, [project, open]);

    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);
        if (!newOpen) {
            setTimeout(() => {
                setStep(1);
            }, 300);
        }
    };

    const updateField = (field: keyof ProjectFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validateStep = (currentStep: number): boolean => {
        if (currentStep === 1) {
            if (!formData.name.trim()) {
                toast.error(t("projects.edit.nameRequired"));
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep((prev) => Math.min(prev + 1, totalSteps));
        }
    };

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleSave = async () => {
        if (!validateStep(1)) {
            setStep(1);
            return;
        }

        if (!project?.id) {
            toast.error(t("projects.edit.idNotFound"));
            return;
        }

        setSaving(true);
        try {
            await updateDoc(doc(db, "projects", project.id), {
                name: formData.name.trim(),
                customerId: formData.customerId,
                billingType: formData.billingType,
                status: formData.status,
                estimatedHours: parseFloat(formData.estimatedHours) || null,
                startDate: formData.startDate,
                deadline: formData.deadline,
                description: formData.description,
                calculateProgressFromTasks: formData.calculateProgressFromTasks,
                sendNotifications: formData.sendNotifications,
                allowCustomerViewTasks: formData.allowCustomerViewTasks,
                allowCustomerCreateTasks: formData.allowCustomerCreateTasks,
                allowCustomerUploadFiles: formData.allowCustomerUploadFiles,
                allowCustomerViewMilestones: formData.allowCustomerViewMilestones,
                updatedAt: serverTimestamp(),
            });

            toast.success(t("projects.edit.updateSuccess"));
            handleOpenChange(false);
        } catch (error) {
            console.error("Error updating project:", error);
            toast.error(t("projects.edit.updateError"));
        } finally {
            setSaving(false);
        }
    };

    const stepLabels = [t("projects.edit.stepDetails"), t("projects.edit.stepSettings")];

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <SheetTitle>{t("projects.edit.title")}</SheetTitle>
                        <span className="text-sm text-gray-500">
                            {t("projects.edit.stepLabel", { step })}: {stepLabels[step - 1]}
                        </span>
                    </div>
                </SheetHeader>

                {/* Step Indicator */}
                <div className="px-6 py-3 border-b bg-gray-50">
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full ${i + 1 <= step ? "bg-gray-900" : "bg-gray-200"}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-red-500">{t("projects.edit.projectNameLabel")}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder={t("projects.edit.projectNamePlaceholder")}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="calc-progress"
                                    checked={formData.calculateProgressFromTasks}
                                    onCheckedChange={(c) => updateField("calculateProgressFromTasks", !!c)}
                                />
                                <Label htmlFor="calc-progress" className="font-normal">
                                    {t("projects.edit.calculateProgress")}
                                </Label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-red-500">{t("projects.edit.billingTypeLabel")}</Label>
                                    <Select
                                        value={formData.billingType}
                                        onValueChange={(v) => updateField("billingType", v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">{t("projects.edit.billingFixed")}</SelectItem>
                                            <SelectItem value="hourly">{t("projects.edit.billingHourly")}</SelectItem>
                                            <SelectItem value="task">{t("projects.edit.billingTask")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("common.status")}</Label>
                                    <Select value={formData.status} onValueChange={(v) => updateField("status", v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not-started">{t("projects.status.notStarted")}</SelectItem>
                                            <SelectItem value="in-progress">{t("projects.status.inProgress")}</SelectItem>
                                            <SelectItem value="on-hold">{t("projects.status.onHold")}</SelectItem>
                                            <SelectItem value="cancelled">{t("projects.status.cancelled")}</SelectItem>
                                            <SelectItem value="finished">{t("projects.status.finished")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("projects.edit.estimatedHours")}</Label>
                                <Input
                                    type="number"
                                    value={formData.estimatedHours}
                                    onChange={(e) => updateField("estimatedHours", e.target.value)}
                                    placeholder={t("projects.edit.estimatedHoursPlaceholder")}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-red-500">{t("projects.edit.startDateLabel")}</Label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => updateField("startDate", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("projects.edit.deadline")}</Label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            value={formData.deadline}
                                            onChange={(e) => updateField("deadline", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("common.description")}</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => updateField("description", e.target.value)}
                                    placeholder={t("projects.edit.descriptionPlaceholder")}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t("projects.edit.sendNotifications")}</Label>
                                <Select
                                    value={formData.sendNotifications}
                                    onValueChange={(v) => updateField("sendNotifications", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("projects.edit.notifyAll")}</SelectItem>
                                        <SelectItem value="none">{t("projects.edit.notifyNone")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="font-medium text-gray-900">{t("projects.edit.customerPermissions")}</h4>

                                {[
                                    { id: "allowCustomerViewTasks", label: t("projects.edit.allowViewTasks") },
                                    { id: "allowCustomerCreateTasks", label: t("projects.edit.allowCreateTasks") },
                                    { id: "allowCustomerUploadFiles", label: t("projects.edit.allowUploadFiles") },
                                    { id: "allowCustomerViewMilestones", label: t("projects.edit.allowViewMilestones") },
                                ].map((item) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={item.id}
                                            checked={formData[item.id as keyof ProjectFormData] as boolean}
                                            onCheckedChange={(c) => updateField(item.id as keyof ProjectFormData, !!c)}
                                        />
                                        <Label htmlFor={item.id} className="font-normal">
                                            {item.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                    <div>
                        {step > 1 && (
                            <Button variant="outline" onClick={prevStep} className="gap-1">
                                <ChevronLeft className="h-4 w-4" /> {t("projects.edit.back")}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        {step < totalSteps ? (
                            <Button onClick={nextStep} className="bg-gray-900 text-white hover:bg-gray-800 gap-1">
                                {t("projects.edit.next")} <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSave}
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                disabled={saving}
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("common.saveChanges")}
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
