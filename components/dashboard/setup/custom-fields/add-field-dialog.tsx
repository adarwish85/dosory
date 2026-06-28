"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

interface FieldFormData {
    fieldTo: string;
    name: string;
    type: string;
    defaultValue: string;
    order: string;
    gridWidth: string;
    disabled: boolean;
    adminOnly: boolean;
    required: boolean;
    showOnTable: boolean;
}

const defaultFormData: FieldFormData = {
    fieldTo: "",
    name: "",
    type: "",
    defaultValue: "",
    order: "",
    gridWidth: "12",
    disabled: false,
    adminOnly: false,
    required: false,
    showOnTable: false,
};

export function AddFieldDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<FieldFormData>(defaultFormData);
    const { profile } = useUserProfile();
    const { t } = useTranslation();

    const totalSteps = 2;

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setTimeout(() => {
                setStep(1);
                setFormData(defaultFormData);
            }, 300);
        }
    };

    const updateField = (field: keyof FieldFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validateStep = (currentStep: number): boolean => {
        if (currentStep === 1) {
            if (!formData.fieldTo) {
                toast.error(t("setup.customFields.fieldToRequired"));
                return false;
            }
            if (!formData.name.trim()) {
                toast.error(t("setup.customFields.nameRequired"));
                return false;
            }
            if (!formData.type) {
                toast.error(t("setup.customFields.typeRequired"));
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

        setSaving(true);
        try {
            await addDoc(collection(db, "customFields"), {
                fieldTo: formData.fieldTo,
                name: formData.name.trim(),
                type: formData.type,
                defaultValue: formData.defaultValue,
                order: parseInt(formData.order) || 0,
                gridWidth: parseInt(formData.gridWidth) || 12,
                disabled: formData.disabled,
                adminOnly: formData.adminOnly,
                required: formData.required,
                showOnTable: formData.showOnTable,
                orgId: profile?.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            });

            toast.success(t("setup.customFields.created"));
            handleOpenChange(false);
        } catch (error) {
            console.error("Error creating custom field:", error);
            toast.error(t("setup.customFields.createFailed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> {t("setup.customFields.new")}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <SheetTitle>{t("setup.customFields.addTitle")}</SheetTitle>
                        <span className="text-sm text-gray-500">
                            {t("setup.customFields.stepOf", { step, total: totalSteps })}
                        </span>
                    </div>
                </SheetHeader>

                <div className="flex-1 p-6 overflow-hidden">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900">{t("setup.customFields.configHeading")}</h3>

                            <div className="space-y-2">
                                <Label className="text-red-500">{t("setup.customFields.fieldToLabel")}</Label>
                                <Select value={formData.fieldTo} onValueChange={(v) => updateField("fieldTo", v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("setup.customFields.selectModule")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="customers">{t("setup.customFields.module.customers")}</SelectItem>
                                        <SelectItem value="leads">{t("setup.customFields.module.leads")}</SelectItem>
                                        <SelectItem value="projects">{t("setup.customFields.module.projects")}</SelectItem>
                                        <SelectItem value="tasks">{t("setup.customFields.module.tasks")}</SelectItem>
                                        <SelectItem value="invoices">{t("setup.customFields.module.invoices")}</SelectItem>
                                        <SelectItem value="estimates">{t("setup.customFields.module.estimates")}</SelectItem>
                                        <SelectItem value="contracts">{t("setup.customFields.module.contracts")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">{t("setup.customFields.nameLabel")}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder={t("setup.customFields.namePlaceholder")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">{t("setup.customFields.typeLabel")}</Label>
                                <Select value={formData.type} onValueChange={(v) => updateField("type", v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("setup.customFields.selectType")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">{t("setup.customFields.fieldType.text")}</SelectItem>
                                        <SelectItem value="textarea">{t("setup.customFields.fieldType.textarea")}</SelectItem>
                                        <SelectItem value="number">{t("setup.customFields.fieldType.number")}</SelectItem>
                                        <SelectItem value="date">{t("setup.customFields.fieldType.date")}</SelectItem>
                                        <SelectItem value="select">{t("setup.customFields.fieldType.select")}</SelectItem>
                                        <SelectItem value="multiselect">{t("setup.customFields.fieldType.multiselect")}</SelectItem>
                                        <SelectItem value="checkbox">{t("setup.customFields.fieldType.checkbox")}</SelectItem>
                                        <SelectItem value="link">{t("setup.customFields.fieldType.link")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("setup.customFields.defaultValueLabel")}</Label>
                                <Input
                                    value={formData.defaultValue}
                                    onChange={(e) => updateField("defaultValue", e.target.value)}
                                    placeholder={t("setup.customFields.defaultValuePlaceholder")}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900">{t("setup.customFields.displayHeading")}</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("setup.customFields.orderLabel")}</Label>
                                    <Input
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) => updateField("order", e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("setup.customFields.gridWidthLabel")}</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={formData.gridWidth}
                                        onChange={(e) => updateField("gridWidth", e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="font-medium text-gray-900">{t("setup.customFields.optionsHeading")}</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="disabled"
                                            checked={formData.disabled}
                                            onCheckedChange={(c) => updateField("disabled", !!c)}
                                        />
                                        <Label htmlFor="disabled" className="font-normal">
                                            {t("setup.customFields.optionDisabled")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="adminOnly"
                                            checked={formData.adminOnly}
                                            onCheckedChange={(c) => updateField("adminOnly", !!c)}
                                        />
                                        <Label htmlFor="adminOnly" className="font-normal">
                                            {t("setup.customFields.optionAdminOnly")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="required"
                                            checked={formData.required}
                                            onCheckedChange={(c) => updateField("required", !!c)}
                                        />
                                        <Label htmlFor="required" className="font-normal">
                                            {t("setup.customFields.optionRequired")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="showOnTable"
                                            checked={formData.showOnTable}
                                            onCheckedChange={(c) => updateField("showOnTable", !!c)}
                                        />
                                        <Label htmlFor="showOnTable" className="font-normal">
                                            {t("setup.customFields.optionShowOnTable")}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                    <div>
                        {step > 1 && (
                            <Button variant="outline" onClick={prevStep} className="gap-1">
                                <ChevronLeft className="h-4 w-4" /> {t("setup.customFields.back")}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        {step < totalSteps ? (
                            <Button onClick={nextStep} className="bg-gray-900 text-white hover:bg-gray-800 gap-1">
                                {t("setup.customFields.next")} <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSave}
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                disabled={saving}
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("setup.customFields.createField")}
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
