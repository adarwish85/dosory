import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { StatementTransaction, StatementSummary } from "@/lib/hooks/use-statement";

// Register fonts if needed, or use standard Helvetica
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#111827'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 20
    },
    companyInfo: {
        textAlign: 'right'
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#111827'
    },
    subtitle: {
        fontSize: 10,
        color: '#6B7280'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    billTo: {
        flexDirection: 'column',
        width: '45%'
    },
    summaryBox: {
        width: '40%',
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 4
    },
    label: {
        fontSize: 8,
        color: '#6B7280',
        marginBottom: 2,
        textTransform: 'uppercase',
        fontWeight: 'bold'
    },
    value: {
        fontSize: 10,
        marginBottom: 1
    },
    boldValue: {
        fontSize: 10,
        fontWeight: 'bold'
    },
    table: {
        marginTop: 20,
        width: 'auto'
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    colDate: { width: '15%' },
    colRef: { width: '20%' },
    colDesc: { width: '30%' },
    colAmount: { width: '15%', textAlign: 'right' },
    colBalance: { width: '20%', textAlign: 'right' },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 10,
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB'
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 20
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 'bold'
    }
});

interface StatementPDFProps {
    customer: any;
    organization: any;
    transactions: StatementTransaction[];
    summary: StatementSummary;
    dateRange: { start?: Date; end?: Date };
}

export function StatementPDF({ customer, organization, transactions, summary, dateRange }: StatementPDFProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: customer?.currency || 'USD'
        }).format(amount);
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        {/* Logo placehoder */}
                        <Text>LOGO</Text>
                    </View>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{organization?.name || "Your Company"}</Text>
                        <Text>{organization?.address?.street}</Text>
                        <Text>{organization?.address?.city}, {organization?.address?.state}</Text>
                    </View>
                </View>

                {/* Info Block */}
                <View style={styles.row}>
                    <View style={styles.billTo}>
                        <Text style={styles.label}>Bill To</Text>
                        <Text style={{ ...styles.value, fontWeight: 'bold' }}>{customer?.company}</Text>
                        <Text style={styles.value}>{customer?.address?.street}</Text>
                        <Text style={styles.value}>{customer?.address?.city}, {customer?.address?.state}</Text>
                    </View>

                    <View style={{ width: '50%', alignItems: 'flex-end' }}>
                        <Text style={styles.title}>Statement of Account</Text>
                        <Text style={styles.subtitle}>
                            {dateRange.start ? (
                                `${format(dateRange.start, "MMM d, yyyy")} - ${format(new Date(), "MMM d, yyyy")}`
                            ) : "All Time"}
                        </Text>
                    </View>
                </View>

                {/* Summary Box */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 }}>
                    <View style={styles.summaryBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text>Opening Balance:</Text>
                            <Text>{formatCurrency(summary.openingBalance)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text>Invoiced:</Text>
                            <Text>{formatCurrency(summary.invoicedAmount)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text>Paid:</Text>
                            <Text>({formatCurrency(summary.amountPaid)})</Text>
                        </View>
                        <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 4, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.boldValue}>Balance Due:</Text>
                            <Text style={styles.boldValue}>{formatCurrency(summary.closingBalance)}</Text>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDate}>Date</Text>
                        <Text style={styles.colRef}>Transaction</Text>
                        <Text style={styles.colDesc}>Details</Text>
                        <Text style={styles.colAmount}>Amount</Text>
                        <Text style={styles.colBalance}>Balance</Text>
                    </View>

                    {summary.openingBalance !== 0 && (
                        <View style={styles.tableRow}>
                            <Text style={styles.colDate}>{dateRange.start ? format(dateRange.start, "MMM d, yyyy") : "-"}</Text>
                            <Text style={styles.colRef}>Opening Bal</Text>
                            <Text style={styles.colDesc}>Brought forward</Text>
                            <Text style={styles.colAmount}>-</Text>
                            <Text style={styles.colBalance}>{formatCurrency(summary.openingBalance)}</Text>
                        </View>
                    )}

                    {transactions.map((tx) => (
                        <View key={tx.id} style={styles.tableRow}>
                            <Text style={styles.colDate}>{format(tx.date, "MMM d, yyyy")}</Text>
                            <Text style={styles.colRef}>{tx.reference}</Text>
                            <Text style={styles.colDesc}>{tx.description}</Text>
                            <Text style={styles.colAmount}>
                                {tx.type === 'invoice' ? formatCurrency(tx.originalAmount || 0) : `(${formatCurrency(Math.abs(tx.amount))})`}
                            </Text>
                            <Text style={styles.colBalance}>{formatCurrency(tx.runningBalance)}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer Total */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Balance Due</Text>
                    <Text style={styles.totalValue}>{formatCurrency(summary.closingBalance)}</Text>
                </View>

            </Page>
        </Document>
    );
}
