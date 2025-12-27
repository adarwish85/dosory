"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { v4 as uuidv4 } from 'uuid';

export type StickyNoteColor = "yellow" | "blue" | "green" | "pink" | "purple" | "orange";

export interface StickyNote {
    id: string;
    content: string;
    color: StickyNoteColor;
    position: { x: number; y: number };
    isOpen: boolean;
    createdAt: number;
    updatedAt: number;
}

interface StickyNotesState {
    notes: StickyNote[];
    isLoading: boolean;

    // Actions
    addNote: () => void;
    updateNote: (id: string, updates: Partial<StickyNote>) => void;
    deleteNote: (id: string) => void;
    toggleNoteOpen: (id: string, isOpen: boolean) => void;

    // Persistence
    loadFromFirestore: (userId: string) => Promise<void>;
    syncToFirestore: (userId: string) => Promise<void>;
}

const DEFAULT_NOTE: Partial<StickyNote> = {
    content: "",
    color: "yellow",
    position: { x: 100, y: 100 },
    isOpen: true,
};

export const useStickyNotes = create<StickyNotesState>()(
    persist(
        (set, get) => ({
            notes: [],
            isLoading: false,

            addNote: () => {
                const newNote: StickyNote = {
                    id: uuidv4(),
                    ...DEFAULT_NOTE,
                    position: { x: 100 + (get().notes.length * 20), y: 100 + (get().notes.length * 20) }, // Cascade positions
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                } as StickyNote;

                set(state => ({ notes: [...state.notes, newNote] }));
            },

            updateNote: (id, updates) => {
                set(state => ({
                    notes: state.notes.map(note =>
                        note.id === id
                            ? { ...note, ...updates, updatedAt: Date.now() }
                            : note
                    )
                }));
            },

            deleteNote: (id) => {
                set(state => ({
                    notes: state.notes.filter(note => note.id !== id)
                }));
            },

            toggleNoteOpen: (id, isOpen) => {
                set(state => ({
                    notes: state.notes.map(note =>
                        note.id === id
                            ? { ...note, isOpen }
                            : note
                    )
                }));
            },

            loadFromFirestore: async (userId) => {
                if (!userId) return;
                set({ isLoading: true });
                try {
                    const docRef = doc(db, "users", userId, "settings", "stickyNotes");
                    const snap = await getDoc(docRef);

                    if (snap.exists() && snap.data().notes) {
                        set({ notes: snap.data().notes });
                    }
                } catch (error) {
                    console.error("Failed to load sticky notes", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            syncToFirestore: async (userId) => {
                if (!userId) return;
                try {
                    const docRef = doc(db, "users", userId, "settings", "stickyNotes");
                    await setDoc(docRef, {
                        notes: get().notes,
                        updatedAt: Date.now()
                    }, { merge: true });
                } catch (error) {
                    console.error("Failed to sync sticky notes", error);
                }
            }
        }),
        {
            name: 'sticky-notes-storage',
            partialize: (state) => ({ notes: state.notes }),
        }
    )
);
