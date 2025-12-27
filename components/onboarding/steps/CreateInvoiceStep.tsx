"use client";

import React, { useState } from "react";
import { Receipt, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWizard } from "../OnboardingWizard";
import { useAuth } from "@/components/auth-provider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

export default function CreateInvoiceStep() {
    const { goNext, useDummyData, createdCustomerId, setCreatedInvoiceId } = useWizard();
    const { user } = useAuth();
    const orgId = (user as any)?.orgId;

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: "", quantity: 1, unitPrice: 0 }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill with dummy data if selected
    React.useEffect(() => {
        if (useDummyData) {
            setLineItems([
                { description: "Website Design & Development", quantity: 1, unitPrice: 2500 },
                { description: "Monthly Hosting (12 months)", quantity: 12, unitPrice: 29.99 },
            ]);
        }
    }, [useDummyData]);

    const addLineItem = () => {
        setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter((_, i) => i !== index));
        }
    };

    const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: value };
        setLineItems(updated);
    };

    const calculateTotal = () => {
        return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleSave = async () => {
        if (!orgId || lineItems.length === 0) return;

        setIsSaving(true);
        try {
            // Generate invoice number
            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

            // Create invoice in Firestore
            const invoiceRef = await addDoc(collection(db, "invoices"), {
                invoiceNumber,
                customerId: createdCustomerId || null,
                orgId,
                status: "draft",
                lineItems: lineItems.map(item => ({
                    ...item,
                    total: item.quantity * item.unitPrice,
                })),
                subtotal: calculateTotal(),
                tax: 0,
                total: calculateTotal(),
                isOnboardingDemo: useDummyData,
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            });

            setCreatedInvoiceId(invoiceRef.id);
            goNext();
        } catch (error) {
            console.error("Error creating invoice:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Receipt className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Create Your First Invoice</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Add line items to your invoice
                </p>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-right">Price</div>
                    <div className="col-span-1"></div>
                </div>

                {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                            className="col-span-6"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, "description", e.target.value)}
                            placeholder="Item description"
                        />
                        <Input
                            className="col-span-2 text-center"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 1)}
                        />
                        <Input
                            className="col-span-3 text-right"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="col-span-1 h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length === 1}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    className="gap-1 text-gray-600"
                >
                    <Plus className="h-4 w-4" />
                    Add Line Item
                </Button>
            </div>

            {/* Total */}
            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                <span className="text-sm text-gray-500">Total:</span>
                <span className="text-2xl font-bold text-gray-900">
                    ${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || lineItems.every(i => !i.description)}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            Create Invoice
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
