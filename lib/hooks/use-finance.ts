import { useState, useCallback } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    increment,
    serverTimestamp,
    orderBy,
    runTransaction,
    limit,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Account, JournalEntry, AccountType, AccountSubType } from "@/lib/types/finance";
import { getDoc } from "firebase/firestore";

const DEFAULT_ACCOUNTS: Partial<Account>[] = [
    // Assets
    { code: "1000", name: "Cash on Hand", type: "asset", subType: "current_asset", isSystem: true, currency: "USD" },
    { code: "1010", name: "Bank Account", type: "asset", subType: "current_asset", isSystem: true, currency: "USD" },
    {
        code: "1200",
        name: "Accounts Receivable",
        type: "asset",
        subType: "current_asset",
        isSystem: true,
        currency: "USD",
    },

    // Liabilities
    {
        code: "2000",
        name: "Accounts Payable",
        type: "liability",
        subType: "current_liability",
        isSystem: true,
        currency: "USD",
    },
    {
        code: "2100",
        name: "Sales Tax Payable",
        type: "liability",
        subType: "current_liability",
        isSystem: true,
        currency: "USD",
    },

    // Equity
    { code: "3000", name: "Owner's Equity", type: "equity", subType: "owner_equity", isSystem: true, currency: "USD" },
    {
        code: "3100",
        name: "Retained Earnings",
        type: "equity",
        subType: "retained_earnings",
        isSystem: true,
        currency: "USD",
    },

    // Income
    { code: "4000", name: "Sales Income", type: "income", subType: "sales", isSystem: true, currency: "USD" },
    { code: "4100", name: "Service Income", type: "income", subType: "sales", isSystem: false, currency: "USD" },

    // Expenses
    {
        code: "5000",
        name: "Cost of Goods Sold",
        type: "expense",
        subType: "cost_of_goods_sold",
        isSystem: true,
        currency: "USD",
    },
    {
        code: "6000",
        name: "Advertising & Marketing",
        type: "expense",
        subType: "operating_expense",
        isSystem: false,
        currency: "USD",
    },
    {
        code: "6010",
        name: "Rent Expense",
        type: "expense",
        subType: "operating_expense",
        isSystem: false,
        currency: "USD",
    },
    {
        code: "6020",
        name: "Salaries & Wages",
        type: "expense",
        subType: "operating_expense",
        isSystem: false,
        currency: "USD",
    },
    {
        code: "6030",
        name: "Utilities",
        type: "expense",
        subType: "operating_expense",
        isSystem: false,
        currency: "USD",
    },
];

export function useFinance() {
    const { profile } = useUserProfile();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const fetchAccounts = useCallback(async () => {
        if (!profile?.orgId) return;
        setLoading(true);
        try {
            const q = query(collection(db, "accounts"), where("orgId", "==", profile.orgId), orderBy("code"));
            const snapshot = await getDocs(q);
            const fetchedAccounts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Account);

            if (fetchedAccounts.length === 0) {
                // Seed default accounts if none exist
                await seedDefaultAccounts(profile.orgId);
                // Re-fetch custom recursion usually bad, but here it's strictly one-level
                const qRetry = query(collection(db, "accounts"), where("orgId", "==", profile.orgId), orderBy("code"));
                const snapshotRetry = await getDocs(qRetry);
                setAccounts(snapshotRetry.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Account));
            } else {
                setAccounts(fetchedAccounts);
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
        } finally {
            setLoading(false);
        }
    }, [profile?.orgId]);

    const seedDefaultAccounts = async (orgId: string) => {
        const batchPromises = DEFAULT_ACCOUNTS.map((acc) =>
            addDoc(collection(db, "accounts"), {
                ...acc,
                orgId,
                balance: 0,
                workspaceId: orgId, // Mapping orgId to workspaceId
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            })
        );
        await Promise.all(batchPromises);
    };

    const createAccount = async (data: Partial<Account>) => {
        if (!profile?.orgId) throw new Error("No organization");
        await addDoc(collection(db, "accounts"), {
            ...data,
            balance: 0,
            orgId: profile.orgId,
            workspaceId: profile.orgId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: profile.uid,
        });
        await fetchAccounts();
    };

    // THE DOUBLE-ENTRY ENGINE
    const recordJournalEntry = async (
        entry: Omit<JournalEntry, "id" | "orgId" | "createdAt" | "updatedAt" | "workspaceId">
    ) => {
        if (!profile?.orgId) throw new Error("No organization");

        // 1. Validate Debits == Credits
        const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Unbalanced Journal Entry: Debits $${totalDebit} != Credits $${totalCredit}`);
        }

        // 1.5 CHECK LOCK DATE
        // Fetch Org Settings to check for lockDate
        const settingsRef = doc(db, "organizations", profile.orgId, "settings", "finance");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            const lockDateTimestamp = settingsSnap.data().lockDate as Timestamp;
            if (lockDateTimestamp) {
                const entryDate = entry.date.toDate();
                const lockDate = lockDateTimestamp.toDate();
                if (entryDate <= lockDate) {
                    throw new Error(
                        `Period Closed: Cannot record transactions on or before ${lockDate.toLocaleDateString()}`
                    );
                }
            }
        }

        try {
            await runTransaction(db, async (transaction) => {
                // 2. Create Journal Entry Document
                const jeRef = doc(collection(db, "journal_entries"));
                transaction.set(jeRef, {
                    ...entry,
                    orgId: profile.orgId,
                    workspaceId: profile.orgId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: profile.uid,
                    totalAmount: totalDebit, // Convention: Total volume of one side
                });

                // 3. Atomically Update Account Balances
                // For each line, we need to read the account first (Firestore rule), then update.
                // However, we can use increment() if we trust the generic structure.
                // But let's stick to read-modify-write for safety or just simplistic increment if we don't need to read.
                // Firestore `increment` is atomic and easier.

                // We must handle multiple lines affecting the same account.
                // Aggregate impact per account first.
                const accountUpdates: Record<string, number> = {}; // accountId -> netChange

                entry.lines.forEach((line) => {
                    if (!accountUpdates[line.accountId]) accountUpdates[line.accountId] = 0;

                    // Debit generally increases Assets/Expenses, decreases Liab/Equity/Income
                    // BUT for "balance" field, we usually store normal balance?
                    // OR we store signed balance where Debit = + and Credit = - ?
                    // Let's standardise: Assets/Exp are Debit Normal (+), Liab/Eq/Inc are Credit Normal (-).
                    // Actually, simplest for DB is: Balance = Sum(Debits) - Sum(Credits) for ALL accounts.
                    // Then UI flips the sign based on account type.

                    accountUpdates[line.accountId] += line.debit - line.credit;
                });

                // Apply updates
                for (const [accountId, netChange] of Object.entries(accountUpdates)) {
                    // Logic: we assume 'balance' field exists.
                    // We can use FieldValue.increment(netChange)
                    const accRef = doc(db, "accounts", accountId);
                    // Note: We are NOT reading the doc here, just blindly incrementing.
                    // This avoids "max writes" issues if we had to read them all in one go,
                    // though runTransaction requires reads before writes if we used current data.
                    // But `update` with `increment` doesn't need a read.
                    // BUT: runTransaction requires we perform ALL reads before ANY writes.
                    // So we can't use `update` randomly if we read anything else?
                    // Actually we didn't read anything in this transaction yet.

                    // However, to be strict component of a transaction, let's just use update.
                    transaction.update(accRef, {
                        // @ts-expect-error - Firestore generic typing is tricky with increment
                        balance: typeof netChange === "number" ? increment(netChange) : 0,
                    });
                }
            });
            return true;
        } catch (e) {
            console.error("Journal Entry Failed:", e);
            throw e;
        }
    };

    return {
        accounts,
        loading,
        fetchAccounts,
        createAccount,
        recordJournalEntry,
    };
}
