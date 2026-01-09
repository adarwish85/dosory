"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: "Helvetica",
        fontSize: 11,
        lineHeight: 1.5,
    },
    header: {
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    metaGrid: {
        flexDirection: "row",
        marginBottom: 30,
        gap: 40,
    },
    metaColumn: {
        flex: 1,
    },
    label: {
        fontSize: 9,
        color: "#666",
        textTransform: "uppercase",
        marginBottom: 2,
    },
    value: {
        fontSize: 11,
        color: "#000",
        fontWeight: "bold",
        marginBottom: 10,
    },
    content: {
        marginBottom: 40,
        textAlign: "justify",
    },
    signatures: {
        marginTop: 50,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 40,
    },
    signatureBlock: {
        flex: 1,
        borderTopWidth: 1,
        borderTopColor: "#000",
        paddingTop: 10,
    },
    signatureLabel: {
        fontSize: 10,
        fontWeight: "bold",
        marginBottom: 4,
    },
    signatureText: {
        fontSize: 10,
        color: "#666",
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center",
        fontSize: 8,
        color: "#999",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 10,
    },
});

type FirestoreDate = Date | { toDate: () => Date } | string | number | null | undefined;

interface ContractPDFProps {
    contract: {
        id: string;
        subject: string;
        customerName: string;
        contractValue?: number;
        startDate: FirestoreDate;
        endDate?: FirestoreDate;
        status: string;
        content?: string; // HTML content - Note: PDF renderer has limited HTML support
        description?: string;
        orgName?: string;
    };
    signedDate?: string;
}

// Simple HTML Stripper for basic text rendering if HTML is passed
const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isFirestoreTimestamp = (date: any): date is { toDate: () => Date } => {
    return date && typeof date === "object" && typeof date.toDate === "function";
};

export default function ContractPDF({ contract, signedDate }: ContractPDFProps) {
    const formatDate = (date: FirestoreDate) => {
        if (!date) return "-";
        try {
            if (isFirestoreTimestamp(date)) {
                return format(date.toDate(), "PPP");
            }
            if (date instanceof Date) return format(date, "PPP");
            return format(new Date(date), "PPP");
        } catch {
            return "-";
        }
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{contract.subject}</Text>
                    <Text style={styles.subtitle}>Contract Agreement</Text>
                </View>

                {/* Meta Data */}
                <View style={styles.metaGrid}>
                    <View style={styles.metaColumn}>
                        <Text style={styles.label}>Client</Text>
                        <Text style={styles.value}>{contract.customerName}</Text>

                        <Text style={styles.label}>Contract Value</Text>
                        <Text style={styles.value}>
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                                contract.contractValue || 0
                            )}
                        </Text>
                    </View>
                    <View style={styles.metaColumn}>
                        <Text style={styles.label}>Start Date</Text>
                        <Text style={styles.value}>{formatDate(contract.startDate)}</Text>

                        <Text style={styles.label}>End Date</Text>
                        <Text style={styles.value}>{formatDate(contract.endDate)}</Text>
                    </View>
                    <View style={styles.metaColumn}>
                        <Text style={styles.label}>Status</Text>
                        <Text style={styles.value}>{contract.status.toUpperCase()}</Text>
                    </View>
                </View>

                {/* Content Body */}
                <View style={styles.content}>
                    {/* 
                        Note: React-PDF does not support full HTML rendering. 
                        We typically use a parser or render plain text. 
                        For now, we render description and stripped content.
                    */}
                    {contract.description && <Text style={{ marginBottom: 10 }}>{contract.description}</Text>}

                    <Text>{stripHtml(contract.content || "")}</Text>
                </View>

                {/* Signatures */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBlock}>
                        <Text style={styles.signatureLabel}>Signed by {contract.orgName || "Organization"}</Text>
                        <Text style={styles.signatureText}>Date: {signedDate || "_________________"}</Text>
                        {contract.status === "signed" && (
                            <Text style={{ color: "green", fontSize: 8, marginTop: 4 }}>[Digitally Signed by Org]</Text>
                        )}
                    </View>
                    <View style={styles.signatureBlock}>
                        <Text style={styles.signatureLabel}>Signed by {contract.customerName}</Text>
                        <Text style={styles.signatureText}>Date: {signedDate || "_________________"}</Text>
                        {contract.status === "signed" && (
                            <Text style={{ color: "green", fontSize: 8, marginTop: 4 }}>
                                [Digitally Signed by Client]
                            </Text>
                        )}
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {contract.subject} • {contract.id}
                </Text>
            </Page>
        </Document>
    );
}
