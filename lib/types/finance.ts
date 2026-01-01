import { BaseEntity } from "../types";
import { Timestamp } from "firebase/firestore";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type AccountSubType =
    | "current_asset"
    | "fixed_asset"
    | "current_liability"
    | "long_term_liability"
    | "sales"
    | "other_income"
    | "operating_expense"
    | "cost_of_goods_sold"
    | "retained_earnings"
    | "owner_equity";

export interface Account extends BaseEntity {
    code: string; // e.g., "1000", "4000"
    name: string;
    type: AccountType;
    subType: AccountSubType;
    description?: string;
    isSystem: boolean; // Cannot be deleted if true
    parentId?: string; // For sub-accounts
    balance: number; // Cached current balance
    currency: string;
    workspaceId: string;
}

export interface JournalEntry extends BaseEntity {
    date: Timestamp;
    description: string;
    referenceId?: string; // ID of Invoice, Payment, Expense
    referenceType?: "invoice" | "payment" | "expense" | "manual" | "transfer";
    lines: JournalLine[];
    totalAmount: number;
    status: "draft" | "posted" | "voided";
    periodId?: string; // Link to financial period
    workspaceId: string;
}

export interface JournalLine {
    accountId: string;
    accountName: string; // Snapshot for display
    debit: number;
    credit: number;
    description?: string;
}

export interface FinancialPeriod extends BaseEntity {
    name: string; // "Jan 2024"
    startDate: Timestamp;
    endDate: Timestamp;
    status: "open" | "closed";
    closedBy?: string;
    closedAt?: Timestamp;
    workspaceId: string;
}

export interface Expense extends BaseEntity {
    date: Timestamp;
    payee: string; // Vendor name or person
    amount: number;
    currency: string;
    categoryId: string; // Linked to Expense Account
    description?: string;
    paymentMethod: "cash" | "bank" | "card";
    reference?: string;
    status: "pending" | "approved" | "paid" | "rejected";
    attachments?: string[];
    workspaceId: string;
}
