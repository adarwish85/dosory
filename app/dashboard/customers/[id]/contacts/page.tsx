"use client";

import { useState } from "react";
import { ContactDialog } from "@/components/dashboard/customers/contacts/contact-dialog";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useContacts } from "@/lib/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Search, RotateCcw, User, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ContactsPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { contacts, loading: contactsLoading, deleteContact, updateContact } = useContacts({ customerId: customerId || undefined });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loading = customerLoading || contactsLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const handleDelete = async (contactId: string) => {
        setDeletingId(contactId);
        try {
            await deleteContact(contactId);
            toast.success("Contact deleted successfully");
        } catch (error) {
            console.error("Error deleting contact:", error);
            toast.error("Failed to delete contact");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleActive = async (contactId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === "active" ? "inactive" : "active";
            await updateContact(contactId, { status: newStatus });
            toast.success(newStatus === "active" ? "Contact activated" : "Contact deactivated");
        } catch (error) {
            console.error("Error toggling contact status:", error);
            toast.error("Failed to update contact status");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Contacts</h2>
            </div>

            <div className="rounded-md border bg-white p-4">
                <div className="mb-4">
                    <ContactDialog
                        customerId={customerId || undefined}
                        customerName={customer?.company}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="text-gray-600">Export</Button>
                        <Button variant="outline" size="icon" className="text-gray-600 w-9 px-0">
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search..." className="pl-9" />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Full Name</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Email</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Position</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Phone</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Active</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No contacts found for {customer?.company || "this customer"}. Add a contact to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            contacts.map((contact) => (
                                <TableRow key={contact.id}>
                                    <TableCell className="min-w-[250px] py-3">
                                        <div className="flex items-start gap-3 group">
                                            <Avatar className="h-10 w-10 bg-gray-200 mt-1">
                                                <AvatarFallback className="bg-gray-200 text-gray-500">
                                                    {contact.firstName?.[0]}{contact.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">
                                                    {contact.firstName} {contact.lastName}
                                                    {contact.isPrimary && (
                                                        <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Primary</span>
                                                    )}
                                                </span>
                                                <span className="text-gray-500 text-sm mt-0.5 group-hover:hidden">{contact.email}</span>
                                                <div className="hidden group-hover:flex items-center gap-3 mt-0.5">
                                                    <ContactDialog
                                                        customerId={customerId || undefined}
                                                        customerName={customer?.company}
                                                        contact={contact}
                                                    >
                                                        <button className="text-sm font-medium text-gray-900 hover:underline">Edit</button>
                                                    </ContactDialog>
                                                    <span className="text-gray-300">|</span>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <button
                                                                className="text-sm font-medium text-red-600 hover:underline"
                                                                disabled={deletingId === contact.id}
                                                            >
                                                                {deletingId === contact.id ? "..." : "Delete"}
                                                            </button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete {contact.firstName} {contact.lastName}? This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                    onClick={() => handleDelete(contact.id)}
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-4 text-gray-700">{contact.email}</TableCell>
                                    <TableCell className="align-top py-4">{contact.position || "-"}</TableCell>
                                    <TableCell className="align-top py-4 text-gray-700">{contact.phone || "-"}</TableCell>
                                    <TableCell className="align-top py-4">
                                        <Switch
                                            checked={contact.status === "active"}
                                            className="data-[state=checked]:bg-blue-600"
                                            onCheckedChange={() => handleToggleActive(contact.id, contact.status || "active")}
                                        />
                                    </TableCell>

                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" disabled className="text-gray-500">Previous</Button>
                        <Button variant="secondary" size="sm" className="h-8 w-8 p-0 bg-gray-200 text-gray-900">1</Button>
                        <Button variant="ghost" size="sm" disabled className="text-gray-500">Next</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
