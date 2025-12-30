"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import type { Lead } from "@/lib/types";

interface ConvertLeadWizardProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onConvert: (leadId: string, overrides: { company?: string; email?: string }) => Promise<string>;
}

export function ConvertLeadWizard({ open, onClose, lead, onConvert }: ConvertLeadWizardProps) {
    const [step, setStep] = useState(1);
    const [company, setCompany] = useState(lead?.company || "");
    const [email, setEmail] = useState(lead?.email || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!lead) return null;

    const handleNext = () => {
        if (!company.trim() && !lead.company) {
            setError("Company name is required.");
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleConvert = async () => {
        setLoading(true);
        setError(null);
        try {
            await onConvert(lead.id, {
                company: company || lead.company || lead.name, // Fallback logic handled in hook too, but explicit here
                email: email || lead.email,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to convert lead.");
        } finally {
            setLoading(false);
        }
    };

    const isMissingData = !lead.company || !lead.email;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Convert Lead to Customer</DialogTitle>
                    <DialogDescription>Turn this lead into an active customer and transfer all data.</DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-6 py-4">
                        {isMissingData && (
                            <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Missing Information</AlertTitle>
                                <AlertDescription>
                                    Some required fields are missing. Please provide them to continue.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="company">Company / Customer Name *</Label>
                                <Input
                                    id="company"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder="Enter company name"
                                    defaultValue={lead.company}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Primary Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    defaultValue={lead.email}
                                />
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 py-4">
                        <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-3">
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Ready to Convert</span>
                            </div>
                            <p className="text-sm text-green-800">The following will be created:</p>
                            <ul className="list-disc list-inside text-sm text-green-800 ml-1 space-y-1">
                                <li>
                                    New Customer: <strong>{company || lead.company || lead.name}</strong>
                                </li>
                                <li>
                                    Primary Contact: <strong>{lead.name}</strong>
                                </li>
                                <li>All tasks, notes, and records will be transferred.</li>
                                <li>The original lead will be deleted.</li>
                            </ul>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleNext}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                                Back
                            </Button>
                            <Button
                                onClick={handleConvert}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                Confirm Conversion
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
