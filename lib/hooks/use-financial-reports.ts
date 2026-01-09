import { useState, useCallback } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useFinance } from "./use-finance";
import { JournalEntry, AccountType, Account } from "@/lib/types/finance";

export interface PnLReport {
    income: number;
    expenses: number;
    netIncome: number;
    byCategory: Record<string, number>;
}

export interface BalanceSheetReport {
    assets: number;
    liabilities: number;
    equity: number;
    netIncomeYTD: number; // Calculated dynamically
}

export function useFinancialReports() {
    const { profile } = useUserProfile();
    const { accounts, fetchAccounts } = useFinance();
    const [loading, setLoading] = useState(false);

    // FETCH PROFIT & LOSS (Income Statement)
    const getProfitAndLoss = useCallback(
        async (startDate: Date, endDate: Date): Promise<PnLReport> => {
            if (!profile?.orgId) throw new Error("No organization");
            setLoading(true);

            try {
                // Fetch all JEs in range
                // Note: In a real app subject to scale, we would use an aggregation pipeline or dedicated 'daily_balances' collection.
                // For V1, we query JEs.
                const q = query(
                    collection(db, "journal_entries"),
                    where("orgId", "==", profile.orgId),
                    where("date", ">=", Timestamp.fromDate(startDate)),
                    where("date", "<=", Timestamp.fromDate(endDate))
                );

                const snapshot = await getDocs(q);
                const jes = snapshot.docs.map((d) => d.data() as JournalEntry);

                // We need a map of AccountID -> Type
                // Ensure accounts are loaded
                let localAccounts = accounts;
                if (localAccounts.length === 0) {
                    // Fallback fetch if hook hasn't loaded yet (though unlikely if used in component)
                    const accQ = query(collection(db, "accounts"), where("orgId", "==", profile.orgId));
                    const accSnap = await getDocs(accQ);
                    localAccounts = accSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Account);
                }

                const accountTypeMap = new Map<string, AccountType>();
                const accountNameMap = new Map<string, string>();
                localAccounts.forEach((a) => {
                    accountTypeMap.set(a.id, a.type);
                    accountNameMap.set(a.id, a.name);
                });

                const report: PnLReport = {
                    income: 0,
                    expenses: 0,
                    netIncome: 0,
                    byCategory: {},
                };

                jes.forEach((je) => {
                    if (je.status === "voided") return;

                    je.lines.forEach((line) => {
                        const type = accountTypeMap.get(line.accountId);
                        if (!type) return;

                        // Income: Credit increases, Debit decreases
                        // Expense: Debit increases, Credit decreases

                        let impact = 0;
                        if (type === "income") {
                            impact = line.credit - line.debit;
                            report.income += impact;
                        } else if (type === "expense") {
                            impact = line.debit - line.credit;
                            report.expenses += impact;
                        }

                        if (impact !== 0 && (type === "income" || type === "expense")) {
                            const catName = accountNameMap.get(line.accountId) || "Unknown";
                            report.byCategory[catName] = (report.byCategory[catName] || 0) + impact;
                        }
                    });
                });

                report.netIncome = report.income - report.expenses;
                return report;
            } catch (error) {
                console.error("Error generating P&L:", error);
                throw error;
            } finally {
                setLoading(false);
            }
        },
        [profile?.orgId, accounts]
    );

    // FETCH BALANCE SHEET (As of Now)
    const getBalanceSheet = useCallback(async (): Promise<BalanceSheetReport> => {
        if (!profile?.orgId) throw new Error("No organization");
        setLoading(true);

        try {
            // We can just rely on Account Balances for V1
            // But we must calculate Net Income YTD to balance the sheet if Retained Earnings isn't updated daily.
            // Actually, in Double Entry, "Retained Earnings" is usually updated at year-end close.
            // Use 'Net Income' as a dynamic line item.

            // To get accurate "Assets = Liab + Equity", we sum the balances.
            // Assets (Dr +), Liab (Cr +), Equity (Cr +).

            if (accounts.length === 0) await fetchAccounts();

            const report: BalanceSheetReport = {
                assets: 0,
                liabilities: 0,
                equity: 0,
                netIncomeYTD: 0,
            };

            // Calculate Net Income from ALL time (or since last close, but simplified V1: all time)
            // Actually, simpler: Sum of Income Accounts - Sum of Expense Accounts (All Time) = Net Income (Implicit Equity)

            // However, relying on Firestore `balance` field means we just sum them up.
            // Asset Balance (Debit Normal) = Bal
            // Liability Balance (Credit Normal) = Bal

            let calculatedNetIncome = 0;

            accounts.forEach((acc) => {
                // Ensure balance is number
                const bal = Number(acc.balance || 0);

                if (acc.type === "asset") {
                    report.assets += bal;
                } else if (acc.type === "liability") {
                    report.liabilities += bal; // Assuming stored as positive for Credit Normal? or Signed?
                    // In `recordTransaction`, we did: balance += (debit - credit).
                    // So for Liab (Crisis): Credit increases balances? No.
                    // If we did `balance += (debit - credit)`:
                    // Credit $100 -> balance becomes -100.
                    // So Liab/Equity/Income will have NEGATIVE balances in DB.
                    // We need to flip sign for display.
                    report.liabilities += bal * -1;
                } else if (acc.type === "equity") {
                    report.equity += bal * -1;
                } else if (acc.type === "income") {
                    // Income (Credit Normal) -> Negative Balance
                    calculatedNetIncome += bal * -1;
                } else if (acc.type === "expense") {
                    // Expense (Debit Normal) -> Positive Balance
                    calculatedNetIncome -= bal;
                }
            });

            // Adjust: Net Income is part of Equity
            report.equity += calculatedNetIncome;
            report.netIncomeYTD = calculatedNetIncome;

            return report;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [profile?.orgId, accounts, fetchAccounts]);

    // V1.1: AR Aging Report
    const getARAging = useCallback(async (): Promise<AgingReportItem[]> => {
        if (!profile?.orgId) throw new Error("No organization");

        // Query invoices with outstanding balance
        const q = query(collection(db, "invoices"), where("orgId", "==", profile.orgId), where("amountDue", ">", 0));

        const snapshot = await getDocs(q);
        const invoices = snapshot.docs.map((d) => d.data());

        const map = new Map<string, AgingReportItem>();
        const now = new Date();

        invoices.forEach((inv) => {
            const customerId = inv.customerId;
            if (!map.has(customerId)) {
                map.set(customerId, {
                    entityId: customerId,
                    entityName: inv.customerName || "Unknown",
                    totalDue: 0,
                    buckets: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
                });
            }
            const item = map.get(customerId)!;
            const due = inv.amountDue;
            item.totalDue += due;

            // Age based on Due Date
            const dueDate = inv.dueDate ? inv.dueDate.toDate() : inv.date.toDate();
            const diffTime = now.getTime() - dueDate.getTime();
            const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysOverdue <= 30) item.buckets["0-30"] += due;
            else if (daysOverdue <= 60) item.buckets["31-60"] += due;
            else if (daysOverdue <= 90) item.buckets["61-90"] += due;
            else item.buckets["90+"] += due;
        });

        return Array.from(map.values());
    }, [profile?.orgId]);

    return {
        getProfitAndLoss,
        getBalanceSheet,
        getARAging,
        loading,
    };
}

// V1.1 Types
export interface AgingReportItem {
    entityId: string;
    entityName: string;
    totalDue: number;
    buckets: {
        "0-30": number;
        "31-60": number;
        "61-90": number;
        "90+": number;
    };
}
