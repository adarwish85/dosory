"use client";

import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useWizard } from "../OnboardingWizard";

export default function WelcomeStep() {
    const { useDummyData, setUseDummyData, goNext } = useWizard();

    return (
        <div className="text-center space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-8 mx-auto max-w-md">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Welcome to Dosory! 🎉</h1>
                <p className="text-blue-100">Let&apos;s set up your workspace in just a few minutes.</p>
            </div>

            {/* What we'll do */}
            <div className="text-left bg-gray-50 rounded-xl p-5 space-y-3 max-w-md mx-auto">
                <h3 className="font-medium text-gray-900 mb-3">Here&apos;s what we&apos;ll cover:</h3>
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        1
                    </div>
                    <p className="text-sm text-gray-600">Set up your company profile & logo</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        2
                    </div>
                    <p className="text-sm text-gray-600">Add your first customer</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        3
                    </div>
                    <p className="text-sm text-gray-600">Create your first invoice</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        4
                    </div>
                    <p className="text-sm text-gray-600">Invite your team members</p>
                </div>
            </div>

            {/* Dummy Data Option */}
            <div className="flex items-center justify-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
                <Checkbox
                    id="dummy-data"
                    checked={useDummyData}
                    onCheckedChange={(checked) => setUseDummyData(checked as boolean)}
                />
                <Label htmlFor="dummy-data" className="text-sm text-amber-800 cursor-pointer">
                    Use demo data (we&apos;ll clean up after onboarding)
                </Label>
            </div>

            {/* CTA Button */}
            <Button onClick={goNext} size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
