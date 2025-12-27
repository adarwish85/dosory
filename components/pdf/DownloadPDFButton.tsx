"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import InvoicePDF, { PDFSettings } from "@/components/pdf/InvoicePDF";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { useFormatters } from "@/lib/hooks/use-formatters";

interface DownloadPDFButtonProps {
    type: "invoice";
    data: any;
    filename?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export default function DownloadPDFButton({
    type,
    data,
    filename,
    variant = "outline",
    size = "default",
    className,
}: DownloadPDFButtonProps) {
    const [generating, setGenerating] = useState(false);
    const { settings } = useOrganizationSettings();
    const { formatDate } = useFormatters();

    const handleDownload = async () => {
        setGenerating(true);

        try {
            // Build PDF settings from org settings
            const pdfSettings: PDFSettings = {
                font: settings.pdfFont || "Helvetica",
                fontSize: settings.pdfFontSize || 10,
                tableHeadingColor: settings.pdfTableHeadingColor || "#f5f5f5",
                tableHeadingTextColor: settings.pdfTableHeadingTextColor || "#333333",
                logoUrl: settings.logoLight || undefined,
                showStatus: settings.pdfShowStatus !== false,
                showPageNumber: settings.pdfShowPageNumber === true,
            };

            const doc = (
                <InvoicePDF
                    invoice={{
                        number: data.numberFormatted || data.number || data.id,
                        status: data.status,
                        createdAt: formatDate(data.createdAt || data.date),
                        dueDate: formatDate(data.dueDate),
                        customerName: data.customerName || "Customer",
                        customerEmail: data.customerEmail,
                        customerAddress: data.customerAddress,
                        items: data.items || [],
                        subtotal: data.subtotal || data.total || 0,
                        tax: data.taxTotal || data.tax || 0,
                        total: data.total || 0,
                        amountPaid: data.amountPaid || 0,
                        amountDue: data.amountDue || data.total || 0,
                        currency: data.currency || "USD",
                        notes: data.notes,
                    }}
                    orgName={settings.companyName || "Company"}
                    orgAddress={[settings.address, settings.city, settings.country].filter(Boolean).join(", ")}
                    orgEmail={undefined}
                    pdfSettings={pdfSettings}
                />
            );
            const defaultFilename = `Invoice-${data.numberFormatted || data.number || data.id}.pdf`;

            // Generate PDF blob
            const blob = await pdf(doc).toBlob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || defaultFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={generating}
            className={className}
        >
            {generating ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                </>
            )}
        </Button>
    );
}

