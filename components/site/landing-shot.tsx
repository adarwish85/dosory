"use client";

import { useState } from "react";

const mono = { fontFamily: "var(--font-mono-landing), ui-monospace, SFMono-Regular, monospace" };

/**
 * Screenshot slot for the landing page.
 * Renders /screenshots/<file>.png when present; falls back to a polished
 * labeled placeholder if the image is missing (404) — so the page looks
 * intentional before the real captures are dropped into /public/screenshots/.
 */
export function LandingShot({ src, label, ratio = "aspect-[16/10]" }: { src?: string; label: string; ratio?: string }) {
    const [failed, setFailed] = useState(false);

    if (src && !failed) {
        return (
            <img
                src={src}
                alt={label}
                className={`${ratio} w-full object-cover object-top`}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <div
            className={`${ratio} relative w-full`}
            style={{
                backgroundImage:
                    "radial-gradient(#E3E7EE 1px, transparent 1px), linear-gradient(135deg,#F4F7FB 0%,#FBFAF7 55%,#EAF2FB 100%)",
                backgroundSize: "22px 22px, 100% 100%",
            }}
        >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span
                    className="rounded-full border border-[#D8E2F0] bg-white/70 px-3 py-1 text-[11px] tracking-wide text-[#0A66C2]"
                    style={mono}
                >
                    SCREENSHOT · {label}
                </span>
                <span className="text-[11px] text-[#9A9CA3]" style={mono}>
                    real product capture drops in here
                </span>
            </div>
        </div>
    );
}
