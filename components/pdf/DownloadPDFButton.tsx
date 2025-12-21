"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import InvoicePDF from "@/components/pdf/InvoicePDF";
import ProposalPDF from "@/components/pdf/ProposalPDF";

interface DownloadPDFButtonProps {
    type: "invoice" | "proposal";
    data: any;
    orgName?: string;
    orgEmail?: string;
    filename?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export default function DownloadPDFButton({
    type,
    data,
    orgName = "Dosory",
    orgEmail = "support@dosory.com",
    filename,
    variant = "outline",
    size = "default",
    className,
}: DownloadPDFButtonProps) {
    const [generating, setGenerating] = useState(false);

    const handleDownload = async () => {
        setGenerating(true);

        try {
            let doc;
            let defaultFilename;

            if (type === "invoice") {
                doc = (
                    <InvoicePDF
                        invoice={{
                            number: data.number || data.id,
                            status: data.status,
                            createdAt: formatDate(data.createdAt),
                            dueDate: formatDate(data.dueDate),
                            customerName: data.customerName || "Customer",
                            customerEmail: data.customerEmail,
                            customerAddress: data.customerAddress,
                            items: data.items || [],
                            subtotal: data.subtotal || data.total || 0,
                            tax: data.tax || 0,
                            total: data.total || 0,
                            amountPaid: data.amountPaid || 0,
                            amountDue: data.amountDue || data.total || 0,
                            currency: data.currency || "USD",
                            notes: data.notes,
                        }}
                        orgName={orgName}
                        orgEmail={orgEmail}
                    />
                );
                defaultFilename = `Invoice-${data.number || data.id}.pdf`;
            } else {
                const portalUrl = typeof window !== "undefined"
                    ? `${window.location.origin}/portal/${data.id}`
                    : "";

                doc = (
                    <ProposalPDF
                        proposal={{
                            number: data.number || data.id,
                            subject: data.subject || "Proposal",
                            status: data.status,
                            createdAt: formatDate(data.createdAt),
                            openTill: formatDate(data.openTill),
                            customerName: data.customerName || "Customer",
                            customerEmail: data.customerEmail,
                            content: data.content,
                            items: data.items || [],
                            subtotal: data.subtotal || data.total || 0,
                            tax: data.tax || 0,
                            total: data.total || 0,
                            currency: data.currency || "USD",
                            terms: data.terms,
                        }}
                        orgName={orgName}
                        orgEmail={orgEmail}
                        portalUrl={portalUrl}
                    />
                );
                defaultFilename = `Proposal-${data.number || data.id}.pdf`;
            }

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

function formatDate(date: any): string {
    if (!date) return "N/A";

    // Handle Firestore Timestamp
    if (date?.toDate) {
        return date.toDate().toLocaleDateString();
    }

    // Handle string or Date
    try {
        return new Date(date).toLocaleDateString();
    } catch {
        return "N/A";
    }
}
