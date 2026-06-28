"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

interface FormData {
    name: string;
    language: string;
    titlePrefix: string;
    sourceId: string;
    statusId: string;
    assigneeId: string;
    submitButtonText: string;
    submitButtonBgColor: string;
    submitButtonTextColor: string;
    successAction: string;
    successMessage: string;
    autoMarkPublic: boolean;
    allowDuplicate: boolean;
    notifyOnImport: boolean;
    notifyType: string;
}

const defaultFormData: FormData = {
    name: "",
    language: "english",
    titlePrefix: "",
    sourceId: "",
    statusId: "",
    assigneeId: "",
    submitButtonText: "Submit",
    submitButtonBgColor: "#84c529",
    submitButtonTextColor: "#ffffff",
    successAction: "message",
    successMessage: "Thank you for your submission!",
    autoMarkPublic: false,
    allowDuplicate: true,
    notifyOnImport: true,
    notifyType: "responsible",
};

export function AddFormDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<FormData>(defaultFormData);
    const { profile } = useUserProfile();
    const { t } = useTranslation();

    const totalSteps = 4;

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setTimeout(() => {
                setStep(1);
                setFormData(defaultFormData);
            }, 300);
        }
    };

    const updateField = (field: keyof FormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validateStep = (currentStep: number): boolean => {
        if (currentStep === 1) {
            if (!formData.name.trim()) {
                toast.error(t("setup.leads.form.nameRequired"));
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
            await addDoc(collection(db, "leadForms"), {
                ...formData,
                orgId: profile?.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            });

            toast.success(t("setup.leads.form.createSuccess"));
            handleOpenChange(false);
        } catch (error) {
            console.error("Error creating lead form:", error);
            toast.error(t("setup.leads.form.createError"));
        } finally {
            setSaving(false);
        }
    };

    const stepLabels = [
        t("setup.leads.form.stepGeneral"),
        t("setup.leads.form.stepBranding"),
        t("setup.leads.form.stepSubmission"),
        t("setup.leads.form.stepNotifications"),
    ];

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> {t("setup.leads.form.newButton")}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <SheetTitle>{t("setup.leads.form.dialogTitle")}</SheetTitle>
                        <span className="text-sm text-gray-500">
                            {t("setup.leads.form.stepLabel", { step: String(step), label: stepLabels[step - 1] })}
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

                <div className="flex-1 p-6 overflow-hidden">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-red-500">{t("setup.leads.form.nameLabel")}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder={t("setup.leads.form.namePlaceholder")}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("setup.leads.form.languageLabel")}</Label>
                                <Select value={formData.language} onValueChange={(v) => updateField("language", v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="english">{t("setup.leads.form.languageEnglish")}</SelectItem>
                                        <SelectItem value="arabic">{t("setup.leads.form.languageArabic")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">{t("setup.leads.form.languageHint")}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("setup.leads.form.titlePrefixLabel")}</Label>
                                <Input
                                    value={formData.titlePrefix}
                                    onChange={(e) => updateField("titlePrefix", e.target.value)}
                                    placeholder={t("setup.leads.form.titlePrefixPlaceholder")}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t("setup.leads.form.submitButtonTextLabel")}</Label>
                                <Input
                                    value={formData.submitButtonText}
                                    onChange={(e) => updateField("submitButtonText", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("setup.leads.form.buttonBgColorLabel")}</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={formData.submitButtonBgColor}
                                            onChange={(e) => updateField("submitButtonBgColor", e.target.value)}
                                            className="h-10 w-16 rounded border cursor-pointer"
                                        />
                                        <span className="text-sm">{formData.submitButtonBgColor}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("setup.leads.form.buttonTextColorLabel")}</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={formData.submitButtonTextColor}
                                            onChange={(e) => updateField("submitButtonTextColor", e.target.value)}
                                            className="h-10 w-16 rounded border cursor-pointer"
                                        />
                                        <span className="text-sm">{formData.submitButtonTextColor}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-sm text-gray-600">{t("setup.leads.form.previewLabel")}</p>
                                <Button
                                    className="mt-2"
                                    style={{
                                        backgroundColor: formData.submitButtonBgColor,
                                        color: formData.submitButtonTextColor,
                                    }}
                                >
                                    {formData.submitButtonText}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label>{t("setup.leads.form.afterSubmissionLabel")}</Label>
                                <RadioGroup
                                    value={formData.successAction}
                                    onValueChange={(v) => updateField("successAction", v)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="message" id="message" />
                                        <Label htmlFor="message" className="font-normal">
                                            {t("setup.leads.form.showThankYou")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="redirect" id="redirect" />
                                        <Label htmlFor="redirect" className="font-normal">
                                            {t("setup.leads.form.redirectToUrl")}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("setup.leads.form.successMessageLabel")}</Label>
                                <Textarea
                                    value={formData.successMessage}
                                    onChange={(e) => updateField("successMessage", e.target.value)}
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="autoPublic"
                                        checked={formData.autoMarkPublic}
                                        onCheckedChange={(c) => updateField("autoMarkPublic", !!c)}
                                    />
                                    <Label htmlFor="autoPublic" className="font-normal">
                                        {t("setup.leads.form.autoMarkPublic")}
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="allowDuplicate"
                                        checked={formData.allowDuplicate}
                                        onCheckedChange={(c) => updateField("allowDuplicate", !!c)}
                                    />
                                    <Label htmlFor="allowDuplicate" className="font-normal">
                                        {t("setup.leads.form.allowDuplicate")}
                                    </Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="notifyImport"
                                    checked={formData.notifyOnImport}
                                    onCheckedChange={(c) => updateField("notifyOnImport", !!c)}
                                />
                                <Label htmlFor="notifyImport" className="font-normal">
                                    {t("setup.leads.form.notifyOnImport")}
                                </Label>
                            </div>
                            <div className="space-y-3 pt-4 border-t">
                                <Label>{t("setup.leads.form.whoToNotify")}</Label>
                                <RadioGroup
                                    value={formData.notifyType}
                                    onValueChange={(v) => updateField("notifyType", v)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="specific" id="specific" />
                                        <Label htmlFor="specific" className="font-normal">
                                            {t("setup.leads.form.notifySpecific")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="roles" id="roles" />
                                        <Label htmlFor="roles" className="font-normal">
                                            {t("setup.leads.form.notifyRoles")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="responsible" id="responsible" />
                                        <Label htmlFor="responsible" className="font-normal">
                                            {t("setup.leads.form.notifyResponsible")}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                    <div>
                        {step > 1 && (
                            <Button variant="outline" onClick={prevStep} className="gap-1">
                                <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        {step < totalSteps ? (
                            <Button onClick={nextStep} className="bg-gray-900 text-white hover:bg-gray-800 gap-1">
                                {t("common.next")} <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSave}
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                disabled={saving}
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("setup.leads.form.createButton")}
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
