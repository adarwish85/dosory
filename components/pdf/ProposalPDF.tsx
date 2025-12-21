"use client";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";

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
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
    proposalNumber: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: "#0A66C2",
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
    content: {
        marginBottom: 30,
        lineHeight: 1.6,
        color: "#333",
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#0A66C2",
        padding: 10,
    },
    tableHeaderCell: {
        fontWeight: "bold",
        color: "#fff",
    },
    tableRow: {
        flexDirection: "row",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    tableRowAlt: {
        backgroundColor: "#f9f9f9",
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
    grandTotal: {
        flexDirection: "row",
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: "#0A66C2",
        borderRadius: 4,
        width: 250,
    },
    grandTotalLabel: {
        flex: 1,
        fontWeight: "bold",
        fontSize: 14,
        color: "#fff",
    },
    grandTotalValue: {
        width: 100,
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 14,
        color: "#fff",
    },
    validUntil: {
        marginTop: 30,
        padding: 15,
        backgroundColor: "#fef3c7",
        borderRadius: 4,
        flexDirection: "row",
        alignItems: "center",
    },
    validUntilText: {
        color: "#92400e",
        fontWeight: "bold",
    },
    terms: {
        marginTop: 30,
        padding: 20,
        backgroundColor: "#f5f5f5",
        borderRadius: 4,
    },
    termsTitle: {
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    termsText: {
        color: "#666",
        lineHeight: 1.6,
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
    acceptSection: {
        marginTop: 40,
        padding: 20,
        backgroundColor: "#dcfce7",
        borderRadius: 4,
        textAlign: "center",
    },
    acceptTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#166534",
        marginBottom: 8,
    },
    acceptUrl: {
        fontSize: 10,
        color: "#0A66C2",
    },
});

interface ProposalItem {
    description: string;
    quantity: number;
    rate: number;
    total: number;
}

interface ProposalPDFProps {
    proposal: {
        number: string;
        subject: string;
        status: string;
        createdAt: string;
        openTill: string;
        customerName: string;
        customerEmail?: string;
        content?: string;
        items: ProposalItem[];
        subtotal: number;
        tax: number;
        total: number;
        currency: string;
        terms?: string;
    };
    orgName?: string;
    orgEmail?: string;
    portalUrl?: string;
}

export default function ProposalPDF({
    proposal,
    orgName = "Dosory",
    orgEmail,
    portalUrl
}: ProposalPDFProps) {
    const formatCurrency = (amount: number) => {
        return `${proposal.currency} ${amount.toFixed(2)}`;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logo}>{orgName}</Text>
                        {orgEmail && <Text style={{ color: "#666", marginTop: 4 }}>{orgEmail}</Text>}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.title}>PROPOSAL</Text>
                        <Text style={styles.proposalNumber}>#{proposal.number}</Text>
                    </View>
                </View>

                {/* Subject */}
                <View style={{ marginBottom: 30 }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1a1a1a" }}>
                        {proposal.subject}
                    </Text>
                </View>

                {/* Client & Details */}
                <View style={{ flexDirection: "row", marginBottom: 30 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>Prepared For</Text>
                        <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{proposal.customerName}</Text>
                        {proposal.customerEmail && <Text style={{ color: "#666" }}>{proposal.customerEmail}</Text>}
                    </View>
                    <View style={{ width: 180 }}>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Date:</Text>
                            <Text style={styles.value}>{proposal.createdAt}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Valid Until:</Text>
                            <Text style={styles.value}>{proposal.openTill}</Text>
                        </View>
                    </View>
                </View>

                {/* Content */}
                {proposal.content && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Proposal Details</Text>
                        <Text style={styles.content}>{proposal.content}</Text>
                    </View>
                )}

                {/* Items Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pricing</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, styles.descriptionCol]}>Description</Text>
                            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
                            <Text style={[styles.tableHeaderCell, styles.rateCol]}>Rate</Text>
                            <Text style={[styles.tableHeaderCell, styles.totalCol]}>Amount</Text>
                        </View>
                        {proposal.items.map((item, index) => (
                            <View
                                key={index}
                                style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                            >
                                <Text style={[styles.tableCell, styles.descriptionCol]}>{item.description}</Text>
                                <Text style={[styles.tableCell, styles.qtyCol]}>{item.quantity}</Text>
                                <Text style={[styles.tableCell, styles.rateCol]}>{formatCurrency(item.rate)}</Text>
                                <Text style={[styles.tableCell, styles.totalCol]}>{formatCurrency(item.total)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Total */}
                <View style={styles.totalsSection}>
                    <View style={styles.grandTotal}>
                        <Text style={styles.grandTotalLabel}>Total Investment</Text>
                        <Text style={styles.grandTotalValue}>{formatCurrency(proposal.total)}</Text>
                    </View>
                </View>

                {/* Valid Until Notice */}
                <View style={styles.validUntil}>
                    <Text style={styles.validUntilText}>
                        ⏰ This proposal is valid until {proposal.openTill}
                    </Text>
                </View>

                {/* Accept Online */}
                {portalUrl && proposal.status !== "accepted" && (
                    <View style={styles.acceptSection}>
                        <Text style={styles.acceptTitle}>Accept This Proposal Online</Text>
                        <Text style={styles.acceptUrl}>{portalUrl}</Text>
                    </View>
                )}

                {/* Terms */}
                {proposal.terms && (
                    <View style={styles.terms}>
                        <Text style={styles.termsTitle}>Terms & Conditions</Text>
                        <Text style={styles.termsText}>{proposal.terms}</Text>
                    </View>
                )}

                {/* Footer */}
                <Text style={styles.footer}>
                    {orgName} • {orgEmail || "support@dosory.com"} • Thank you for considering our proposal!
                </Text>
            </Page>
        </Document>
    );
}
