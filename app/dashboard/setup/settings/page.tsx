"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function SettingsRedirect() {
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        router.replace("/dashboard/setup/organization/general");
    }, [router]);

    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">{t("setup.settingsRedirect.redirecting")}</p>
            </div>
        </div>
    );
}
