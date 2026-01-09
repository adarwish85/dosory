"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { OnboardingState, OnboardingRole, OnboardingUseCase } from "@/lib/onboarding-types";
import { DEFAULT_ONBOARDING_STATE } from "@/lib/onboarding-types";

export function useOnboarding() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
    const [loading, setLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);

    // Load onboarding state from Firestore
    useEffect(() => {
        if (profileLoading || !profile?.uid) return;

        const loadState = async () => {
            try {
                const docRef = doc(db, "users", profile.uid, "onboarding", "state");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setState({
                        ...DEFAULT_ONBOARDING_STATE,
                        ...data,
                        startedAt: data.startedAt?.toDate() || null,
                        completedAt: data.completedAt?.toDate() || null,
                        skippedAt: data.skippedAt?.toDate() || null,
                    });
                    setShowWelcome(!data.completed && !data.steps?.welcome);
                } else {
                    // First time user - show welcome
                    setShowWelcome(true);
                    await initializeOnboarding(profile.role === "admin" ? "admin" : "staff");
                }
            } catch (error) {
                console.error("Error loading onboarding state:", error);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, [profile?.uid, profileLoading]);

    // Initialize onboarding for new user
    const initializeOnboarding = useCallback(
        async (role: OnboardingRole) => {
            if (!profile?.uid) return;

            const initialState: OnboardingState = {
                ...DEFAULT_ONBOARDING_STATE,
                role,
                startedAt: new Date(),
            };

            try {
                await setDoc(doc(db, "users", profile.uid, "onboarding", "state"), {
                    ...initialState,
                    startedAt: serverTimestamp(),
                });
                setState(initialState);
                trackEvent("onboarding_started", { role });
            } catch (error) {
                console.error("Error initializing onboarding:", error);
            }
        },
        [profile?.uid]
    );

    // Update a specific step
    const completeStep = useCallback(
        async (step: keyof OnboardingState["steps"]) => {
            if (!profile?.uid) return;

            const newSteps = { ...state.steps, [step]: true };
            const allComplete = Object.values(newSteps).every(Boolean);
            const nextStep = Object.values(newSteps).filter(Boolean).length;

            try {
                await updateDoc(doc(db, "users", profile.uid, "onboarding", "state"), {
                    [`steps.${step}`]: true,
                    currentStep: nextStep,
                    ...(allComplete && { completed: true, completedAt: serverTimestamp() }),
                });

                setState((prev) => ({
                    ...prev,
                    steps: newSteps,
                    currentStep: nextStep,
                    completed: allComplete,
                    completedAt: allComplete ? new Date() : null,
                }));

                trackEvent("onboarding_step_completed", { step });
                if (allComplete) {
                    trackEvent("onboarding_completed", {});
                }
            } catch (error) {
                console.error("Error completing step:", error);
            }
        },
        [profile?.uid, state.steps]
    );

    // Set use case
    const setUseCase = useCallback(
        async (useCase: OnboardingUseCase) => {
            if (!profile?.uid) return;

            try {
                await updateDoc(doc(db, "users", profile.uid, "onboarding", "state"), {
                    useCase,
                    "steps.welcome": true,
                    currentStep: 1,
                });

                setState((prev) => ({
                    ...prev,
                    useCase,
                    steps: { ...prev.steps, welcome: true },
                    currentStep: 1,
                }));

                trackEvent("onboarding_usecase_selected", { useCase });
                setShowWelcome(false);
            } catch (error) {
                console.error("Error setting use case:", error);
            }
        },
        [profile?.uid]
    );

    // Skip onboarding
    const skipOnboarding = useCallback(async () => {
        if (!profile?.uid) return;

        try {
            await updateDoc(doc(db, "users", profile.uid, "onboarding", "state"), {
                skippedAt: serverTimestamp(),
                completed: true,
            });

            setState((prev) => ({
                ...prev,
                skippedAt: new Date(),
                completed: true,
            }));

            setShowWelcome(false);
            trackEvent("onboarding_skipped", { step: state.currentStep });
        } catch (error) {
            console.error("Error skipping onboarding:", error);
        }
    }, [profile?.uid, state.currentStep]);

    // Track analytics event
    const trackEvent = useCallback(
        async (event: string, metadata: Record<string, any>) => {
            if (!profile?.uid || !profile?.orgId) return;

            try {
                await addDoc(collection(db, "analytics", "onboarding", "events"), {
                    userId: profile.uid,
                    orgId: profile.orgId,
                    event,
                    metadata,
                    timestamp: serverTimestamp(),
                });
            } catch (error) {
                console.error("Error tracking event:", error);
            }
        },
        [profile?.uid, profile?.orgId]
    );

    // Calculate progress
    const progress = Object.values(state.steps).filter(Boolean).length / Object.keys(state.steps).length;

    return {
        state,
        loading,
        showWelcome,
        setShowWelcome,
        progress,
        completeStep,
        setUseCase,
        skipOnboarding,
        trackEvent,
    };
}
