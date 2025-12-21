"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Star } from "lucide-react";
import { SubscriptionPayPalButton } from "@/components/subscription/paypal-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SubscriptionPlan } from "@/app/bunny/subscriptions/page"; // Reuse interface

export default function PlanSelectionPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const router = useRouter();

    useEffect(() => {
        const loadPlans = async () => {
            try {
                const q = query(
                    collection(db, "platform", "subscriptionPlans", "plans"),
                    where("isActive", "==", true)
                );
                const snapshot = await getDocs(q);
                const loadedPlans = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Normalize same as admin
                    return {
                        ...data,
                        id: doc.id,
                        prices: data.prices || { monthly: data.price || 0, yearly: (data.price || 0) * 10 },
                        features: data.features || [],
                        modules: data.modules || []
                    } as SubscriptionPlan;
                });
                // Client-side sort if needed
                setPlans(loadedPlans.sort((a, b) => a.sortOrder - b.sortOrder));
            } catch (error) {
                console.error("Error loading plans:", error);
                toast.error("Failed to load plans");
            } finally {
                setLoading(false);
            }
        };
        loadPlans();
    }, []);

    const handleSuccess = (details: any) => {
        toast.success("Subscription activated successfully!");
        setSelectedPlan(null);
        setTimeout(() => {
            router.push("/dashboard/subscriptions");
        }, 1500);
    };

    const handleError = (error: any) => {
        console.error("Payment error:", error);
        toast.error("Payment failed. Please try again.");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 max-w-6xl">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
                <p className="text-gray-500 mb-8">Select the perfect plan for your organization</p>

                <div className="flex items-center justify-center gap-4">
                    <span className={`font-medium ${billingPeriod === 'monthly' ? 'text-purple-600' : 'text-gray-500'}`}>Monthly</span>
                    <Switch
                        checked={billingPeriod === 'yearly'}
                        onCheckedChange={(c) => setBillingPeriod(c ? 'yearly' : 'monthly')}
                    />
                    <span className={`font-medium ${billingPeriod === 'yearly' ? 'text-purple-600' : 'text-gray-500'}`}>
                        Yearly <span className="text-xs text-green-500 font-normal ml-1">(Save ~20%)</span>
                    </span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <Card key={plan.id} className={`relative flex flex-col ${plan.isPopular ? 'border-purple-500 shadow-md scale-105' : ''}`}>
                        {plan.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" /> Most Popular
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <span>{plan.name}</span>
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">
                                    ${billingPeriod === 'monthly' ? plan.prices.monthly : plan.prices.yearly}
                                </span>
                                <span className="text-gray-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.slice(0, 6).map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => setSelectedPlan(plan)}
                                className={`w-full ${plan.isPopular ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                            >
                                Subscribe Now
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Subscribe to {selectedPlan?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">{selectedPlan?.name} ({billingPeriod})</p>
                                <p className="text-sm text-gray-500">{selectedPlan?.description}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">
                                    ${billingPeriod === 'monthly' ? selectedPlan?.prices.monthly : selectedPlan?.prices.yearly}
                                </p>
                                <p className="text-xs text-gray-500">
                                    /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-sm text-gray-500 mb-4 text-center">Complete payment securely with PayPal</p>
                            {selectedPlan && (
                                <SubscriptionPayPalButton
                                    amount={billingPeriod === 'monthly' ? selectedPlan.prices.monthly : selectedPlan.prices.yearly}
                                    planId={selectedPlan.id}
                                    billingPeriod={billingPeriod}
                                    description={`Subscription to ${selectedPlan.name} (${billingPeriod})`}
                                    onSuccess={handleSuccess}
                                    onError={handleError}
                                />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
