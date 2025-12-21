"use client";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";

// Register fonts (optional - uses default sans-serif)
// Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
    },
    logo: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0A66C2",
    },
    invoiceTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
    invoiceNumber: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: "row",
        marginBottom: 4,
    },
    label: {
        width: 100,
        color: "#666",
    },
    value: {
        flex: 1,
        color: "#1a1a1a",
    },
    table: {
        marginTop: 20,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f5f5f5",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    tableHeaderCell: {
        fontWeight: "bold",
        color: "#333",
    },
    tableRow: {
        flexDirection: "row",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    tableCell: {
        color: "#1a1a1a",
    },
    descriptionCol: { width: "50%" },
    qtyCol: { width: "15%", textAlign: "right" },
    rateCol: { width: "15%", textAlign: "right" },
    totalCol: { width: "20%", textAlign: "right" },
    totalsSection: {
        marginTop: 20,
        alignItems: "flex-end",
    },
    totalsRow: {
        flexDirection: "row",
        paddingVertical: 4,
        width: 200,
    },
    totalsLabel: {
        flex: 1,
        color: "#666",
    },
    totalsValue: {
        width: 80,
        textAlign: "right",
        color: "#1a1a1a",
    },
    grandTotal: {
        flexDirection: "row",
        paddingVertical: 8,
        marginTop: 8,
        borderTopWidth: 2,
        borderTopColor: "#333",
        width: 200,
    },
    grandTotalLabel: {
        flex: 1,
        fontWeight: "bold",
        fontSize: 12,
        color: "#1a1a1a",
    },
    grandTotalValue: {
        width: 80,
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 12,
        color: "#0A66C2",
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
    },
    paidBadge: {
        backgroundColor: "#dcfce7",
        color: "#166534",
    },
    pendingBadge: {
        backgroundColor: "#fef3c7",
        color: "#92400e",
    },
    footer: {
        position: "absolute",
        bottom: 40,
        left: 40,
        right: 40,
        textAlign: "center",
        color: "#999",
        fontSize: 9,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 20,
    },
    notes: {
        marginTop: 30,
        padding: 15,
        backgroundColor: "#f9f9f9",
        borderRadius: 4,
    },
    notesTitle: {
        fontWeight: "bold",
        marginBottom: 8,
        color: "#333",
    },
    notesText: {
        color: "#666",
        lineHeight: 1.5,
    },
});

interface InvoiceItem {
    description: string;
    quantity: number;
    rate: number;
    total: number;
}

interface InvoicePDFProps {
    invoice: {
        number: string;
        status: string;
        createdAt: string;
        dueDate: string;
        customerName: string;
        customerEmail?: string;
        customerAddress?: string;
        items: InvoiceItem[];
        subtotal: number;
        tax: number;
        total: number;
        amountPaid: number;
        amountDue: number;
        currency: string;
        notes?: string;
    };
    orgName?: string;
    orgAddress?: string;
    orgEmail?: string;
}

export default function InvoicePDF({ invoice, orgName = "Dosory", orgAddress, orgEmail }: InvoicePDFProps) {
    const formatCurrency = (amount: number) => {
        return `${invoice.currency} ${amount.toFixed(2)}`;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logo}>{orgName}</Text>
                        {orgAddress && <Text style={{ color: "#666", marginTop: 4 }}>{orgAddress}</Text>}
                        {orgEmail && <Text style={{ color: "#666" }}>{orgEmail}</Text>}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <Text style={styles.invoiceNumber}>#{invoice.number}</Text>
                        <View style={[
                            styles.statusBadge,
                            invoice.status === "paid" ? styles.paidBadge : styles.pendingBadge
                        ]}>
                            <Text style={{ fontSize: 9, fontWeight: "bold" }}>
                                {invoice.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Bill To & Invoice Details */}
                <View style={{ flexDirection: "row", marginBottom: 30 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Bill To</Text>
                        <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{invoice.customerName}</Text>
                        {invoice.customerEmail && <Text style={{ color: "#666" }}>{invoice.customerEmail}</Text>}
                        {invoice.customerAddress && <Text style={{ color: "#666" }}>{invoice.customerAddress}</Text>}
                    </View>
                    <View style={{ width: 200 }}>
                        <Text style={styles.sectionTitle}>Invoice Details</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Invoice Date:</Text>
                            <Text style={styles.value}>{invoice.createdAt}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Due Date:</Text>
                            <Text style={styles.value}>{invoice.dueDate}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Amount Due:</Text>
                            <Text style={[styles.value, { fontWeight: "bold", color: "#0A66C2" }]}>
                                {formatCurrency(invoice.amountDue)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.descriptionCol]}>Description</Text>
                        <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
                        <Text style={[styles.tableHeaderCell, styles.rateCol]}>Rate</Text>
                        <Text style={[styles.tableHeaderCell, styles.totalCol]}>Amount</Text>
                    </View>
                    {invoice.items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.descriptionCol]}>{item.description}</Text>
                            <Text style={[styles.tableCell, styles.qtyCol]}>{item.quantity}</Text>
                            <Text style={[styles.tableCell, styles.rateCol]}>{formatCurrency(item.rate)}</Text>
                            <Text style={[styles.tableCell, styles.totalCol]}>{formatCurrency(item.total)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Subtotal</Text>
                        <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotal)}</Text>
                    </View>
                    {invoice.tax > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Tax</Text>
                            <Text style={styles.totalsValue}>{formatCurrency(invoice.tax)}</Text>
                        </View>
                    )}
                    <View style={styles.grandTotal}>
                        <Text style={styles.grandTotalLabel}>Total</Text>
                        <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
                    </View>
                    {invoice.amountPaid > 0 && (
                        <>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Paid</Text>
                                <Text style={[styles.totalsValue, { color: "#16a34a" }]}>
                                    -{formatCurrency(invoice.amountPaid)}
                                </Text>
                            </View>
                            <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 8 }]}>
                                <Text style={[styles.totalsLabel, { fontWeight: "bold" }]}>Balance Due</Text>
                                <Text style={[styles.totalsValue, { fontWeight: "bold" }]}>
                                    {formatCurrency(invoice.amountDue)}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Notes */}
                {invoice.notes && (
                    <View style={styles.notes}>
                        <Text style={styles.notesTitle}>Notes</Text>
                        <Text style={styles.notesText}>{invoice.notes}</Text>
                    </View>
                )}

                {/* Footer */}
                <Text style={styles.footer}>
                    Thank you for your business! • {orgName} • {orgEmail || "support@dosory.com"}
                </Text>
            </Page>
        </Document>
    );
}
