"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Printer, Mail, FileText, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Estimate } from "@/lib/types";
import { useEstimates } from "@/lib/hooks/use-sales"; // Assuming useEstimates is exported from there
import { useTranslation } from "@/lib/i18n";

export default function EstimateDetailsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // We can use the hook for actions, but might need direct fetch for initial load if hook lists all
    const { convertToInvoice, markAsSent, markAsAccepted, markAsDeclined } = useEstimates();

    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        async function fetchEstimate() {
            try {
                const docRef = doc(db, "estimates", id);
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    setEstimate({ id: snapshot.id, ...snapshot.data() } as Estimate);
                } else {
                    toast.error(t("sales.estimates.detail.toast.notFound"));
                    router.push("/dashboard/sales/estimates");
                }
            } catch (error) {
                console.error("Error fetching estimate:", error);
                toast.error(t("sales.estimates.detail.toast.loadError"));
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchEstimate();
    }, [id, router]);

    const handleAction = async (action: () => Promise<any>, successMessage: string) => {
        setActionLoading(true);
        try {
            await action();
            toast.success(successMessage);
            // Refresh data
            const docRef = doc(db, "estimates", id);
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                setEstimate({ id: snapshot.id, ...snapshot.data() } as Estimate);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("sales.estimates.detail.toast.actionFailed"));
        } finally {
            setActionLoading(false);
        }
    };

    const handleConvertToInvoice = async () => {
        setActionLoading(true);
        try {
            const invoiceId = await convertToInvoice(id);
            toast.success(t("sales.estimates.detail.toast.converted"));
            router.push(`/dashboard/invoices/${invoiceId}`);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("sales.estimates.detail.toast.conversionFailed"));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div>;
    }

    if (!estimate) return null;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/sales/estimates">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold ml-2">{estimate.number || t("sales.estimates.detail.draftTitle")}</h1>
                        <p className="text-sm text-gray-500 ml-2">{estimate.customerName}</p>
                    </div>
                    <span className={`capitalize px-3 py-1 rounded-full text-xs font-medium border ml-2 ${estimate.status === 'accepted' ? 'bg-green-100 text-green-700 border-green-200' :
                        estimate.status === 'declined' ? 'bg-red-100 text-red-700 border-red-200' :
                            estimate.status === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-gray-100 text-gray-700'
                        }`}>
                        {estimate.status}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" /> {t("sales.estimates.detail.print")}</Button>
                    <Button variant="outline" size="sm" onClick={() => handleAction(() => markAsSent(id), t("sales.estimates.detail.toast.markedSent"))} disabled={actionLoading || estimate.status !== 'draft'}>
                        <Mail className="mr-2 h-4 w-4" /> {t("sales.estimates.detail.markSent")}
                    </Button>

                    {estimate.status !== 'accepted' && estimate.status !== 'declined' && (
                        <>
                            <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700" onClick={() => handleAction(() => markAsAccepted(id), t("sales.estimates.detail.toast.accepted"))} disabled={actionLoading}>
                                <CheckCircle className="mr-2 h-4 w-4" /> {t("sales.estimates.detail.accept")}
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleAction(() => markAsDeclined(id), t("sales.estimates.detail.toast.declined"))} disabled={actionLoading}>
                                <XCircle className="mr-2 h-4 w-4" /> {t("sales.estimates.detail.decline")}
                            </Button>
                        </>
                    )}

                    {estimate.status === 'accepted' && !estimate.convertedToInvoiceId && (
                        <Button size="sm" onClick={handleConvertToInvoice} disabled={actionLoading}>
                            <FileText className="mr-2 h-4 w-4" /> {t("sales.estimates.detail.convertToInvoice")}
                        </Button>
                    )}
                    {estimate.convertedToInvoiceId && (
                        <Link href={`/dashboard/invoices/${estimate.convertedToInvoiceId}`}>
                            <Button variant="secondary" size="sm">
                                {t("sales.estimates.detail.viewInvoice")}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t("sales.estimates.detail.detailsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">

                            <div>
                                <p className="text-gray-500">{t("common.date")}</p>
                                <p className="font-medium">
                                    {estimate.date ? new Date(estimate.date.seconds * 1000).toLocaleDateString() : t("common.notAvailable")}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500">{t("sales.estimates.detail.expiryDate")}</p>
                                <p className="font-medium">
                                    {estimate.expiryDate ? new Date(estimate.expiryDate.seconds * 1000).toLocaleDateString() : t("common.notAvailable")}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="font-semibold mb-4">{t("sales.estimates.detail.itemsTitle")}</h3>
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">{t("sales.estimates.detail.itemDescription")}</th>
                                            <th className="px-4 py-3 text-right">{t("sales.estimates.detail.qty")}</th>
                                            <th className="px-4 py-3 text-right">{t("sales.estimates.detail.rate")}</th>
                                            <th className="px-4 py-3 text-right">{t("common.amount")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {estimate.items?.map((item: any, i: number) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3">{item.description}</td>
                                                <td className="px-4 py-3 text-right">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">{item.rate?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{(item.quantity * item.rate).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <div className="text-right space-y-2">
                                <div className="flex justify-between w-48 text-sm">
                                    <span className="text-gray-500">{t("sales.estimates.detail.subtotalLabel")}</span>
                                    <span>{estimate.subtotal?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between w-48 font-bold text-lg">
                                    <span>{t("sales.estimates.detail.totalLabel")}</span>
                                    <span>{estimate.total?.toFixed(2)} {estimate.currency}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("sales.estimates.detail.customer")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/dashboard/customers/${estimate.customerId}`} className="text-blue-600 hover:underline font-medium">
                                {estimate.customerName}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">{t("sales.estimates.detail.idLabel", { id: estimate.customerId })}</p>
                        </CardContent>
                    </Card>

                    {(estimate.notes || estimate.terms) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t("sales.estimates.detail.notesTermsTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {estimate.notes && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">{t("sales.estimates.detail.notes")}</p>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{estimate.notes}</p>
                                    </div>
                                )}
                                {estimate.terms && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">{t("sales.estimates.detail.terms")}</p>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{estimate.terms}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
