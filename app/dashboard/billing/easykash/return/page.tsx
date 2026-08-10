"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { CheckCircle2, Clock, Loader2, Ticket, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

/**
 * Where EasyKash sends the buyer back to.
 *
 * THE QUERY PARAMS ARE DISPLAY ONLY. Anyone can craft this URL with `status=success`, so nothing
 * here grants anything — the truth is the `billingAttempts` document, which only the server
 * writes and only the signed callback can move to `paid`. The page shows the provider's
 * redirect immediately (so a buyer is not left staring at a blank screen) and then watches our
 * own document to confirm.
 *
 * The Fawry/Aman case is the reason this page has three states rather than two: the buyer has a
 * VOUCHER and has not paid yet. Telling them "payment pending" and hiding the number would send
 * them to a shop with nothing to quote.
 */
export default function EasyKashReturnPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useSearchParams();
    const { profile } = useUserProfile();

    const providerStatus = (params.get("status") || "").toLowerCase();
    const providerRefNum = params.get("providerRefNum") || "";
    const voucher = params.get("voucher") || "";
    const customerReference = params.get("customerReference") || "";

    const [confirmed, setConfirmed] = useState<"paid" | "failed" | "pending" | null>(null);
    const [watching, setWatching] = useState(true);

    // Poll our OWN record briefly. The callback usually lands before the buyer's browser gets
    // back, but a cash voucher may sit unpaid for hours — so give up watching after a while
    // rather than spinning forever.
    useEffect(() => {
        // Deferred, never synchronous inside the effect body: a synchronous setState here is a
        // cascading render (React Compiler flags it), and this repo has shipped that bug before.
        const stopWatching = () => Promise.resolve().then(() => setWatching(false));

        if (!profile?.orgId || !customerReference) {
            stopWatching();
            return;
        }
        const numericRef = Number(customerReference);
        if (!Number.isFinite(numericRef)) {
            stopWatching();
            return;
        }

        const q = query(
            collection(db, "billingAttempts"),
            where("orgId", "==", profile.orgId),
            where("numericRef", "==", numericRef)
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                const doc = snap.docs[0];
                if (!doc) return;
                const status = String(doc.data().status || "");
                if (status === "paid") {
                    setConfirmed("paid");
                    setWatching(false);
                } else if (["failed", "expired", "cancelled"].includes(status)) {
                    setConfirmed("failed");
                    setWatching(false);
                }
            },
            (err) => {
                // A swallowed failure here looks exactly like "still pending" — say so.
                console.error("[easykash-return] could not watch the billing attempt", err);
                stopWatching();
            }
        );

        const stop = setTimeout(() => setWatching(false), 20000);
        return () => {
            unsub();
            clearTimeout(stop);
        };
    }, [profile?.orgId, customerReference]);

    const state = useMemo<"success" | "pending" | "failed">(() => {
        if (confirmed === "paid") return "success";
        if (confirmed === "failed") return "failed";
        if (providerStatus === "failed") return "failed";
        if (providerStatus === "success") return watching ? "pending" : "pending";
        return "pending";
    }, [confirmed, providerStatus, watching]);

    return (
        <div className="mx-auto max-w-xl space-y-6 py-10">
            <Card>
                <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
                    {state === "success" && <CheckCircle2 className="h-14 w-14 text-emerald-600" />}
                    {state === "failed" && <XCircle className="h-14 w-14 text-red-600" />}
                    {state === "pending" &&
                        (watching ? (
                            <Loader2 className="h-14 w-14 animate-spin text-blue-600" />
                        ) : (
                            <Clock className="h-14 w-14 text-amber-600" />
                        ))}

                    <h1 className="text-xl font-semibold">{t(`billing.easykash.return.${state}.title`)}</h1>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {t(`billing.easykash.return.${state}.body`)}
                    </p>

                    {voucher && (
                        <div className="w-full rounded-lg border border-amber-300 bg-amber-50 p-4 text-left">
                            <div className="mb-1 flex items-center gap-2 text-amber-800">
                                <Ticket className="h-4 w-4" />
                                <span className="text-sm font-semibold">
                                    {t("billing.easykash.return.voucherTitle")}
                                </span>
                            </div>
                            <p className="font-mono text-2xl font-bold tracking-wider text-amber-900">{voucher}</p>
                            <p className="mt-2 text-xs text-amber-800">{t("billing.easykash.return.voucherNote")}</p>
                        </div>
                    )}

                    {providerRefNum && (
                        <p className="text-xs text-muted-foreground">
                            {t("billing.easykash.return.reference")}:{" "}
                            <span className="font-mono">{providerRefNum}</span>
                        </p>
                    )}

                    <div className="mt-2 flex gap-3">
                        <Button onClick={() => router.push("/dashboard/billing")}>
                            {t("billing.easykash.return.backToBilling")}
                        </Button>
                        {state === "failed" && (
                            <Button variant="outline" onClick={() => router.push("/dashboard/billing")}>
                                {t("billing.easykash.return.tryAgain")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
