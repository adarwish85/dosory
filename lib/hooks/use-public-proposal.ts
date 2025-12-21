"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PublicProposal {
    id: string;
    number: string;
    subject: string;
    status: "draft" | "sent" | "open" | "revised" | "declined" | "accepted";
    total: number;
    currency: string;
    openTill: string;
    content: string;
    items: Array<{
        description: string;
        quantity: number;
        rate: number;
        total: number;
    }>;
    customerName: string;
    customerEmail: string;
    createdAt: string;
    expired: boolean;
}

// Fetch proposal by public token (no auth required)
export function usePublicProposal(token: string) {
    const [proposal, setProposal] = useState<PublicProposal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProposal() {
            if (!token) {
                setError("Invalid token");
                setLoading(false);
                return;
            }

            try {
                // Token is the proposal ID for simplicity - in production use a secure hash
                const docRef = doc(db, "proposals", token);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const openTill = data.openTill?.toDate?.() || new Date(data.openTill);
                    const expired = new Date() > openTill;

                    setProposal({
                        id: docSnap.id,
                        ...data,
                        openTill: openTill.toISOString(),
                        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                        expired,
                    } as PublicProposal);
                } else {
                    setError("Proposal not found");
                }
            } catch (err) {
                console.error("Error fetching proposal:", err);
                setError("Failed to load proposal");
            } finally {
                setLoading(false);
            }
        }

        fetchProposal();
    }, [token]);

    const acceptProposal = async () => {
        if (!proposal) return { success: false, error: "No proposal" };

        if (proposal.expired) {
            return { success: false, error: "This proposal has expired" };
        }

        if (proposal.status === "accepted") {
            return { success: false, error: "Already accepted" };
        }

        try {
            const docRef = doc(db, "proposals", proposal.id);
            await updateDoc(docRef, {
                status: "accepted",
                acceptedAt: serverTimestamp(),
                clientAccepted: true,
            });

            setProposal(prev => prev ? { ...prev, status: "accepted" } : null);
            return { success: true };
        } catch (err) {
            console.error("Error accepting proposal:", err);
            return { success: false, error: "Failed to accept proposal" };
        }
    };

    const declineProposal = async (reason?: string) => {
        if (!proposal) return { success: false, error: "No proposal" };

        try {
            const docRef = doc(db, "proposals", proposal.id);
            await updateDoc(docRef, {
                status: "declined",
                declinedAt: serverTimestamp(),
                declineReason: reason || "",
            });

            setProposal(prev => prev ? { ...prev, status: "declined" } : null);
            return { success: true };
        } catch (err) {
            console.error("Error declining proposal:", err);
            return { success: false, error: "Failed to decline proposal" };
        }
    };

    return { proposal, loading, error, acceptProposal, declineProposal };
}
