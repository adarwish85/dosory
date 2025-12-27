"use client";

import React, { useState } from "react";
import { User, Mail, Phone, Building2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWizard } from "../OnboardingWizard";
import { useAuth } from "@/components/auth-provider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AddCustomerStep() {
    const { goNext, useDummyData, setCreatedCustomerId } = useWizard();
    const { user } = useAuth();
    const orgId = (user as any)?.orgId;

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [company, setCompany] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Pre-fill with dummy data if selected
    React.useEffect(() => {
        if (useDummyData) {
            setName("John Smith");
            setEmail("john.smith@example.com");
            setPhone("+1 (555) 987-6543");
            setCompany("Smith Industries");
        }
    }, [useDummyData]);

    const handleSave = async () => {
        if (!orgId || !name) return;

        setIsSaving(true);
        try {
            // Create customer in Firestore
            const customerRef = await addDoc(collection(db, "customers"), {
                name,
                email: email || null,
                phone: phone || null,
                company: company || null,
                orgId,
                status: "active",
                isOnboardingDemo: useDummyData,
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
            });

            setCreatedCustomerId(customerRef.id);
            goNext();
        } catch (error) {
            console.error("Error creating customer:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Add Your First Customer</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {useDummyData
                        ? "We've pre-filled demo data for you. Feel free to edit!"
                        : "Enter your first customer's details"
                    }
                </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
                <div>
                    <Label htmlFor="customerName" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        Customer Name *
                    </Label>
                    <Input
                        id="customerName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="mt-1"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="customerEmail" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        Email
                    </Label>
                    <Input
                        id="customerEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="mt-1"
                    />
                </div>

                <div>
                    <Label htmlFor="customerPhone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        Phone
                    </Label>
                    <Input
                        id="customerPhone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="mt-1"
                    />
                </div>

                <div>
                    <Label htmlFor="customerCompany" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        Company
                    </Label>
                    <Input
                        id="customerCompany"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Acme Inc."
                        className="mt-1"
                    />
                </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !name}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            Create Customer
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
