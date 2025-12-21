"use client";

import { createContext, useContext, ReactNode } from "react";
import { useOnboarding } from "@/lib/hooks/use-onboarding";
import type { OnboardingState, OnboardingUseCase } from "@/lib/onboarding-types";

interface OnboardingContextValue {
    state: OnboardingState;
    loading: boolean;
    showWelcome: boolean;
    setShowWelcome: (show: boolean) => void;
    progress: number;
    completeStep: (step: keyof OnboardingState["steps"]) => Promise<void>;
    setUseCase: (useCase: OnboardingUseCase) => Promise<void>;
    skipOnboarding: () => Promise<void>;
    trackEvent: (event: string, metadata: Record<string, any>) => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const onboarding = useOnboarding();

    return (
        <OnboardingContext.Provider value={onboarding}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboardingContext() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboardingContext must be used within OnboardingProvider");
    }
    return context;
}
