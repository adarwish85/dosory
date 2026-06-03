"use client";

import { useEditor } from "@/app/sa/website-builder/editor-context";
import { cn } from "@/lib/utils";

// --- Section Renderers ---

function HeroRenderer({ data }: { data: any }) {
    return (
        <section
            className="bg-muted py-20 px-8 text-center rounded-lg border-2 border-dashed border-transparent hover:border-primary/20 transition-all bg-cover bg-center relative overflow-hidden"
            style={{ backgroundImage: data.backgroundImage ? `url(${data.backgroundImage})` : undefined }}
        >
            {data.backgroundImage && <div className="absolute inset-0 bg-black/50 pointer-events-none" />}
            <div className="relative z-10 text-foreground">
                {/* Override text color if bg exists, handled via generic styles usually, doing simple check here */}
                <div className={cn(data.backgroundImage && "text-white")}>
                    <h1 className="text-4xl font-bold tracking-tight mb-4">{data.headline || "Hero Headline"}</h1>
                    <p className="text-xl max-w-2xl mx-auto mb-8 opacity-90">{data.subheadline || "Subheadline goes here..."}</p>
                </div>
                {data.ctaText && (
                    <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium">
                        {data.ctaText}
                    </button>
                )}
            </div>
        </section>
    );
}

function FeaturesRenderer({ data }: { data: any }) {
    const features = data.features || [{ title: "Feature 1", description: "Desc" }];
    return (
        <section className="py-16 px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">{data.title || "Our Features"}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                {features.map((f: any, i: number) => (
                    <div key={i} className="p-6 bg-card rounded-lg border shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                        <p className="text-muted-foreground">{f.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}


function PricingRenderer({ data }: { data: any }) {
    const plans = data.plans || [{ name: "Basic", price: "$0", features: ["Feature 1"] }];
    return (
        <section className="py-20 px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">{data.title || "Pricing Plans"}</h2>
                <p className="text-muted-foreground mt-2">{data.description || "Choose the right plan for you"}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((p: any, i: number) => (
                    <div key={i} className="p-8 bg-card rounded-lg border shadow-sm flex flex-col">
                        <h3 className="font-semibold text-xl">{p.name}</h3>
                        <div className="text-3xl font-bold mt-4 mb-6">{p.price}</div>
                        <ul className="space-y-3 mb-8 flex-1">
                            {(p.features || []).map((f: string, j: number) => (
                                <li key={j} className="text-sm text-muted-foreground flex items-center">
                                    <span className="mr-2 text-green-500">✓</span> {f}
                                </li>
                            ))}
                        </ul>
                        <button className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">Select Plan</button>
                    </div>
                ))}
            </div>
        </section>
    );
}

function TestimonialsRenderer({ data }: { data: any }) {
    const testimonials = data.testimonials || [{ name: "John Doe", role: "CEO", quote: "Amazing product!" }];
    return (
        <section className="py-20 px-8 bg-muted/30">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">{data.title || "What our customers say"}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {testimonials.map((t: any, i: number) => (
                    <div key={i} className="p-6 bg-background rounded-lg border shadow-sm italic">
                        <p className="mb-6 text-lg">&quot;{t.quote}&quot;</p>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold">
                                {t.name[0]}
                            </div>
                            <div>
                                <div className="font-semibold text-sm">{t.name}</div>
                                <div className="text-xs text-muted-foreground">{t.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function CTARenderer({ data }: { data: any }) {
    return (
        <section className="py-24 px-8 bg-primary text-primary-foreground text-center rounded-xl my-8 mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-4">{data.headline || "Ready to get started?"}</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">{data.subheadline || "Join thousands of users today."}</p>
            <button className="bg-background text-primary px-8 py-4 rounded-md font-bold text-lg hover:bg-background/90 transition">
                {data.buttonText || "Sign Up Now"}
            </button>
        </section>
    );
}

function FAQRenderer({ data }: { data: any }) {
    const items = data.items || [{ question: "Is it free?", answer: "Yes, basic plan is free." }];
    return (
        <section className="py-20 px-8 max-w-3xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">{data.title || "Frequently Asked Questions"}</h2>
            </div>
            <div className="space-y-4">
                {items.map((item: any, i: number) => (
                    <div key={i} className="border rounded-lg p-6 bg-card">
                        <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
                        <p className="text-muted-foreground">{item.answer}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function TextRenderer({ data }: { data: any }) {
    return (
        <section className="py-12 px-8 max-w-4xl mx-auto prose dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: data.content || "<p>Rich text content...</p>" }} />
        </section>
    );
}

function DefaultRenderer({ data }: { data: any }) {
    return (
        <div className="p-10 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
            <p className="text-muted-foreground">Placeholder section</p>
        </div>
    );
}

const RENDERERS: Record<string, React.FC<{ data: any }>> = {
    hero: HeroRenderer,
    features: FeaturesRenderer,
    text: TextRenderer,
    pricing: PricingRenderer,
    testimonials: TestimonialsRenderer,
    cta: CTARenderer,
    faq: FAQRenderer,
};

// --- Main Canvas ---

export function EditorCanvas() {
    const { sections, selectedSectionId, selectSection, deviceMode } = useEditor();

    // Device width constraints
    const widthClass = {
        desktop: "w-full max-w-full",
        tablet: "w-[768px]",
        mobile: "w-[375px]"
    }[deviceMode];

    return (
        <div className={cn(
            "min-h-full bg-background shadow-sm transition-all duration-300 mx-auto",
            widthClass,
            deviceMode !== "desktop" && "my-8 border rounded-lg overflow-hidden shadow-2xl ring-8 ring-muted"
        )}>
            {sections.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed m-10 rounded-lg">
                    <p>Canvas is empty.</p>
                    <p className="text-sm">Add a section from the left sidebar to start building.</p>
                </div>
            ) : (
                <div className="divide-y divide-border/10">
                    {sections.map(section => {
                        const Renderer = RENDERERS[section.type] || DefaultRenderer;
                        const isSelected = selectedSectionId === section.id;

                        return (
                            <div
                                key={section.id}
                                className={cn(
                                    "relative transition-all",
                                    isSelected ? "ring-2 ring-primary ring-inset z-10" : "hover:ring-1 hover:ring-primary/30"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    selectSection(section.id);
                                }}
                            >
                                {/* Selection Label */}
                                {isSelected && (
                                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-bl uppercase font-bold tracking-wider z-20">
                                        {section.type}
                                    </div>
                                )}
                                <Renderer data={section.config} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
