"use client";

import React, { useState, useEffect } from "react";
import { PartyPopper, CheckCircle2, Trash2, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "../OnboardingWizard";
import { useAuth } from "@/components/auth-provider";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import confetti from "canvas-confetti";

export default function CompleteStep() {
    const { useDummyData, createdCustomerId, createdInvoiceId, completeWizard } = useWizard();
    const { user } = useAuth();
    const orgId = (user as any)?.orgId;
    const [isResetting, setIsResetting] = useState(false);
    const [resetComplete, setResetComplete] = useState(false);

    // Fire confetti on mount
    useEffect(() => {
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#3b82f6', '#8b5cf6', '#06b6d4'],
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#3b82f6', '#8b5cf6', '#06b6d4'],
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, []);

    const handleResetDemoData = async () => {
        if (!orgId) return;

        setIsResetting(true);
        try {
            // Delete created customer
            if (createdCustomerId) {
                await deleteDoc(doc(db, "customers", createdCustomerId));
            }

            // Delete created invoice
            if (createdInvoiceId) {
                await deleteDoc(doc(db, "invoices", createdInvoiceId));
            }

            // Delete any demo invitations
            const invitationsQuery = query(
                collection(db, "invitations"),
                where("orgId", "==", orgId),
                where("isOnboardingDemo", "==", true)
            );
            const invitationsSnap = await getDocs(invitationsQuery);
            for (const docSnap of invitationsSnap.docs) {
                await deleteDoc(docSnap.ref);
            }

            setResetComplete(true);
        } catch (error) {
            console.error("Error resetting demo data:", error);
        } finally {
            setIsResetting(false);
        }
    };

    const handleFinish = async () => {
        await completeWizard();
    };

    return (
        <div className="text-center space-y-6 py-6">
            {/* Celebration */}
            <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <PartyPopper className="h-10 w-10 text-white" />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-900">You&apos;re All Set! 🎉</h2>
                <p className="text-gray-500 mt-2">
                    Your workspace is ready to go. Here&apos;s what you accomplished:
                </p>
            </div>

            {/* Accomplishments */}
            <div className="bg-gray-50 rounded-xl p-5 max-w-md mx-auto text-left space-y-3">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">Company profile configured</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">First customer added</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">Invoice created</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">Team invitations sent</span>
                </div>
            </div>

            {/* Reset Demo Data (only if dummy data was used) */}
            {useDummyData && !resetComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-sm text-amber-800 mb-3">
                        You used demo data. Want to start fresh with a clean account?
                    </p>
                    <Button
                        variant="outline"
                        onClick={handleResetDemoData}
                        disabled={isResetting}
                        className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                        {isResetting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="h-4 w-4" />
                                Reset Demo Data
                            </>
                        )}
                    </Button>
                </div>
            )}

            {resetComplete && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-sm text-green-800 flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Demo data has been cleared. Your account is clean!
                    </p>
                </div>
            )}

            {/* Go to Dashboard */}
            <Button
                onClick={handleFinish}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
