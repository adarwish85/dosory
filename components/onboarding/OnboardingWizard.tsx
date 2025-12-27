"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOnboardingContext } from "./OnboardingProvider";

// Step components (will be created next)
import WelcomeStep from "./steps/WelcomeStep";
import CompanyProfileStep from "./steps/CompanyProfileStep";
import AddCustomerStep from "./steps/AddCustomerStep";
import CreateInvoiceStep from "./steps/CreateInvoiceStep";
import InviteTeamStep from "./steps/InviteTeamStep";
import CompleteStep from "./steps/CompleteStep";

const STEPS = [
    { key: "welcome", title: "Welcome", component: WelcomeStep },
    { key: "companyProfile", title: "Company Profile", component: CompanyProfileStep },
    { key: "addCustomer", title: "Add Customer", component: AddCustomerStep },
    { key: "createInvoice", title: "Create Invoice", component: CreateInvoiceStep },
    { key: "inviteTeam", title: "Invite Team", component: InviteTeamStep },
    { key: "complete", title: "Complete", component: CompleteStep },
];

interface WizardContextType {
    currentStep: number;
    totalSteps: number;
    useDummyData: boolean;
    setUseDummyData: (val: boolean) => void;
    goNext: () => void;
    goPrev: () => void;
    skipStep: () => void;
    completeWizard: () => void;
    createdCustomerId: string | null;
    setCreatedCustomerId: (id: string | null) => void;
    createdInvoiceId: string | null;
    setCreatedInvoiceId: (id: string | null) => void;
}

export const WizardContext = React.createContext<WizardContextType | null>(null);

export function useWizard() {
    const ctx = React.useContext(WizardContext);
    if (!ctx) throw new Error("useWizard must be used within OnboardingWizard");
    return ctx;
}

export default function OnboardingWizard() {
    const { state, showWelcome, skipOnboarding, completeStep } = useOnboardingContext();
    const [currentStep, setCurrentStep] = useState(0);
    const [useDummyData, setUseDummyData] = useState(false);
    const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
    const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    // Don't show if onboarding is completed or not showing welcome
    if (!showWelcome || state.completed) return null;

    const totalSteps = STEPS.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    const goNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const goPrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const skipStep = () => {
        goNext();
    };

    const completeWizard = async () => {
        setIsClosing(true);
        try {
            // Mark all steps as complete
            await completeStep("welcome");
            await completeStep("companyProfile");
            await completeStep("firstRecord");
            await completeStep("inviteTeam");
            await completeStep("integrations");
        } catch (error) {
            console.error("Error completing onboarding steps:", error);
        }
        // Always close the wizard, even if step completion fails
        await skipOnboarding();
    };

    const handleClose = async () => {
        await skipOnboarding();
    };

    const CurrentStepComponent = STEPS[currentStep].component;

    return (
        <WizardContext.Provider value={{
            currentStep,
            totalSteps,
            useDummyData,
            setUseDummyData,
            goNext,
            goPrev,
            skipStep,
            completeWizard,
            createdCustomerId,
            setCreatedCustomerId,
            createdInvoiceId,
            setCreatedInvoiceId,
        }}>
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Progress Bar */}
                    <div className="h-1 bg-gray-200">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                                Step {currentStep + 1} of {totalSteps}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                                {STEPS[currentStep].title}
                            </span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Step Content */}
                    <div className="p-6 min-h-[400px]">
                        <CurrentStepComponent />
                    </div>

                    {/* Footer Navigation */}
                    {currentStep < totalSteps - 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                            <Button
                                variant="ghost"
                                onClick={goPrev}
                                disabled={currentStep === 0}
                                className="gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>

                            <div className="flex items-center gap-2">
                                {/* Step indicators */}
                                {STEPS.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-colors",
                                            idx === currentStep
                                                ? "bg-blue-600"
                                                : idx < currentStep
                                                    ? "bg-blue-300"
                                                    : "bg-gray-300"
                                        )}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                {currentStep > 0 && currentStep < totalSteps - 1 && (
                                    <Button variant="ghost" onClick={skipStep} className="text-gray-500">
                                        Skip
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </WizardContext.Provider>
    );
}
