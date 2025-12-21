"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PayPalButton from "@/components/payments/PayPalButton";
import {
    FileText, Calendar, Building2, CheckCircle,
    AlertTriangle, DollarSign, Mail
} from "lucide-react";

interface Invoice {
    id: string;
    number: string;
    status: string;
    total: number;
    amountPaid: number;
    amountDue: number;
    currency: string;
    dueDate: string;
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    items?: Array<{
        description: string;
        quantity: number;
        rate: number;
        total: number;
    }>;
}

export default function InvoicePaymentPage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.invoiceId as string;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        async function fetchInvoice() {
            try {
                const docRef = doc(db, "invoices", invoiceId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setInvoice({
                        id: docSnap.id,
                        ...data,
                        dueDate: data.dueDate?.toDate?.()?.toISOString() || new Date().toISOString(),
                    } as Invoice);
                } else {
                    setError("Invoice not found");
                }
            } catch (err) {
                console.error("Error fetching invoice:", err);
                setError("Failed to load invoice");
            } finally {
                setLoading(false);
            }
        }

        if (invoiceId) {
            fetchInvoice();
        }
    }, [invoiceId]);

    const handlePaymentSuccess = (details: { amountPaid: number; status: string }) => {
        setPaymentSuccess(true);
        // Update local state
        if (invoice) {
            setInvoice({
                ...invoice,
                amountPaid: invoice.amountPaid + details.amountPaid,
                amountDue: invoice.amountDue - details.amountPaid,
                status: details.status,
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading invoice...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Invoice Not Found</h1>
                        <p className="text-gray-600">{error || "This invoice may have been removed or the link is invalid."}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isPaid = invoice.status === "paid" || invoice.amountDue <= 0;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Success Message */}
                {paymentSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                            <p className="font-medium text-green-800">Payment Successful!</p>
                            <p className="text-sm text-green-700">Thank you for your payment. A receipt has been sent to your email.</p>
                        </div>
                    </div>
                )}

                {/* Invoice Header */}
                <Card className="mb-6">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
                                    <FileText className="h-4 w-4" />
                                    Invoice #{invoice.number}
                                </div>
                                <CardTitle className="text-2xl">
                                    {invoice.currency} {invoice.total.toFixed(2)}
                                </CardTitle>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isPaid
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}>
                                {isPaid ? "Paid" : invoice.status === "partial" ? "Partially Paid" : "Due"}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                            {invoice.customerName && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Building2 className="h-4 w-4" />
                                    {invoice.customerName}
                                </div>
                            )}
                            {invoice.customerEmail && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Mail className="h-4 w-4" />
                                    {invoice.customerEmail}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                Due: {new Date(invoice.dueDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <DollarSign className="h-4 w-4" />
                                Paid: {invoice.currency} {invoice.amountPaid.toFixed(2)}
                            </div>
                        </div>

                        {/* Line Items */}
                        {invoice.items && invoice.items.length > 0 && (
                            <div className="border-t pt-4 mb-6">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500">
                                            <th className="text-left pb-2">Description</th>
                                            <th className="text-right pb-2">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.items.map((item, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="py-2">{item.description}</td>
                                                <td className="text-right py-2">
                                                    {invoice.currency} {item.total.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Amount Due */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-gray-700">Amount Due</span>
                                <span className="text-2xl font-bold text-gray-900">
                                    {invoice.currency} {invoice.amountDue.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* PayPal Button */}
                        {!isPaid && (
                            <PayPalButton
                                invoiceId={invoice.id}
                                amount={invoice.amountDue}
                                currency={invoice.currency}
                                onSuccess={handlePaymentSuccess}
                                onError={(err) => console.error("Payment error:", err)}
                                onCancel={() => console.log("Payment cancelled")}
                            />
                        )}

                        {isPaid && (
                            <div className="bg-green-50 rounded-lg p-4 text-center">
                                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p className="text-green-800 font-medium">This invoice has been paid in full</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm">
                    <p>Questions about this invoice? Contact us at support@dosory.com</p>
                </div>
            </div>
        </div>
    );
}
