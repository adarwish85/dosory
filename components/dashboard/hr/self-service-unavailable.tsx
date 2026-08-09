"use client";

import { UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

/**
 * Shown in place of an HR self-service widget when the signed-in user has no linked
 * employee record.
 *
 * GATED 2026-08-09 (§7 decision 3). `useCurrentEmployee` resolves by querying
 * `employees` where `userId == profile.uid` — but NO code path has ever written
 * `employees.userId`, so it returns null for everyone, always. The self-service blocks
 * were rendered as `{currentEmployee && (…)}`, which meant they silently did not exist:
 * a user saw an attendance page with no clock-in card and no explanation, indistinguishable
 * from a broken page.
 *
 * This says what is actually true. It is deliberately NOT a "coming soon" — the surrounding
 * admin views work; it is only the self-service half that needs an employee↔user link, and
 * that link is designed feature work (invite-time `employees.userId`), tracked in §11.
 */
export function HrSelfServiceUnavailable({ context }: { context: "attendance" | "leaves" | "performance" }) {
    const { t } = useTranslation();
    return (
        <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                    <UserX className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">{t("hr.selfService.unavailableTitle")}</h3>
                <p className="max-w-md text-sm text-muted-foreground">{t(`hr.selfService.unavailable.${context}`)}</p>
                <p className="max-w-md text-xs text-muted-foreground">{t("hr.selfService.unavailableHint")}</p>
            </CardContent>
        </Card>
    );
}
