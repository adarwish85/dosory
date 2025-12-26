"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Settings, Plus, ChevronDown, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useInvoices } from "@/lib/hooks/use-invoices";
import type { InvoiceFormData } from "@/lib/schemas";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LineItem {
    id: string; description: string; longDescription?: string; quantity: number; rate: number; tax?: number; taxRate?: number; amount: number;
}

interface InvoiceSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    customerName?: string;
    onSuccess?: () => void;
}

export function InvoiceSheet({ open, onOpenChange, customerId, customerName, onSuccess }: InvoiceSheetProps) {
    const { profile } = useUserProfile();
    const { createInvoice } = useInvoices();

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
    const [currency, setCurrency] = useState("EGP");
    const [discountType, setDiscountType] = useState("No discount");
    const [adminNote, setAdminNote] = useState("");
    const [clientNote, setClientNote] = useState("Thank you for doing business with us");
    const [termsConditions, setTermsConditions] = useState("");
    const [qtyType, setQtyType] = useState<"qty" | "hours" | "qty_hours">("qty");
    const [items, setItems] = useState<LineItem[]>([{ id: "1", description: "", longDescription: "", quantity: 1, rate: 0, amount: 0 }]);
    const [discountValue, setDiscountValue] = useState(0);
    const [discountKind, setDiscountKind] = useState<"percentage" | "fixed">("percentage");
    const [adjustment, setAdjustment] = useState(0);
    const [loading, setLoading] = useState(false);

    // Reset form when opened
    useEffect(() => {
        if (open) {
            setDate(new Date());
            setDueDate(new Date());
            setItems([{ id: "1", description: "", longDescription: "", quantity: 1, rate: 0, amount: 0 }]);
            setDiscountValue(0);
            setAdjustment(0);
            setAdminNote("");
        }
    }, [open]);

    // Handlers
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

    const addItem = () => { setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, rate: 0, amount: 0 }]); };
    const removeItem = (id: string) => { if (items.length > 1) setItems(items.filter((item) => item.id !== id)); };

    // Calculations
    const calculateSubTotal = () => items.reduce((acc, item) => acc + item.amount, 0);
    const calculateDiscountAmount = (subTotal: number) => {
        if (discountType === "No discount") return 0;
        return discountKind === "percentage" ? subTotal * (discountValue / 100) : discountValue;
    };
    const calculateTotal = () => {
        const subTotal = calculateSubTotal();
        return subTotal - calculateDiscountAmount(subTotal) + adjustment;
    };

    const handleSubmit = async (action: "draft" | "send") => {
        if (!profile?.orgId) { toast.error("Not authenticated"); return; }
        if (!date || !dueDate) { toast.error("Please select both Invoice Date and Due Date"); return; }
        if (items.every(i => !i.description.trim())) { toast.error("Please add at least one item"); return; }

        setLoading(true);
        try {
            const lineItems = items.filter(i => i.description.trim()).map(item => ({
                id: item.id, description: item.description, longDescription: item.longDescription,
                quantity: item.quantity, rate: item.rate, amount: item.amount,
                taxRate: item.tax ? parseFloat(String(item.tax)) : 0, unit: "qty"
            }));

            const invoiceData: InvoiceFormData = {
                customerId,
                date, dueDate, currency,
                items: lineItems,
                discount: discountType !== "No discount" ? { type: discountKind, value: discountValue } : undefined,
                notes: clientNote,
                terms: termsConditions,
            };

            await createInvoice(invoiceData);
            toast.success(action === "draft" ? "Draft invoice created" : "Invoice created successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error creating invoice:", error);
            toast.error("Failed to create invoice");
        } finally { setLoading(false); }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-[800px] p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b bg-gray-50">
                    <SheetTitle className="text-lg font-semibold">New Invoice for {customerName || "Customer"}</SheetTitle>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-4">
                    <div className="space-y-6 pb-20">
                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-red-500 font-medium">* Invoice Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "dd/MM/yyyy") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />{dueDate ? format(dueDate, "dd/MM/yyyy") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Currency */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-red-500 font-medium">* Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EGP">EGP</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Type</Label>
                                <Select value={discountType} onValueChange={setDiscountType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="No discount">No discount</SelectItem>
                                        <SelectItem value="Before Tax">Before Tax</SelectItem>
                                        <SelectItem value="After Tax">After Tax</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Line Items</Label>
                                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
                            </div>

                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-2">
                                <div className="col-span-5">Item</div>
                                <div className="col-span-2">Qty</div>
                                <div className="col-span-2">Rate</div>
                                <div className="col-span-2 text-right">Amount</div>
                                <div className="col-span-1"></div>
                            </div>

                            {items.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 bg-gray-50 rounded-md">
                                    <div className="col-span-5 space-y-1">
                                        <Input placeholder="Description" value={item.description} onChange={(e) => handleItemChange(item.id, "description", e.target.value)} className="h-8 text-sm" />
                                        <Textarea placeholder="Details (optional)" value={item.longDescription} onChange={(e) => handleItemChange(item.id, "longDescription", e.target.value)} className="min-h-[40px] text-xs resize-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, "quantity", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                                    </div>
                                    <div className="col-span-2">
                                        <Input type="number" value={item.rate} onChange={(e) => handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                                    </div>
                                    <div className="col-span-2 text-right pt-2 font-medium text-sm">{(item.quantity * item.rate).toFixed(2)}</div>
                                    <div className="col-span-1 flex justify-center">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)} disabled={items.length === 1}><X className="h-4 w-4 text-gray-400" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Sub Total:</span>
                                <span className="font-medium">{currency} {calculateSubTotal().toFixed(2)}</span>
                            </div>
                            {discountType !== "No discount" && (
                                <div className="flex items-center justify-between text-sm">
                                    <span>Discount:</span>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" className="h-7 w-20 text-xs" value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} />
                                        <Select value={discountKind} onValueChange={(v: any) => setDiscountKind(v)}>
                                            <SelectTrigger className="h-7 w-16"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">%</SelectItem>
                                                <SelectItem value="fixed">{currency}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="font-medium text-red-600">-{currency} {calculateDiscountAmount(calculateSubTotal()).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                                <span>Adjustment:</span>
                                <div className="flex items-center gap-2">
                                    <Input type="number" className="h-7 w-24 text-xs" value={adjustment} onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)} />
                                    <span className="font-medium">{currency} {adjustment.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t pt-2">
                                <span>Total:</span>
                                <span>{currency} {calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Client Note</Label>
                                <Textarea value={clientNote} onChange={(e) => setClientNote(e.target.value)} className="min-h-[60px]" />
                            </div>
                            <div className="space-y-2">
                                <Label>Admin Note (Internal)</Label>
                                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="min-h-[60px]" placeholder="Not visible to client" />
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t bg-white flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={loading}>Save as Draft</Button>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={() => handleSubmit("send")} disabled={loading}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Invoice"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
