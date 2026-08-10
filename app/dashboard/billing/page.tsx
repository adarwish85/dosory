"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { CreditCard, Loader2 } from "lucide-react";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

type Attempt = {
    id: string;
    numericRef: number;
    amount: number;
    currency: string;
    status: string;
    planName?: string;
    purpose?: string;
    voucher?: string;
    checkoutUrl?: string;
    createdAt?: { toDate: () => Date };
};

/**
 * The tenant's platform-billing page.
 *
 * It did not exist before this round: `components/subscription/paypal-button.tsx` was written
 * but never rendered anywhere (zero importers), so there was no way for a tenant to pay Dosory
 * from the product at all. Both providers now live here — EasyKash for card / wallet / Fawry /
 * Aman, PayPal for cards abroad.
 *
 * Attempt history is read straight from `billingAttempts`, which rules scope to the owning org
 * and no client may write.
 */
export default function BillingPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [mobile, setMobile] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!profile?.orgId) return;
        const q = query(
            collection(db, "billingAttempts"),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "desc"),
            limit(25)
        );
        const unsub = onSnapshot(
            q,
            (snap) => setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Attempt)),
            // Never render an error as "no history" — that is indistinguishable from a real zero.
            (err) => {
                console.error("[billing] could not load attempt history", err);
                setError(t("billing.historyError"));
            }
        );
        return () => unsub();
    }, [profile?.orgId, t]);

    const plans = useMemo(
        () => [
            { id: "plan_starter", cycle: "monthly" as const },
            { id: "plan_professional", cycle: "monthly" as const },
        ],
        []
    );

    const startEasyKash = async (planId: string, billingCycle: "monthly" | "annual") => {
        setBusy(planId);
        setError(null);
        try {
            const token = await getAuth().currentUser?.getIdToken();
            const res = await fetch("/api/billing/easykash/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ planId, billingCycle, mobile: mobile || undefined }),
            });
            const data = await res.json();
            if (!res.ok) {
                // Surface the server's reason — "this plan has no price" is actionable, a generic
                // "something went wrong" is not.
                setError(data.reason === "mobile-required" ? t("billing.mobileRequired") : data.error);
                return;
            }
            window.location.href = data.redirectUrl;
        } catch (e) {
            console.error("[billing] checkout failed", e);
            setError(t("billing.checkoutFailed"));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{t("billing.title")}</h2>
                <p className="text-gray-500">{t("billing.subtitle")}</p>
            </div>

            {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <Card>
                <CardHeader>
                    <CardTitle>{t("billing.payTitle")}</CardTitle>
                    <CardDescription>{t("billing.paySubtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-xs space-y-2">
                        <Label htmlFor="billing-mobile">{t("billing.mobileLabel")}</Label>
                        <Input
                            id="billing-mobile"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            inputMode="tel"
                        />
                        <p className="text-xs text-muted-foreground">{t("billing.mobileHint")}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {plans.map((p) => (
                            <Button
                                key={p.id}
                                onClick={() => startEasyKash(p.id, p.cycle)}
                                disabled={busy !== null}
                                className="justify-start"
                            >
                                {busy === p.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CreditCard className="mr-2 h-4 w-4" />
                                )}
                                {t("billing.payWithEasyKash")} — {p.id === "plan_starter" ? "Starter" : "Professional"}
                            </Button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("billing.easykashMethods")}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("billing.historyTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {attempts.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t("billing.historyEmpty")}</p>
                    ) : (
                        <div className="space-y-2">
                            {attempts.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {a.planName || a.id} · {a.currency} {Number(a.amount).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t("billing.reference")}: <span className="font-mono">{a.numericRef}</span>
                                            {a.voucher ? ` · ${t("billing.voucher")}: ${a.voucher}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {a.status === "pending" && a.checkoutUrl && (
                                            <a
                                                className="text-xs font-medium text-blue-600 underline"
                                                href={a.checkoutUrl}
                                            >
                                                {t("billing.resume")}
                                            </a>
                                        )}
                                        <Badge variant={a.status === "paid" ? "default" : "secondary"}>
                                            {t(`billing.status.${a.status}`)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
