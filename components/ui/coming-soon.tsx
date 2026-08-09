"use client";

import { Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/**
 * Shared "not built yet" panel.
 *
 * Generalised from components/reports/coming-soon.tsx (A8) so surfaces outside Reports can
 * use the same treatment. The rule it encodes: when a feature is not wired to real data,
 * say so plainly. Never render a hardcoded fixture that looks like the user's data, and
 * never render a permanent blank that looks like "you have nothing" — both are worse than
 * an honest placeholder because the user cannot tell them apart from a bug.
 *
 * `title`/`description` are caller-supplied (already translated). The panel copy itself is
 * translated here so it works in EN and AR.
 */
export function ComingSoonPanel({
    title,
    description,
    note,
}: {
    title: string;
    description?: string;
    /** Optional extra line, e.g. what the user can do in the meantime. */
    note?: string;
}) {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{t("common.comingSoon.heading")}</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("common.comingSoon.body")}</p>
                {note && <p className="mt-3 max-w-md text-sm text-muted-foreground">{note}</p>}
            </div>
        </div>
    );
}
