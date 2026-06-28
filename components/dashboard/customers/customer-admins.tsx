"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Shield } from "lucide-react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Contact, Subscription } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCustomer } from "./customer-context";
import { useTranslation } from "@/lib/i18n";

export function CustomerAdmins() {
    const { t } = useTranslation();
    // We can use context here instead of prop drilling or fetching again?
    // CustomerContext has contacts!
    const { customer, contacts, loading } = useCustomer();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    // Fetch subscription for capability check
    useEffect(() => {
        if (!customer?.orgId) return;
        const unsubSub = onSnapshot(doc(db, "subscriptions", customer.orgId), (doc) => {
            if (doc.exists()) setSubscription(doc.data() as Subscription);
        });
        return () => unsubSub();
    }, [customer?.orgId]);

    if (loading) return <div>{t("common.loading")}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">{t("customers.admins.title")}</h3>
                    <p className="text-sm text-gray-500">
                        {t("customers.admins.subtitle")}
                    </p>
                </div>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> {t("customers.admins.addContact")}
                </Button>
            </div>

            {!contacts.length ? (
                <div className="text-center py-10 border rounded-lg bg-gray-50">
                    <p className="text-gray-500">{t("customers.admins.noContacts")}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {contacts.map((contact) => {
                        const hasPortal = contact.portalAccess?.enabled;
                        const canInvite = subscription?.capabilities?.clientPortal ?? true; // Default true for now if undefined

                        return (
                            <div
                                key={contact.id}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-medium">
                                        {contact.firstName?.[0]}
                                        {contact.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                            {contact.firstName} {contact.lastName}
                                            {contact.isPrimary && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {t("customers.admins.primary")}
                                                </Badge>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500">{contact.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Portal Status */}
                                    {hasPortal ? (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                                            <Shield className="h-3 w-3" />
                                            {t("customers.admins.portalActive")}
                                        </div>
                                    ) : (
                                        canInvite && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium border border-gray-100">
                                                <Shield className="h-3 w-3" />
                                                {t("customers.admins.noAccess")}
                                            </div>
                                        )
                                    )}

                                    <div className="flex gap-2">
                                        {/* Invite Button */}
                                        {!hasPortal && canInvite && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                                onClick={() => {
                                                    setSelectedContact(contact);
                                                    setInviteDialogOpen(true);
                                                }}
                                            >
                                                <Mail className="mr-2 h-3.5 w-3.5" />
                                                {t("customers.admins.invite")}
                                            </Button>
                                        )}
                                        {/* Manage Button */}
                                        {hasPortal && (
                                            <Button size="sm" variant="ghost">
                                                {t("customers.admins.manage")}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Invite Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("customers.admins.inviteDialogTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("customers.admins.inviteDialogDesc", { name: selectedContact?.firstName ?? "" })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md">
                            {t("customers.admins.inviteEmailNotice")} <strong>{selectedContact?.email}</strong>.
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">{t("customers.admins.allowedModules")}</label>
                            <div className="space-y-2 border rounded-md p-3 max-h-[200px] overflow-y-auto">
                                {["invoices", "projects", "tickets", "contracts"].map((mod) => (
                                    <div key={mod} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`mod-${mod}`}
                                            className="rounded border-gray-300 text-purple-600"
                                            defaultChecked
                                        />
                                        <label htmlFor={`mod-${mod}`} className="text-sm capitalize">
                                            {t(`customers.admins.module.${mod}`)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                                alert(t("customers.admins.inviteSimulated"));
                                setInviteDialogOpen(false);
                            }}
                        >
                            <Mail className="mr-2 h-4 w-4" /> {t("customers.admins.sendInvite")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
