"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, Mail, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Lead } from "@/lib/types";

interface ConvertLeadWizardProps {
    open: boolean;
    onClose: () => void;
    lead: Lead;
    onConvert: (leadId: string, overrides: { company?: string; email?: string }) => Promise<string>;
}

type WizardStep = "collect_data" | "confirm" | "converting" | "success" | "error";

export function ConvertLeadWizard({ open, onClose, lead, onConvert }: ConvertLeadWizardProps) {
    const [step, setStep] = useState<WizardStep>("collect_data");
    const [company, setCompany] = useState(lead.company || "");
    const [email, setEmail] = useState(lead.email || "");
    const [error, setError] = useState<string | null>(null);
    const [newCustomerId, setNewCustomerId] = useState<string | null>(null);

    const needsCompany = !lead.company;
    const needsEmail = !lead.email;
    const needsData = needsCompany || needsEmail;

    const canProceed = company.trim() !== "" && email.trim() !== "";

    const handleNext = () => {
        if (step === "collect_data") {
            setStep("confirm");
        }
    };

    const handleConvert = async () => {
        setStep("converting");
        setError(null);

        try {
            const customerId = await onConvert(lead.id, {
                company: needsCompany ? company : undefined,
                email: needsEmail ? email : undefined,
            });
            setNewCustomerId(customerId);
            setStep("success");
        } catch (err) {
            console.error("Conversion failed:", err);
            setError(err instanceof Error ? err.message : "Conversion failed");
            setStep("error");
        }
    };

    const handleClose = () => {
        // Reset state on close
        setStep("collect_data");
        setCompany(lead.company || "");
        setEmail(lead.email || "");
        setError(null);
        setNewCustomerId(null);
        onClose();
    };

    const renderStepContent = () => {
        switch (step) {
            case "collect_data":
                return (
                    <div className="space-y-4">
                        {needsData && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Some information is missing. Please fill in the required fields below.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="company" className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Company Name {needsCompany && <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                    id="company"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder="Enter company name"
                                    disabled={!needsCompany}
                                    className={!needsCompany ? "bg-gray-50" : ""}
                                />
                                {!needsCompany && (
                                    <p className="text-xs text-gray-500">Using existing company name from lead</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Contact Email {needsEmail && <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter contact email"
                                    disabled={!needsEmail}
                                    className={!needsEmail ? "bg-gray-50" : ""}
                                />
                                {!needsEmail && (
                                    <p className="text-xs text-gray-500">Using existing email from lead</p>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case "confirm":
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            The following will be created when you convert this lead:
                        </p>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-medium">Customer Record</p>
                                    <p className="text-sm text-gray-600">{company}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-medium">Primary Contact</p>
                                    <p className="text-sm text-gray-600">{lead.name} ({email})</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-medium">Data Transfer</p>
                                    <p className="text-sm text-gray-600">
                                        Proposals, estimates, and tasks will be linked to the new customer
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                The lead record will be deleted after conversion. This action cannot be undone.
                            </AlertDescription>
                        </Alert>
                    </div>
                );

            case "converting":
                return (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-gray-600">Converting lead to customer...</p>
                    </div>
                );

            case "success":
                return (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-lg">Conversion Complete!</p>
                            <p className="text-gray-600 text-sm mt-1">
                                Customer "{company}" has been created successfully.
                            </p>
                        </div>
                    </div>
                );

            case "error":
                return (
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                {error || "An error occurred during conversion. Please try again."}
                            </AlertDescription>
                        </Alert>
                    </div>
                );
        }
    };

    const renderFooter = () => {
        switch (step) {
            case "collect_data":
                return (
                    <>
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button onClick={handleNext} disabled={!canProceed}>
                            Continue <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </>
                );

            case "confirm":
                return (
                    <>
                        <Button variant="outline" onClick={() => setStep("collect_data")}>Back</Button>
                        <Button onClick={handleConvert} className="bg-green-600 hover:bg-green-700">
                            Convert to Customer
                        </Button>
                    </>
                );

            case "converting":
                return null;

            case "success":
                return (
                    <Button onClick={handleClose} className="w-full">
                        Close
                    </Button>
                );

            case "error":
                return (
                    <>
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button onClick={() => setStep("confirm")}>Try Again</Button>
                    </>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {step === "success" ? "Success" : "Convert Lead to Customer"}
                    </DialogTitle>
                    {step !== "success" && step !== "converting" && (
                        <DialogDescription>
                            {step === "collect_data" && "Review and complete the information below."}
                            {step === "confirm" && "Confirm the conversion details."}
                            {step === "error" && "There was a problem with the conversion."}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="py-4">
                    {renderStepContent()}
                </div>

                <DialogFooter className="flex gap-2">
                    {renderFooter()}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
