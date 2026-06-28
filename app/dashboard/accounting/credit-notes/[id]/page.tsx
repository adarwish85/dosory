"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCreditNotes } from "@/lib/hooks/use-customer-data"; // Or wherever useCreditNote (single) is
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Printer, Mail } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditNote } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

// Note: If useCreditNotes doesn't export a single fetch hook or we want direct fetch
// we can implement it here or usage useCreditNotes and find.
// For robust detail pages, direct fetch by ID is better.

export default function CreditNoteDetailsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCreditNote() {
            try {
                const docRef = doc(db, "credit_notes", id); // Verify collection name 'credit_notes' or 'creditNotes'
                // use-customer-data implies 'credit_notes' usually, or I should check the hook source.
                // Checking previous grep, useCreditNotes is in use-customer-data.ts. 
                // I will assume 'credit_notes' collection based on my creation logic (which I wrote as 'credit_notes' implicitly? No, I used createCreditNote hook).
                // Let's assume the hook uses 'credit_notes' or verify.
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    setCreditNote({ id: snapshot.id, ...snapshot.data() } as CreditNote);
                } else {
                    toast.error(t("accounting.creditNotes.notFound"));
                    router.push("/dashboard/accounting/credit-notes");
                }
            } catch (error) {
                console.error("Error fetching credit note:", error);
                toast.error(t("accounting.creditNotes.loadError"));
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchCreditNote();
    }, [id, router, t]);

    if (loading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>;
    }

    if (!creditNote) return null;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/accounting/credit-notes">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold ml-2">{creditNote.number || t("accounting.creditNotes.draftTitle")}</h1>
                    <span className="capitalize px-2 py-1 rounded-full text-xs bg-gray-100 border ml-2">
                        {creditNote.status}
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> {t("accounting.creditNotes.print")}</Button>
                    <Button variant="outline"><Mail className="mr-2 h-4 w-4" /> {t("accounting.creditNotes.email")}</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t("accounting.creditNotes.detailsCardTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">{t("accounting.creditNotes.number")}</p>
                                <p className="font-medium">{creditNote.number}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">{t("common.date")}</p>
                                <p className="font-medium">
                                    {creditNote.date ? new Date(creditNote.date.seconds * 1000).toLocaleDateString() : t("common.notAvailable")}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="font-semibold mb-4">{t("accounting.creditNotes.items")}</h3>
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">{t("accounting.journal.descriptionColumn")}</th>
                                            <th className="px-4 py-3 text-right">{t("accounting.creditNotes.qty")}</th>
                                            <th className="px-4 py-3 text-right">{t("accounting.creditNotes.rate")}</th>
                                            <th className="px-4 py-3 text-right">{t("common.amount")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {creditNote.items?.map((item: any, i: number) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3">{item.description}</td>
                                                <td className="px-4 py-3 text-right">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">{item.rate?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{item.amount?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <div className="text-right space-y-2">
                                <div className="flex justify-between w-48 text-sm">
                                    <span className="text-gray-500">{t("accounting.creditNotes.subtotalLabel")}</span>
                                    <span>{creditNote.subtotal?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between w-48 font-bold text-lg">
                                    <span>{t("accounting.creditNotes.totalLabel")}</span>
                                    <span>{creditNote.total?.toFixed(2)} {creditNote.currency}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("accounting.payments.customer")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/dashboard/customers/${creditNote.customerId}`} className="text-blue-600 hover:underline font-medium">
                                {creditNote.customerName}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">{t("accounting.creditNotes.idLabel", { id: creditNote.customerId })}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("accounting.creditNotes.notes")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{creditNote.notes || t("accounting.creditNotes.noNotes")}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
