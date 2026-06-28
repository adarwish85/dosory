"use client";

import { useLead } from "@/components/dashboard/leads/lead-context";
import { Button } from "@/components/ui/button";
import { EditDealDialog } from "@/components/dashboard/leads/edit-deal-dialog";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Briefcase, Calendar as CalendarIcon, DollarSign, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function LeadDealPage() {
    const { lead, loading, leadId } = useLead();
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("leads.deal.loading")}
            </div>
        );
    }

    if (!lead || !leadId) {
        return <div className="p-8 text-gray-500">{t("leads.deal.notFound")}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t("leads.deal.title")}</h1>
                <EditDealDialog lead={lead} trigger={<Button>{lead.deal ? t("leads.deal.editDeal") : t("leads.deal.addDeal")}</Button>} />
            </div>

            <div className="p-6 border rounded-lg bg-white">
                {lead.deal ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 bg-gray-50 rounded-md border">
                                <div className="text-sm text-gray-500 mb-1">{t("leads.deal.subject")}</div>
                                <div className="font-medium text-lg">{lead.deal.subject}</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-md border">
                                <div className="text-sm text-gray-500 mb-1">{t("leads.deal.value")}</div>
                                <div className="font-medium text-lg flex items-center">
                                    <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                                    {(lead.deal.products && lead.deal.products.length > 0
                                        ? lead.deal.products.reduce(
                                              (sum: number, p: { amount?: number }) => sum + (p.amount || 0),
                                              0
                                          )
                                        : lead.deal.value || 0
                                    ).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-md border">
                                <div className="text-sm text-gray-500 mb-1">{t("leads.deal.expectedClose")}</div>
                                <div className="font-medium text-lg flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                    {lead.deal.expectedCloseDate
                                        ? format(
                                              lead.deal.expectedCloseDate instanceof Timestamp
                                                  ? lead.deal.expectedCloseDate.toDate()
                                                  : lead.deal.expectedCloseDate,
                                              "PPP"
                                          )
                                        : t("leads.deal.notSet")}
                                </div>
                            </div>
                        </div>

                        {lead.deal.description && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">{t("leads.deal.description")}</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border whitespace-pre-wrap">
                                    {lead.deal.description}
                                </p>
                            </div>
                        )}

                        {lead.deal.products && lead.deal.products.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">{t("leads.deal.productsServices")}</h4>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="py-2 px-3 text-left font-medium text-gray-500">{t("leads.deal.table.item")}</th>
                                                <th className="py-2 px-3 text-right font-medium text-gray-500">{t("leads.deal.table.qty")}</th>
                                                <th className="py-2 px-3 text-right font-medium text-gray-500">{t("leads.deal.table.rate")}</th>
                                                <th className="py-2 px-3 text-right font-medium text-gray-500">
                                                    {t("leads.deal.table.amount")}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {lead.deal.products.map(
                                                (
                                                    item: {
                                                        description: string;
                                                        quantity: number;
                                                        rate: number;
                                                        amount: number;
                                                    },
                                                    idx: number
                                                ) => (
                                                    <tr key={idx} className="bg-white">
                                                        <td className="py-2 px-3">{item.description}</td>
                                                        <td className="py-2 px-3 text-right">{item.quantity}</td>
                                                        <td className="py-2 px-3 text-right">
                                                            {item.rate?.toFixed(2)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-medium">
                                                            {item.amount?.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-md border border-dashed">
                        <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">{t("leads.deal.empty.title")}</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                            {t("leads.deal.empty.description")}
                        </p>
                        <EditDealDialog lead={lead} trigger={<Button>{t("leads.deal.addDeal")}</Button>} />
                    </div>
                )}
            </div>
        </div>
    );
}
