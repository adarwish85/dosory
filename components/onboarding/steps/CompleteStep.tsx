"use client";

import React, { useState, useEffect } from "react";
import { PartyPopper, CheckCircle2, Trash2, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "../OnboardingWizard";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useOnboardingContext } from "../OnboardingProvider";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import confetti from "canvas-confetti";
import { useTranslation } from "@/lib/i18n";

export default function CompleteStep() {
    const { useDummyData, createdCustomerId, createdInvoiceId, completeWizard } = useWizard();
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const { skipOnboarding } = useOnboardingContext();
    const orgId = profile?.orgId;
    const [isResetting, setIsResetting] = useState(false);
    const [resetComplete, setResetComplete] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);

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
                colors: ["#3b82f6", "#8b5cf6", "#06b6d4"],
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ["#3b82f6", "#8b5cf6", "#06b6d4"],
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, []);

    const handleResetDemoData = async () => {
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

            // Delete any demo invitations (only if orgId exists)
            if (orgId) {
                const invitationsQuery = query(
                    collection(db, "invitations"),
                    where("orgId", "==", orgId),
                    where("isOnboardingDemo", "==", true)
                );
                const invitationsSnap = await getDocs(invitationsQuery);
                for (const docSnap of invitationsSnap.docs) {
                    await deleteDoc(docSnap.ref);
                }
            }

            setResetComplete(true);
        } catch (error) {
            console.error("Error resetting demo data:", error);
            // Still mark as complete so user can proceed
            setResetComplete(true);
        } finally {
            setIsResetting(false);
        }
    };

    const handleFinish = async () => {
        setIsFinishing(true);
        try {
            await completeWizard();
        } catch (error) {
            console.error("Error completing wizard:", error);
            // Fallback: close wizard even if Firestore fails
            await skipOnboarding();
        }
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
                <h2 className="text-2xl font-bold text-gray-900">{t("onboarding.complete.title")}</h2>
                <p className="text-gray-500 mt-2">{t("onboarding.complete.subtitle")}</p>
            </div>

            {/* Accomplishments */}
            <div className="bg-gray-50 rounded-xl p-5 max-w-md mx-auto text-left space-y-3">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">{t("onboarding.complete.taskCompany")}</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">{t("onboarding.complete.taskCustomer")}</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">{t("onboarding.complete.taskInvoice")}</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">{t("onboarding.complete.taskTeam")}</span>
                </div>
            </div>

            {/* Reset Demo Data (only if dummy data was used) */}
            {useDummyData && !resetComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-sm text-amber-800 mb-3">
                        {t("onboarding.complete.demoPrompt")}
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
                                {t("onboarding.complete.resetting")}
                            </>
                        ) : (
                            <>
                                <RotateCcw className="h-4 w-4" />
                                {t("onboarding.complete.resetButton")}
                            </>
                        )}
                    </Button>
                </div>
            )}

            {resetComplete && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-sm text-green-800 flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {t("onboarding.complete.resetDone")}
                    </p>
                </div>
            )}

            {/* Go to Dashboard */}
            <Button onClick={handleFinish} size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2">
                {t("onboarding.complete.goToDashboard")}
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
