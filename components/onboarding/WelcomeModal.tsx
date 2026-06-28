"use client";

import { useState } from "react";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useOnboardingContext } from "./OnboardingProvider";
import { USE_CASE_OPTIONS } from "@/lib/onboarding-types";
import type { OnboardingUseCase } from "@/lib/onboarding-types";
import { cn } from "@/lib/utils";

export default function WelcomeModal() {
    const { t } = useTranslation();
    const { showWelcome, setShowWelcome, setUseCase, skipOnboarding, state } = useOnboardingContext();
    const [selected, setSelected] = useState<OnboardingUseCase | null>(null);
    const [step, setStep] = useState<"welcome" | "usecase">("welcome");

    if (!showWelcome) return null;

    const handleContinue = async () => {
        if (step === "welcome") {
            setStep("usecase");
        } else if (selected) {
            await setUseCase(selected);
        }
    };

    const handleSkip = async () => {
        await skipOnboarding();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Gradient header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8" />
                    </div>
                    {step === "welcome" ? (
                        <>
                            <h1 className="text-2xl font-bold mb-2">{t("onboarding.welcome.title")}</h1>
                            <p className="text-blue-100">{t("onboarding.welcome.subtitle")}</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold mb-2">{t("onboarding.welcome.useCaseTitle")}</h1>
                            <p className="text-blue-100">{t("onboarding.welcome.useCaseSubtitle")}</p>
                        </>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === "welcome" ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                                    1
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">{t("onboarding.welcome.step1.title")}</h3>
                                    <p className="text-sm text-gray-500">{t("onboarding.welcome.step1.desc")}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">
                                    2
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">{t("onboarding.welcome.step2.title")}</h3>
                                    <p className="text-sm text-gray-500">{t("onboarding.welcome.step2.desc")}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-bold">
                                    3
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">{t("onboarding.welcome.step3.title")}</h3>
                                    <p className="text-sm text-gray-500">{t("onboarding.welcome.step3.desc")}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {USE_CASE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setSelected(option.value as OnboardingUseCase)}
                                    className={cn(
                                        "p-4 rounded-xl border-2 text-left transition-all",
                                        selected === option.value
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                >
                                    <div className="text-2xl mb-2">{option.icon}</div>
                                    <h3 className="font-medium text-gray-900 text-sm">{option.label}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                    <Button variant="ghost" onClick={handleSkip} className="text-gray-500">
                        {t("onboarding.welcome.skipForNow")}
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={step === "usecase" && !selected}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {step === "welcome" ? t("onboarding.welcome.getStarted") : t("common.continue")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
