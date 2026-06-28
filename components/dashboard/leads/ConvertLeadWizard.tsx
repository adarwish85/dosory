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
import { useTranslation } from "@/lib/i18n";

interface ConvertLeadWizardProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onConvert: (lead: Lead, overrides: { company?: string; email?: string }) => Promise<string>;
}

export function ConvertLeadWizard({ open, onClose, lead, onConvert }: ConvertLeadWizardProps) {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [company, setCompany] = useState(lead?.company || "");
    const [email, setEmail] = useState(lead?.email || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!lead) return null;

    const handleNext = () => {
        if (!company.trim() && !lead.company) {
            setError(t("leads.convertWizard.companyRequired"));
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleConvert = async () => {
        if (!lead) return;
        setLoading(true);
        setError(null);
        try {
            await onConvert(lead, {
                company: company || lead.company || lead.name, // Fallback logic handled in hook too, but explicit here
                email: email || lead.email,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("leads.convertWizard.convertFailed"));
        } finally {
            setLoading(false);
        }
    };

    const isMissingData = !lead.company || !lead.email;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("leads.convertWizard.title")}</DialogTitle>
                    <DialogDescription>{t("leads.convertWizard.description")}</DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-6 py-4">
                        {isMissingData && (
                            <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{t("leads.convertWizard.missingInfoTitle")}</AlertTitle>
                                <AlertDescription>
                                    {t("leads.convertWizard.missingInfoDesc")}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="company">{t("leads.convertWizard.companyLabel")}</Label>
                                <Input
                                    id="company"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder={t("leads.convertWizard.companyPlaceholder")}
                                    defaultValue={lead.company}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t("leads.convertWizard.primaryEmail")}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("leads.convertWizard.emailPlaceholder")}
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
                                <span>{t("leads.convertWizard.readyToConvert")}</span>
                            </div>
                            <p className="text-sm text-green-800">{t("leads.convertWizard.willBeCreated")}</p>
                            <ul className="list-disc list-inside text-sm text-green-800 ml-1 space-y-1">
                                <li>
                                    {t("leads.convertWizard.newCustomer")}{" "}
                                    <strong>{company || lead.company || lead.name}</strong>
                                </li>
                                <li>
                                    {t("leads.convertWizard.primaryContact")} <strong>{lead.name}</strong>
                                </li>
                                <li>{t("leads.convertWizard.recordsTransferred")}</li>
                                <li>{t("leads.convertWizard.originalDeleted")}</li>
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
                                {t("common.cancel")}
                            </Button>
                            <Button onClick={handleNext}>
                                {t("leads.convertWizard.next")} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                                {t("leads.convertWizard.back")}
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
                                {t("leads.convertWizard.confirmConversion")}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
