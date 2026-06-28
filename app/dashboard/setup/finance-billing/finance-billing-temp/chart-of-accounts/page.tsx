"use client";

import { useEffect, useState } from "react";
import { useFinance } from "@/lib/hooks/use-finance";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw, Lock } from "lucide-react";
import { Account } from "@/lib/types/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccountFormDialog } from "@/components/dashboard/finance/account-form-dialog";

export default function ChartOfAccountsPage() {
    const { t } = useTranslation();
    const { accounts, loading, fetchAccounts, createAccount } = useFinance();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const handleCreate = async (data: Partial<Account>) => {
        await createAccount(data);
        fetchAccounts();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t("setup.chartOfAccounts.title")}</h1>
                    <p className="text-sm text-gray-500">{t("setup.chartOfAccounts.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchAccounts()} disabled={loading}>
                        <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        {t("setup.chartOfAccounts.refresh")}
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingAccount(undefined);
                            setDialogOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("setup.chartOfAccounts.addAccount")}
                    </Button>
                </div>
            </div>

            <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="w-24">{t("setup.chartOfAccounts.colCode")}</TableHead>
                            <TableHead>{t("setup.chartOfAccounts.colName")}</TableHead>
                            <TableHead>{t("setup.chartOfAccounts.colType")}</TableHead>
                            <TableHead>{t("setup.chartOfAccounts.colSubType")}</TableHead>
                            <TableHead className="text-right">{t("setup.chartOfAccounts.colAttributes")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    {t("setup.chartOfAccounts.loading")}
                                </TableCell>
                            </TableRow>
                        ) : accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    {t("setup.chartOfAccounts.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            accounts.map((account) => (
                                <TableRow key={account.id} className="hover:bg-gray-50">
                                    <TableCell className="font-mono text-gray-600">{account.code}</TableCell>
                                    <TableCell className="font-medium text-gray-900">{account.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {account.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600 capitalize">
                                            {account.subType.replace(/_/g, " ")}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {account.isSystem && (
                                            <div className="flex justify-end items-center text-xs text-gray-400">
                                                <Lock className="h-3 w-3 mr-1" />
                                                {t("setup.chartOfAccounts.system")}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AccountFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleCreate}
                initialData={editingAccount}
            />
        </div>
    );
}
