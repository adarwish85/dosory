"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStickyNotes, type StickyNote, type StickyNoteColor } from "@/lib/hooks/use-sticky-notes";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

const COLORS: Record<StickyNoteColor, string> = {
    yellow: "bg-yellow-100 border-yellow-200 text-yellow-900",
    blue: "bg-blue-100 border-blue-200 text-blue-900",
    green: "bg-green-100 border-green-200 text-green-900",
    pink: "bg-pink-100 border-pink-200 text-pink-900",
    purple: "bg-purple-100 border-purple-200 text-purple-900",
    orange: "bg-orange-100 border-orange-200 text-orange-900",
};

interface StickyNoteProps {
    note: StickyNote;
    onUpdate: (id: string, updates: Partial<StickyNote>) => void;
    onDelete: (id: string) => void;
    onMinimize: (id: string) => void;
}

export function StickyNoteCard({ note, onUpdate, onDelete, onMinimize }: StickyNoteProps) {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const newX = e.clientX - dragOffset.current.x;
            const newY = e.clientY - dragOffset.current.y;

            // Simple boundary checks (optional, but good)
            const maxX = window.innerWidth - 200;
            const maxY = window.innerHeight - 200;

            onUpdate(note.id, {
                position: {
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY)),
                },
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, note.id, onUpdate]);

    return (
        <div
            className={cn(
                "fixed w-64 h-64 rounded-lg shadow-xl border flex flex-col z-40 transition-colors duration-200 pointer-events-auto",
                COLORS[note.color]
            )}
            style={{
                left: note.position.x,
                top: note.position.y,
                cursor: isDragging ? "grabbing" : "auto",
            }}
        >
            {/* Header / Drag Handle */}
            <div
                className="h-8 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
            >
                {/* Color Picker */}
                <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                    {(Object.keys(COLORS) as StickyNoteColor[]).map((c) => (
                        <button
                            key={c}
                            className={cn(
                                "w-3 h-3 rounded-full border border-black/10 hover:scale-125 transition-transform",
                                COLORS[c].split(" ")[0], // Get bg color class
                                note.color === c && "ring-1 ring-black/30"
                            )}
                            onClick={() => onUpdate(note.id, { color: c })}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-black/10 text-inherit"
                        onClick={() => onMinimize(note.id)}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-black/10 text-inherit hover:text-red-600"
                        onClick={() => onDelete(note.id)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <textarea
                className="flex-1 w-full bg-transparent resize-none border-none p-4 focus:ring-0 focus:outline-none text-sm leading-relaxed placeholder-black/30 text-inherit"
                placeholder={t("dashboard.stickyNotes.placeholder")}
                value={note.content}
                onChange={(e) => onUpdate(note.id, { content: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
            />
        </div>
    );
}

export function StickyNotesBoard() {
    const { notes, updateNote, deleteNote, toggleNoteOpen } = useStickyNotes();
    const openNotes = notes.filter((n) => n.isOpen);

    if (openNotes.length === 0) return null;

    return (
        <>
            {openNotes.map((note) => (
                <StickyNoteCard
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onMinimize={(id) => toggleNoteOpen(id, false)}
                />
            ))}
        </>
    );
}
