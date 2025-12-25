"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowLeft } from "lucide-react";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Customer, Contact, Subscription } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Mail, Shield, UserPlus } from "lucide-react";

export function CustomerProfileForm() {
    const params = useParams();
    const router = useRouter();
    const customerId = params?.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const { register, handleSubmit, setValue, watch } = useForm();

    useEffect(() => {
        if (!customerId) return;

        // Load Customer
        async function loadCustomer() {
            try {
                const docRef = doc(db, "customers", customerId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
                    // Populate form (same as before) ...
                    const data = docSnap.data();
                    setValue("company", data.company);
                    setValue("vatNumber", data.vatNumber || "");
                    setValue("phone", data.phone || "");
                    setValue("website", data.website || "");
                    setValue("currency", data.currency || "usd");
                    setValue("defaultLanguage", data.defaultLanguage || "default");
                    setValue("address", data.address?.street || "");
                    setValue("city", data.address?.city || "");
                    setValue("state", data.address?.state || "");
                    setValue("zipCode", data.address?.zipCode || "");
                    setValue("country", data.address?.country || "");
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        }
        loadCustomer();

        // Load Contacts
        const q = query(collection(db, "contacts"), where("customerId", "==", customerId));
        const unsubContacts = onSnapshot(q, (snapshot) => {
            setContacts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
        });

        return () => unsubContacts();
    }, [customerId, setValue]);

    // Separate Effect for Subscription (depends on customer.orgId)
    useEffect(() => {
        if (!customer?.orgId) return;

        const unsubSub = onSnapshot(doc(db, "subscriptions", customer.orgId), (doc) => {
            if (doc.exists()) setSubscription(doc.data() as Subscription);
        });

        return () => unsubSub();
    }, [customer?.orgId]);

    const onSave = async (data: any) => {
        if (!customerId) return;

        try {
            const docRef = doc(db, "customers", customerId);
            await updateDoc(docRef, {
                company: data.company,
                vatNumber: data.vatNumber,
                phone: data.phone,
                website: data.website,
                currency: data.currency,
                defaultLanguage: data.defaultLanguage,
                address: {
                    street: data.address,
                    city: data.city,
                    state: data.state,
                    zipCode: data.zipCode,
                    country: data.country,
                },
                updatedAt: new Date(),
            });

            alert("Customer updated successfully!");
        } catch (error) {
            console.error("Error updating customer:", error);
            alert("Failed to update customer");
        }
    };

    if (loading) {
        return <div className="p-8">Loading customer...</div>;
    }

    if (!customer) {
        return <div className="p-8">Customer not found</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Customer Profile</h2>

            <form onSubmit={handleSubmit(onSave)}>
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                        <TabsTrigger
                            value="details"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2"
                        >
                            Customer Details
                        </TabsTrigger>
                        <TabsTrigger
                            value="billing"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2"
                        >
                            Billing & Shipping
                        </TabsTrigger>
                        <TabsTrigger
                            value="admins"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2"
                        >
                            Customer Admins
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-6 space-y-6 max-w-3xl">
                        <div className="flex items-start space-x-2">
                            <Checkbox id="show-contact" className="mt-1" defaultChecked />
                            <label
                                htmlFor="show-contact"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700"
                            >
                                Show primary contact full name on Invoices, Estimates, Payments, Credit Notes
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="company" className="text-red-500 font-semibold">* <span className="text-gray-700">Company</span></Label>
                                <Input id="company" {...register("company", { required: true })} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="vat">VAT Number</Label>
                                <Input id="vat" {...register("vatNumber")} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" {...register("phone")} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="website">Website</Label>
                                <Input id="website" {...register("website")} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Currency</Label>
                                    <Select defaultValue={customer.currency || "usd"} onValueChange={(val) => setValue("currency", val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="System Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="usd">USD</SelectItem>
                                            <SelectItem value="eur">EUR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Default Language</Label>
                                    <Select defaultValue={customer.defaultLanguage || "default"} onValueChange={(val) => setValue("defaultLanguage", val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="System Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">System Default</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea id="address" className="min-h-[100px]" {...register("address")} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input id="city" {...register("city")} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="state">State</Label>
                                    <Input id="state" {...register("state")} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="zipCode">Zip Code</Label>
                                    <Input id="zipCode" {...register("zipCode")} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input id="country" {...register("country")} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit">Save Changes</Button>
                            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/customers")}>
                                Cancel
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="billing" className="mt-6">
                        <p className="text-gray-500">Billing & Shipping information coming soon...</p>
                    </TabsContent>

                    <TabsContent value="admins" className="mt-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Contacts & Portal Access</h3>
                                <p className="text-sm text-gray-500">Manage customer contacts and grant access to the Client Portal.</p>
                            </div>
                            <Button variant="outline">
                                <Plus className="mr-2 h-4 w-4" /> Add Contact
                            </Button>
                        </div>

                        {!contacts.length ? (
                            <div className="text-center py-10 border rounded-lg bg-gray-50">
                                <p className="text-gray-500">No contacts found for this customer.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {contacts.map(contact => {
                                    const hasPortal = contact.portalAccess?.enabled;
                                    const canInvite = subscription?.capabilities?.clientPortal;

                                    return (
                                        <div key={contact.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-medium">
                                                    {contact.firstName[0]}{contact.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                                        {contact.firstName} {contact.lastName}
                                                        {contact.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{contact.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Portal Status */}
                                                {hasPortal ? (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                                                        <Shield className="h-3 w-3" />
                                                        Portal Active
                                                    </div>
                                                ) : (
                                                    canInvite && (
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium border border-gray-100">
                                                            <Shield className="h-3 w-3" />
                                                            No Access
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
                                                            Invite
                                                        </Button>
                                                    )}
                                                    {/* Manage Button */}
                                                    {hasPortal && (
                                                        <Button size="sm" variant="ghost" >Manage</Button>
                                                    )}

                                                    {!canInvite && !hasPortal && (
                                                        <Button size="sm" variant="ghost" disabled title="Upgrade plan to enable Client Portal">
                                                            <Shield className="mr-2 h-3.5 w-3.5 text-gray-300" />
                                                            Locked
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </form>

            {/* Invite Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Invite to Client Portal</DialogTitle>
                        <DialogDescription>
                            Grant {selectedContact?.firstName} access to self-service portal.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md">
                            An email with login instructions will be sent to <strong>{selectedContact?.email}</strong>.
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Allowed Modules</label>
                            <div className="space-y-2 border rounded-md p-3 max-h-[200px] overflow-y-auto">
                                {/* Only show modules enabled in tenant subscription */}
                                {['invoices', 'projects', 'tickets', 'contracts', 'proposals'].map(mod => (
                                    <div key={mod} className="flex items-center space-x-2">
                                        {/* Simple Checkbox Logic needed here, hardcoded for now or need state */}
                                        <input type="checkbox" id={`mod-${mod}`} className="rounded border-gray-300 text-purple-600" defaultChecked />
                                        <label htmlFor={`mod-${mod}`} className="text-sm capitalize">{mod}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={async () => {
                            if (!selectedContact) return;
                            try {
                                const res = await fetch("/api/portal/invite", {
                                    method: "POST",
                                    body: JSON.stringify({
                                        customerId,
                                        contactId: selectedContact.id,
                                        modules: ['invoices', 'projects', 'tickets', 'contracts', 'proposals'] // TODO: specific selection
                                    })
                                });
                                if (!res.ok) throw new Error(await res.text());
                                alert("Invite sent successfully!");
                                setInviteDialogOpen(false);
                            } catch (e: any) {
                                alert("Error sending invite: " + e.message);
                            }
                        }}>
                            <Mail className="mr-2 h-4 w-4" /> Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
