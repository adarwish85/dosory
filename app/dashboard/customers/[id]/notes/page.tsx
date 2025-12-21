"use client";

import { useState, useEffect } from "react";
import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search, SquarePen, Trash2 } from "lucide-react";
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";

interface Note {
    id: string;
    description: string;
    addedFrom: string;
    dateAdded: string;
}

export default function NotesPage() {
    const { customerId, loading: customerLoading } = useCustomer();
    const { user } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    // Creation State
    const [newNoteText, setNewNoteText] = useState("");
    const [saving, setSaving] = useState(false);

    // Load notes from Firestore
    useEffect(() => {
        if (!customerId) {
            setLoading(false);
            return;
        }

        const notesRef = collection(db, "customers", customerId, "notes");
        const unsubscribe = onSnapshot(notesRef, (snapshot) => {
            const notesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Note[];
            setNotes(notesData);
            setLoading(false);
        }, (err) => {
            console.error("Error loading notes:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [customerId]);

    const handleSaveNewNote = async () => {
        if (!newNoteText.trim() || !customerId) return;

        setSaving(true);
        try {
            const notesRef = collection(db, "customers", customerId, "notes");
            await addDoc(notesRef, {
                description: newNoteText,
                addedFrom: user?.email || "System",
                dateAdded: new Date().toLocaleString(),
                createdAt: new Date(),
            });
            setNewNoteText("");
        } catch (error) {
            console.error("Error saving note:", error);
            alert("Failed to save note");
        } finally {
            setSaving(false);
        }
    };

    const startEditing = (note: Note) => {
        setEditingId(note.id);
        setEditText(note.description);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditText("");
    };

    const saveEdit = async (id: string) => {
        if (!customerId) return;

        try {
            const noteRef = doc(db, "customers", customerId, "notes", id);
            await updateDoc(noteRef, { description: editText });
            setEditingId(null);
        } catch (error) {
            console.error("Error updating note:", error);
            alert("Failed to update note");
        }
    };

    const deleteNote = async (id: string) => {
        if (!customerId) return;

        try {
            const noteRef = doc(db, "customers", customerId, "notes", id);
            await deleteDoc(noteRef);
        } catch (error) {
            console.error("Error deleting note:", error);
            alert("Failed to delete note");
        }
    };

    if (customerLoading || loading) {
        return <div className="p-8">Loading notes...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Notes</h2>

            {/* Add Note Section */}
            <div className="bg-white rounded-md border p-6 space-y-4">
                <div className="inline-flex">
                    <span className="flex items-center gap-2 px-3 py-1 bg-gray-900 text-white text-sm font-medium rounded-md">
                        <Plus className="h-3 w-3" /> New Note
                    </span>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Note description</label>
                    <Textarea
                        className="min-h-[120px] resize-none"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                    />
                </div>

                <div className="flex justify-end">
                    <Button
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={handleSaveNewNote}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
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
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search..." className="pl-9" />
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-[50%] font-semibold text-gray-900 bg-gray-100/50">Description</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Added From</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date Added</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Options</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No notes found. Add a note to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                notes.map((note) => (
                                    <TableRow key={note.id}>
                                        <TableCell className="align-top py-4">
                                            {editingId === note.id ? (
                                                <div className="space-y-2">
                                                    <Textarea
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        className="min-h-[100px]"
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={cancelEditing}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="bg-gray-900 hover:bg-gray-800 text-white"
                                                            onClick={() => saveEdit(note.id)}
                                                        >
                                                            Update note
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="whitespace-pre-wrap text-gray-600 text-sm leading-relaxed">
                                                    {note.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-top py-4 text-gray-700">{note.addedFrom}</TableCell>
                                        <TableCell className="align-top py-4 text-gray-700">{note.dateAdded}</TableCell>
                                        <TableCell className="align-top py-4">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-500 hover:text-gray-900"
                                                    onClick={() => startEditing(note)}
                                                    disabled={editingId !== null}
                                                >
                                                    <SquarePen className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                                                    onClick={() => deleteNote(note.id)}
                                                    disabled={editingId !== null}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-between p-4 border-t">
                        <div className="text-sm text-muted-foreground">
                            Showing {notes.length} entries
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" disabled className="text-gray-500">Previous</Button>
                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 bg-gray-200 text-gray-900">1</Button>
                            <Button variant="ghost" size="sm" disabled className="text-gray-500">Next</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
