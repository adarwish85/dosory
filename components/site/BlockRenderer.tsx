// Block Renderer Component
// Renders site blocks dynamically based on their type

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Users, FileText, BarChart3, FolderKanban, Headphones, CreditCard,
    Zap, Target, TrendingUp, Building2, Shield, Globe, Star, Play, ArrowRight, ChevronDown, Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Block, SiteDesign } from "@/lib/types/site-builder";

// Icon mapping
const iconMap: Record<string, any> = {
    Users, FileText, BarChart3, FolderKanban, Headphones, CreditCard,
    Zap, Target, TrendingUp, Building2, Shield, Globe, Star
};

interface BlockRendererProps {
    block: Block;
    design: SiteDesign;
}

export function BlockRenderer({ block, design }: BlockRendererProps) {
    switch (block.type) {
        case "hero":
            return <HeroBlock data={block.data as any} design={design} />;
        case "features":
            return <FeaturesBlock data={block.data as any} design={design} />;
        case "stats":
            return <StatsBlock data={block.data as any} design={design} />;
        case "testimonial":
            return <TestimonialBlock data={block.data as any} design={design} />;
        case "faq":
            return <FaqBlock data={block.data as any} design={design} />;
        case "cta":
            return <CtaBlock data={block.data as any} design={design} />;
        case "text":
            return <TextBlock data={block.data as any} design={design} />;
        case "pricing":
            return <PricingBlock data={block.data as any} design={design} />;
        default:
            return null;
    }
}

// ============================================
// Hero Block
// ============================================

function HeroBlock({ data, design }: { data: any; design: SiteDesign }) {
    return (
        <section className="pt-32 pb-20 relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom right, ${design.accentColor}, white, #F3F2EF)` }} />
            <div className="absolute top-20 right-0 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${design.primaryColor}15` }} />
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: `${design.primaryColor}08` }} />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                    {data.badge && (
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                            style={{ backgroundColor: design.accentColor, color: design.primaryColor }}
                        >
                            <Zap className="w-4 h-4" />
                            {data.badge}
                        </div>
                    )}

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                        {data.headline}{" "}
                        {data.headlineHighlight && (
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: `linear-gradient(to right, ${design.primaryColor}, ${design.secondaryColor})` }}
                            >
                                {data.headlineHighlight}
                            </span>
                        )}
                    </h1>

                    {data.subheadline && (
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            {data.subheadline}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        {data.ctaPrimaryText && (
                            <Link href={data.ctaPrimaryLink || "/signup"}>
                                <Button size="lg" className="text-white px-8 h-12 text-base" style={{ backgroundColor: design.primaryColor }}>
                                    {data.ctaPrimaryText}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        )}
                        {data.ctaSecondaryText && (
                            <Button size="lg" variant="outline" className="border-gray-300 h-12 px-8 text-base">
                                <Play className="mr-2 h-5 w-5" style={{ color: design.primaryColor }} />
                                {data.ctaSecondaryText}
                            </Button>
                        )}
                    </div>

                    {data.showSocialProof && (
                        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                                            style={{ background: `linear-gradient(to bottom right, ${design.primaryColor}, ${design.secondaryColor})` }}
                                        >
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                    ))}
                                </div>
                                <span className="ml-2">10K+ users</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ))}
                                <span className="ml-1">4.9/5 rating</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// ============================================
// Features Block
// ============================================

function FeaturesBlock({ data, design }: { data: any; design: SiteDesign }) {
    const columns = data.columns || 3;
    const gridClass = columns === 2 ? "md:grid-cols-2" : columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {(data.sectionTitle || data.sectionSubtitle) && (
                    <div className="text-center mb-16">
                        {data.sectionTitle && (
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                                {data.sectionTitle.split(" ").slice(0, -2).join(" ")}{" "}
                                <span style={{ color: design.primaryColor }}>{data.sectionTitle.split(" ").slice(-2).join(" ")}</span>
                            </h2>
                        )}
                        {data.sectionSubtitle && (
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{data.sectionSubtitle}</p>
                        )}
                    </div>
                )}

                <div className={`grid md:grid-cols-2 ${gridClass} gap-8`}>
                    {(data.items || []).map((feature: any, i: number) => {
                        const Icon = iconMap[feature.icon] || Zap;
                        return (
                            <div key={i} className="group p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                                    style={{ backgroundColor: design.accentColor }}
                                >
                                    <Icon className="w-6 h-6" style={{ color: design.primaryColor }} />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ============================================
// Stats Block
// ============================================

function StatsBlock({ data, design }: { data: any; design: SiteDesign }) {
    const bgStyles: Record<string, React.CSSProperties> = {
        primary: { background: `linear-gradient(to bottom right, ${design.primaryColor}, ${design.secondaryColor})` },
        secondary: { backgroundColor: design.secondaryColor },
        white: { backgroundColor: "white" },
        gray: { backgroundColor: "#F3F2EF" },
    };

    const textColor = data.backgroundColor === "white" || data.backgroundColor === "gray" ? "text-gray-900" : "text-white";
    const subtextColor = data.backgroundColor === "white" || data.backgroundColor === "gray" ? "text-gray-600" : "text-white/80";

    return (
        <section className="py-24" style={bgStyles[data.backgroundColor || "primary"]}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-8">
                    {(data.items || []).map((stat: any, i: number) => {
                        const Icon = iconMap[stat.icon] || TrendingUp;
                        return (
                            <div key={i} className="text-center">
                                <div className={`w-16 h-16 rounded-2xl ${data.backgroundColor === "white" || data.backgroundColor === "gray" ? "bg-gray-100" : "bg-white/10"} flex items-center justify-center mx-auto mb-4`}>
                                    <Icon className={`w-8 h-8 ${textColor}`} />
                                </div>
                                <div className={`text-4xl font-bold ${textColor} mb-2`}>{stat.value}</div>
                                <div className={subtextColor}>{stat.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ============================================
// Testimonial Block
// ============================================

function TestimonialBlock({ data, design }: { data: any; design: SiteDesign }) {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                    <div className="flex items-start gap-4">
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                            style={{ background: `linear-gradient(to bottom right, ${design.primaryColor}, ${design.secondaryColor})` }}
                        >
                            {(data.author || "").split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                        </div>
                        <div>
                            {data.rating && (
                                <div className="flex items-center gap-2 mb-2">
                                    {[...Array(data.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                            )}
                            <p className="text-gray-700 text-lg mb-4">"{data.quote}"</p>
                            <div>
                                <div className="font-semibold text-gray-900">{data.author}</div>
                                {data.role && <div className="text-gray-500">{data.role}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============================================
// FAQ Block
// ============================================

function FaqBlock({ data, design }: { data: any; design: SiteDesign }) {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <section className="py-24 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {(data.sectionTitle || data.sectionSubtitle) && (
                    <div className="text-center mb-16">
                        {data.sectionTitle && (
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{data.sectionTitle}</h2>
                        )}
                        {data.sectionSubtitle && (
                            <p className="text-xl text-gray-600">{data.sectionSubtitle}</p>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    {(data.items || []).map((faq: any, i: number) => (
                        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                            >
                                <span className="font-medium text-gray-900">{faq.question}</span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                            </button>
                            {openFaq === i && (
                                <div className="px-6 pb-6 text-gray-600">{faq.answer}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// CTA Block
// ============================================

function CtaBlock({ data, design }: { data: any; design: SiteDesign }) {
    const bgStyles: Record<string, string> = {
        primary: design.primaryColor,
        secondary: design.secondaryColor,
        gray: "#F3F2EF",
    };

    const textColor = data.backgroundColor === "gray" ? "text-gray-900" : "text-white";
    const subtextColor = data.backgroundColor === "gray" ? "text-gray-600" : "text-white/80";

    return (
        <section className="py-24" style={{ backgroundColor: bgStyles[data.backgroundColor || "gray"] }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {data.icon && (
                    <Building2 className={`w-16 h-16 mx-auto mb-6 ${textColor}`} />
                )}
                <h2 className={`text-3xl sm:text-4xl font-bold ${textColor} mb-4`}>{data.headline}</h2>
                {data.subheadline && (
                    <p className={`text-xl ${subtextColor} max-w-2xl mx-auto mb-8`}>{data.subheadline}</p>
                )}
                <div className="flex items-center justify-center gap-4">
                    <Link href={data.ctaLink || "/signup"}>
                        <Button
                            size="lg"
                            className="px-8 h-12"
                            style={data.backgroundColor === "gray" ? { backgroundColor: design.primaryColor, color: "white" } : { backgroundColor: "white", color: design.primaryColor }}
                        >
                            {data.ctaText}
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                    {data.secondaryCtaText && (
                        <Link href={data.secondaryCtaLink || "#"}>
                            <Button size="lg" variant="outline" className={`h-12 px-8 ${textColor} border-current`}>
                                {data.secondaryCtaText}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}

// ============================================
// Text Block
// ============================================

function TextBlock({ data, design }: { data: any; design: SiteDesign }) {
    const maxWidthClasses: Record<string, string> = {
        sm: "max-w-xl",
        md: "max-w-2xl",
        lg: "max-w-4xl",
        full: "max-w-7xl",
    };

    const alignmentClasses: Record<string, string> = {
        left: "text-left",
        center: "text-center mx-auto",
        right: "text-right ml-auto",
    };

    const maxWidthClass = maxWidthClasses[data.maxWidth || "lg"] || maxWidthClasses.lg;
    const alignmentClass = alignmentClasses[data.alignment || "left"] || alignmentClasses.left;

    return (
        <section className="py-16 bg-white">
            <div className={`${maxWidthClass} ${alignmentClass} mx-auto px-4 sm:px-6 lg:px-8`}>
                <div className="prose prose-lg" dangerouslySetInnerHTML={{ __html: data.content || "" }} />
            </div>
        </section>
    );
}

// ============================================
// Pricing Block
// ============================================

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    billingPeriod: "monthly" | "yearly";
    features: string[];
    maxUsers: number;
    isPopular: boolean;
    isActive: boolean;
    sortOrder: number;
}

function PricingBlock({ data, design }: { data: any; design: SiteDesign }) {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPlans() {
            try {
                const plansRef = collection(db, "platform", "subscriptionPlans", "plans");
                const plansSnap = await getDocs(query(plansRef, where("isActive", "==", true), orderBy("sortOrder")));
                const loadedPlans = plansSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SubscriptionPlan[];
                setPlans(loadedPlans);
            } catch (err) {
                console.error("Error loading plans:", err);
            } finally {
                setLoading(false);
            }
        }
        loadPlans();
    }, []);

    if (loading) {
        return <section className="py-24 bg-[#F3F2EF]"><div className="text-center text-gray-500">Loading plans...</div></section>;
    }

    if (plans.length === 0) {
        return null;
    }

    const gridClass = plans.length === 1 ? "max-w-md mx-auto" : plans.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3";

    return (
        <section className="py-24 bg-[#F3F2EF]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {(data.sectionTitle || data.sectionSubtitle) && (
                    <div className="text-center mb-16">
                        {data.sectionTitle && (
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                                {data.sectionTitle.split(" ").slice(0, -1).join(" ")}{" "}
                                <span style={{ color: design.primaryColor }}>{data.sectionTitle.split(" ").slice(-1)}</span>
                            </h2>
                        )}
                        {data.sectionSubtitle && (
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{data.sectionSubtitle}</p>
                        )}
                    </div>
                )}

                <div className={`grid gap-8 ${gridClass}`}>
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white rounded-2xl p-8 shadow-lg relative ${plan.isPopular ? "scale-105" : "border border-gray-200"}`}
                            style={plan.isPopular ? { boxShadow: `0 0 0 2px ${design.primaryColor}` } : undefined}
                        >
                            {plan.isPopular && (
                                <div
                                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-sm font-medium rounded-full flex items-center gap-1"
                                    style={{ backgroundColor: design.primaryColor }}
                                >
                                    <Star className="h-3 w-3 fill-white" /> Most Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                <p className="text-gray-500 mt-1">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                                <span className="text-gray-500">/{plan.billingPeriod === "monthly" ? "month" : "year"}</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-2 text-gray-600">
                                    <Check className="h-5 w-5 flex-shrink-0" style={{ color: design.primaryColor }} />
                                    {plan.maxUsers === -1 ? "Unlimited users" : `Up to ${plan.maxUsers} users`}
                                </li>
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-600">
                                        <Check className="h-5 w-5 flex-shrink-0" style={{ color: design.primaryColor }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link href="/signup">
                                <Button
                                    className={`w-full ${plan.isPopular ? "text-white" : ""}`}
                                    style={plan.isPopular ? { backgroundColor: design.primaryColor } : undefined}
                                    variant={plan.isPopular ? "default" : "outline"}
                                >
                                    Get Started
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
