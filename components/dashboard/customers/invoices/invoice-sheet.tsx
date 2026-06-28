"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, Plus, X, Check, Settings } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useInvoices } from "@/lib/hooks/use-invoices";
import type { InvoiceFormData } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

interface LineItem {
    id: string;
    description: string;
    longDescription?: string;
    quantity: number;
    rate: number;
    amount: number;
}

interface InvoiceWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    customerName?: string;
    invoiceId?: string; // If provided, edit/view mode
    mode?: "create" | "view" | "edit";
    onSuccess?: () => void;
}

type WizardStep = 1 | 2 | 3;

// Step indicator component
function StepIndicator({
    currentStep,
    onStepClick,
}: {
    currentStep: WizardStep;
    onStepClick: (step: WizardStep) => void;
}) {
    const { t } = useTranslation();
    const steps = [
        { step: 1 as WizardStep, label: t("customers.invoice.stepDetails") },
        { step: 2 as WizardStep, label: t("customers.invoice.stepItems") },
        { step: 3 as WizardStep, label: t("customers.invoice.stepFinalize") },
    ];
    return (
        <div className="flex items-center justify-center gap-2 py-4 border-b bg-gray-50">
            {steps.map((s, i) => (
                <div key={s.step} className="flex items-center">
                    <button
                        onClick={() => onStepClick(s.step)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                            currentStep === s.step
                                ? "bg-gray-900 text-white"
                                : currentStep > s.step
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                        )}
                    >
                        {currentStep > s.step ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <span className="h-5 w-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                                {s.step}
                            </span>
                        )}
                        {s.label}
                    </button>
                    {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300 mx-2" />}
                </div>
            ))}
        </div>
    );
}

export function InvoiceWizard({
    open,
    onOpenChange,
    customerId,
    customerName,
    invoiceId,
    mode = "create",
    onSuccess,
}: InvoiceWizardProps) {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const { createInvoice, updateInvoice } = useInvoices();

    const [currentStep, setCurrentStep] = useState<WizardStep>(1);
    const [loading, setLoading] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

    // Step 1: Metadata
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
    const [currency, setCurrency] = useState("EGP");
    const [discountType, setDiscountType] = useState("No discount");
    const [discountValue, setDiscountValue] = useState(0);
    const [discountKind, setDiscountKind] = useState<"percentage" | "fixed">("percentage");
    const [tags, setTags] = useState("");
    const [paymentModes, setPaymentModes] = useState("Bank, PayPal");

    // Step 2: Line Items
    const [items, setItems] = useState<LineItem[]>([
        { id: "1", description: "", longDescription: "", quantity: 1, rate: 0, amount: 0 },
    ]);
    const [adjustment, setAdjustment] = useState(0);

    // Step 3: Notes
    const [clientNote, setClientNote] = useState(t("customers.invoice.defaultClientNote"));
    const [adminNote, setAdminNote] = useState("");
    const [termsConditions, setTermsConditions] = useState("");

    // Load existing invoice for edit/view mode
    useEffect(() => {
        if (!open) {
            // Reset on close
            setCurrentStep(1);
            return;
        }
        if (invoiceId && (mode === "edit" || mode === "view")) {
            setLoadingInvoice(true);
            getDoc(doc(db, "invoices", invoiceId))
                .then((snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setInvoiceNumber(data.number ? `INV-${String(data.number).padStart(6, "0")}` : "");
                        setDate(data.date?.toDate?.() || new Date());
                        setDueDate(data.dueDate?.toDate?.() || new Date());
                        setCurrency(data.currency || "EGP");
                        setItems(
                            data.items?.length
                                ? data.items.map((i: any, idx: number) => ({ ...i, id: String(idx) }))
                                : [{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }]
                        );
                        setClientNote(data.notes || "");
                        setTermsConditions(data.terms || "");
                        setAdjustment(data.adjustment || 0);
                        if (data.discount) {
                            setDiscountType("Before Tax");
                            setDiscountKind(data.discount.type || "percentage");
                            setDiscountValue(data.discount.value || 0);
                        }
                    }
                    setLoadingInvoice(false);
                })
                .catch(() => setLoadingInvoice(false));
        } else {
            // Reset for create
            setInvoiceNumber(t("customers.invoice.autoGenerated"));
            setDate(new Date());
            setDueDate(new Date());
            setCurrency("EGP");
            setDiscountType("No discount");
            setItems([{ id: "1", description: "", longDescription: "", quantity: 1, rate: 0, amount: 0 }]);
            setClientNote(t("customers.invoice.defaultClientNote"));
            setAdminNote("");
            setAdjustment(0);
        }
    }, [open, invoiceId, mode, t]);

    // Item handlers
    const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    updated.amount = updated.quantity * updated.rate;
                    return updated;
                }
                return item;
            })
        );
    };
    const addItem = () =>
        setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, rate: 0, amount: 0 }]);
    const removeItem = (id: string) => {
        if (items.length > 1) setItems(items.filter((i) => i.id !== id));
    };

    // Calculations
    const subTotal = items.reduce((acc, item) => acc + item.amount, 0);
    const discountAmount =
        discountType === "No discount"
            ? 0
            : discountKind === "percentage"
              ? subTotal * (discountValue / 100)
              : discountValue;
    const total = subTotal - discountAmount + adjustment;

    // Navigation
    const nextStep = () => {
        if (currentStep < 3) setCurrentStep((currentStep + 1) as WizardStep);
    };
    const prevStep = () => {
        if (currentStep > 1) setCurrentStep((currentStep - 1) as WizardStep);
    };

    // Submit
    const handleSubmit = async (action: "draft" | "save") => {
        if (!profile?.orgId) {
            toast.error(t("customers.invoice.notAuthenticated"));
            return;
        }
        if (!date || !dueDate) {
            toast.error(t("customers.invoice.selectDates"));
            return;
        }
        if (items.every((i) => !i.description.trim())) {
            toast.error(t("customers.invoice.addItem"));
            return;
        }

        setLoading(true);
        try {
            const lineItems = items
                .filter((i) => i.description.trim())
                .map((item) => ({
                    id: item.id,
                    description: item.description,
                    longDescription: item.longDescription,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount,
                    taxRate: 0,
                    unit: "qty",
                }));

            const invoiceData: InvoiceFormData = {
                customerId,
                date,
                dueDate,
                currency,
                items: lineItems,
                discount: discountType !== "No discount" ? { type: discountKind, value: discountValue } : undefined,
                notes: clientNote,
                terms: termsConditions,
                tags: tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
            };

            if (mode === "edit" && invoiceId) {
                await updateInvoice(invoiceId, invoiceData);
                toast.success(t("customers.invoice.updatedToast"));
            } else {
                await createInvoice(invoiceData);
                toast.success(action === "draft" ? t("customers.invoice.draftSavedToast") : t("customers.invoice.createdToast"));
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error:", error);
            toast.error(t("customers.invoice.saveError"));
        } finally {
            setLoading(false);
        }
    };

    const isViewOnly = mode === "view";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-[700px] p-0 flex flex-col">
                <SheetHeader className="px-6 py-3 border-b">
                    <SheetTitle className="text-lg font-semibold flex items-center gap-2">
                        {mode === "create" ? t("customers.invoice.newInvoice") : mode === "edit" ? t("customers.invoice.editInvoice") : t("customers.invoice.viewInvoice")}
                        {customerName && <Badge variant="secondary">{customerName}</Badge>}
                    </SheetTitle>
                </SheetHeader>

                <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

                {loadingInvoice ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 px-6 py-6 overflow-hidden">
                        {/* Step 1: Details */}
                        {currentStep === 1 && (
                            <div className="space-y-5 h-full">
                                <div className="space-y-2">
                                    <Label>{t("customers.invoice.invoiceNumber")}</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-100 border px-3 py-2 rounded-md text-sm text-gray-500">
                                            INV-
                                        </div>
                                        <Input
                                            disabled
                                            value={invoiceNumber.replace(/^INV-/, "") || t("customers.invoice.autoGenerated")}
                                            className="bg-gray-50"
                                        />
                                        <Settings className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-red-500 font-medium">* {t("customers.invoice.invoiceDate")}</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start",
                                                        !date && "text-muted-foreground"
                                                    )}
                                                    disabled={isViewOnly}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date ? format(date, "dd/MM/yyyy") : t("customers.invoice.pickDate")}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={date} onSelect={setDate} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-red-500 font-medium">* {t("customers.invoice.dueDate")}</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start",
                                                        !dueDate && "text-muted-foreground"
                                                    )}
                                                    disabled={isViewOnly}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {dueDate ? format(dueDate, "dd/MM/yyyy") : t("customers.invoice.pickDate")}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-red-500 font-medium">* {t("customers.field.currency")}</Label>
                                        <Select value={currency} onValueChange={setCurrency} disabled={isViewOnly}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EGP">EGP</SelectItem>
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="EUR">EUR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("customers.invoice.discountType")}</Label>
                                        <Select
                                            value={discountType}
                                            onValueChange={setDiscountType}
                                            disabled={isViewOnly}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="No discount">{t("customers.invoice.discountNone")}</SelectItem>
                                                <SelectItem value="Before Tax">{t("customers.invoice.discountBeforeTax")}</SelectItem>
                                                <SelectItem value="After Tax">{t("customers.invoice.discountAfterTax")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("customers.invoice.paymentMethods")}</Label>
                                    <Input
                                        value={paymentModes}
                                        onChange={(e) => setPaymentModes(e.target.value)}
                                        disabled={isViewOnly}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("customers.invoice.tags")}</Label>
                                    <Input
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder={t("customers.invoice.commaSeparated")}
                                        disabled={isViewOnly}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Line Items */}
                        {currentStep === 2 && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">{t("customers.invoice.lineItems")}</Label>
                                    {!isViewOnly && (
                                        <Button size="sm" variant="outline" onClick={addItem}>
                                            <Plus className="h-4 w-4 mr-1" />
                                            {t("customers.invoice.addItemButton")}
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                                    <div className="col-span-5">{t("customers.invoice.item")}</div>
                                    <div className="col-span-2 text-center">{t("customers.invoice.qty")}</div>
                                    <div className="col-span-2 text-center">{t("customers.invoice.rate")}</div>
                                    <div className="col-span-2 text-right">{t("customers.invoice.amount")}</div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="flex-1 space-y-2 max-h-[200px] overflow-y-auto">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-md"
                                        >
                                            <div className="col-span-5">
                                                <Input
                                                    placeholder={t("common.description")}
                                                    value={item.description}
                                                    onChange={(e) =>
                                                        handleItemChange(item.id, "description", e.target.value)
                                                    }
                                                    className="h-9 text-sm"
                                                    disabled={isViewOnly}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        handleItemChange(
                                                            item.id,
                                                            "quantity",
                                                            parseFloat(e.target.value) || 0
                                                        )
                                                    }
                                                    className="h-9 text-sm text-center"
                                                    disabled={isViewOnly}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) =>
                                                        handleItemChange(
                                                            item.id,
                                                            "rate",
                                                            parseFloat(e.target.value) || 0
                                                        )
                                                    }
                                                    className="h-9 text-sm text-center"
                                                    disabled={isViewOnly}
                                                />
                                            </div>
                                            <div className="col-span-2 text-right font-medium text-sm pr-2">
                                                {item.amount.toFixed(2)}
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                {!isViewOnly && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length === 1}
                                                    >
                                                        <X className="h-4 w-4 text-gray-400" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{t("customers.invoice.subTotal")}</span>
                                        <span className="font-medium">
                                            {currency} {subTotal.toFixed(2)}
                                        </span>
                                    </div>
                                    {discountType !== "No discount" && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span>{t("customers.invoice.discount")}</span>
                                            <div className="flex items-center gap-2">
                                                {!isViewOnly && (
                                                    <>
                                                        <Input
                                                            type="number"
                                                            className="h-7 w-16 text-xs"
                                                            value={discountValue}
                                                            onChange={(e) =>
                                                                setDiscountValue(parseFloat(e.target.value) || 0)
                                                            }
                                                        />
                                                        <Select
                                                            value={discountKind}
                                                            onValueChange={(v: any) => setDiscountKind(v)}
                                                        >
                                                            <SelectTrigger className="h-7 w-14">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="percentage">%</SelectItem>
                                                                <SelectItem value="fixed">{currency}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </>
                                                )}
                                                <span className="font-medium text-red-600">
                                                    -{currency} {discountAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span>{t("customers.invoice.adjustment")}</span>
                                        <div className="flex items-center gap-2">
                                            {!isViewOnly && (
                                                <Input
                                                    type="number"
                                                    className="h-7 w-20 text-xs"
                                                    value={adjustment}
                                                    onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                                                />
                                            )}
                                            <span className="font-medium">
                                                {currency} {adjustment.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                                        <span>{t("customers.invoice.totalLabel")}</span>
                                        <span>
                                            {currency} {total.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Notes & Finalize */}
                        {currentStep === 3 && (
                            <div className="space-y-5 h-full">
                                <div className="space-y-2">
                                    <Label>{t("customers.invoice.clientNote")}</Label>
                                    <Textarea
                                        value={clientNote}
                                        onChange={(e) => setClientNote(e.target.value)}
                                        className="min-h-[80px]"
                                        placeholder={t("customers.invoice.visibleToClient")}
                                        disabled={isViewOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("customers.invoice.adminNote")}</Label>
                                    <Textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        className="min-h-[80px]"
                                        placeholder={t("customers.invoice.notVisibleToClient")}
                                        disabled={isViewOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("customers.invoice.termsConditions")}</Label>
                                    <Textarea
                                        value={termsConditions}
                                        onChange={(e) => setTermsConditions(e.target.value)}
                                        className="min-h-[80px]"
                                        disabled={isViewOnly}
                                    />
                                </div>

                                {/* Summary */}
                                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                                    <h4 className="font-semibold mb-2">{t("customers.invoice.summary")}</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">{t("customers.invoice.summaryDate")}</span>{" "}
                                            {date ? format(date, "dd/MM/yyyy") : "-"}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">{t("customers.invoice.summaryDue")}</span>{" "}
                                            {dueDate ? format(dueDate, "dd/MM/yyyy") : "-"}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">{t("customers.invoice.summaryItems")}</span>{" "}
                                            {items.filter((i) => i.description).length}
                                        </div>
                                        <div>
                                            <span className="text-gray-500">{t("customers.invoice.summaryTotal")}</span>{" "}
                                            <strong>
                                                {currency} {total.toFixed(2)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Navigation */}
                <div className="px-6 py-4 border-t bg-white flex justify-between">
                    <div>
                        {currentStep > 1 && (
                            <Button variant="outline" onClick={prevStep}>
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t("customers.invoice.back")}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t("common.cancel")}
                        </Button>
                        {currentStep < 3 ? (
                            <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={nextStep}>
                                {t("customers.invoice.next")}
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        ) : !isViewOnly ? (
                            <>
                                <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={loading}>
                                    {t("customers.invoice.saveAsDraft")}
                                </Button>
                                <Button
                                    className="bg-gray-900 text-white hover:bg-gray-800"
                                    onClick={() => handleSubmit("save")}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t("customers.invoice.saving")}
                                        </>
                                    ) : mode === "edit" ? (
                                        t("customers.invoice.updateInvoice")
                                    ) : (
                                        t("customers.invoice.createInvoice")
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={() => onOpenChange(false)}
                            >
                                {t("common.close")}
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
