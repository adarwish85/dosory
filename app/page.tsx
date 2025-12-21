"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ChevronDown, Users, FileText, BarChart3, Zap,
    TrendingUp, Target, ArrowRight, Star, Play,
    Building2, CreditCard, FolderKanban, Headphones, Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PlatformLogo } from "@/lib/hooks/use-platform-settings";

// Icon mapping
const iconMap: Record<string, any> = {
    Users, FileText, BarChart3, FolderKanban, Headphones, CreditCard,
    Zap, Target, TrendingUp, Building2
};

interface LandingConfig {
    hero: {
        badge: string;
        headline: string;
        headlineHighlight: string;
        subheadline: string;
        ctaPrimary: string;
        ctaSecondary: string;
    };
    features: Array<{ icon: string; title: string; description: string; }>;
    stats: Array<{ value: string; label: string; icon: string; }>;
    testimonial: { quote: string; author: string; role: string; };
    faqs: Array<{ question: string; answer: string; }>;
    design: { primaryColor: string; secondaryColor: string; accentColor: string; };
}

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    billingPeriod: "monthly" | "yearly";
    features: string[];
    modules: string[];
    maxUsers: number;
    isPopular: boolean;
    isActive: boolean;
    sortOrder: number;
}

const defaultConfig: LandingConfig = {
    hero: {
        badge: "#1 Rated CRM for Growing Businesses",
        headline: "Smarter CRM for Stronger",
        headlineHighlight: "Sustainable Sales",
        subheadline: "The all-in-one CRM and ERP platform that helps you manage customers, projects, invoices, and more. Scale your business without the complexity.",
        ctaPrimary: "Start Free Trial",
        ctaSecondary: "Watch Demo",
    },
    features: [
        { icon: "Users", title: "Customer Management", description: "Track leads, contacts, and accounts in one place" },
        { icon: "FileText", title: "Smart Invoicing", description: "Create and send professional invoices in seconds" },
        { icon: "FolderKanban", title: "Project Management", description: "Manage projects, tasks, and deadlines efficiently" },
        { icon: "BarChart3", title: "Analytics & Reports", description: "Real-time insights to grow your business" },
        { icon: "Headphones", title: "Support Tickets", description: "Keep your customers happy with great support" },
        { icon: "CreditCard", title: "Payment Processing", description: "Accept payments and manage subscriptions" },
    ],
    stats: [
        { value: "$2.5M+", label: "Revenue Tracked", icon: "TrendingUp" },
        { value: "45%", label: "Productivity Boost", icon: "Zap" },
        { value: "10K+", label: "Active Users", icon: "Users" },
        { value: "99.9%", label: "Uptime", icon: "Target" },
    ],
    testimonial: {
        quote: "Using Dosory CRM is one of the best decisions we've made. Our sales team's productivity has increased by 45%, and we've streamlined our entire customer management process. Highly recommended!",
        author: "John Davidson",
        role: "CEO, TechStart Inc.",
    },
    faqs: [
        { question: "How do I integrate Dosory CRM with other tools?", answer: "Dosory integrates seamlessly with popular tools like Zapier, Slack, and Google Workspace. Our REST API also allows custom integrations with any platform." },
        { question: "Is there a free trial available?", answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to get started." },
        { question: "Is Dosory suitable for small businesses?", answer: "Absolutely! Dosory is designed to scale with your business. Start small and grow without limits - from solo entrepreneurs to enterprise teams." },
        { question: "What kind of support do you offer?", answer: "We provide 24/7 email support, live chat during business hours, and comprehensive documentation. Enterprise plans include dedicated account managers." },
    ],
    design: {
        primaryColor: "#0A66C2",
        secondaryColor: "#004182",
        accentColor: "#E7F3FF",
    },
};

export default function Home() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [config, setConfig] = useState<LandingConfig>(defaultConfig);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);

    // Load config and plans from Firestore
    useEffect(() => {
        async function loadData() {
            try {
                // Load landing config
                const docRef = doc(db, "platform", "landing");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setConfig({ ...defaultConfig, ...docSnap.data() as LandingConfig });
                }

                // Load subscription plans
                const plansRef = collection(db, "platform", "subscriptionPlans", "plans");
                const plansSnap = await getDocs(plansRef);
                const loadedPlans = plansSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan))
                    .filter(p => p.isActive)
                    .sort((a, b) => a.sortOrder - b.sortOrder);
                setPlans(loadedPlans);
            } catch (error) {
                console.error("Error loading config:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const { hero, features, stats, testimonial, faqs, design } = config;

    // Apply CSS variables for dynamic colors
    const colorStyle = {
        "--primary": design.primaryColor,
        "--secondary": design.secondaryColor,
        "--accent": design.accentColor,
    } as React.CSSProperties;

    return (
        <div className="min-h-screen bg-white" style={colorStyle}>
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <PlatformLogo size="default" textClassName="text-xl text-gray-900" />
                        </Link>

                        <nav className="hidden md:flex items-center gap-8">
                            <Link href="#features" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors" style={{ "--tw-text-opacity": 1 } as any}>Features</Link>
                            <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors">Pricing</Link>
                            <Link href="#testimonials" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors">Testimonials</Link>
                            <Link href="#faq" className="text-sm font-medium text-gray-600 hover:opacity-80 transition-colors">FAQ</Link>
                        </nav>

                        <div className="flex items-center gap-3">
                            <Link href="/login">
                                <Button variant="ghost" className="text-gray-700">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button style={{ backgroundColor: design.primaryColor }} className="text-white hover:opacity-90">
                                    {hero.ctaPrimary}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 relative overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0" style={{ background: `linear - gradient(to bottom right, ${design.accentColor}, white, #F3F2EF)` }} />
                <div className="absolute top-20 right-0 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${design.primaryColor} 15` }} />
                <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: `${design.primaryColor}08` }} />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                            style={{ backgroundColor: design.accentColor, color: design.primaryColor }}
                        >
                            <Zap className="w-4 h-4" />
                            {hero.badge}
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                            {hero.headline}{" "}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: `linear - gradient(to right, ${design.primaryColor}, ${design.secondaryColor})` }}
                            >
                                {hero.headlineHighlight}
                            </span>
                        </h1>

                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            {hero.subheadline}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                            <Link href="/signup">
                                <Button
                                    size="lg"
                                    className="text-white px-8 h-12 text-base"
                                    style={{ backgroundColor: design.primaryColor }}
                                >
                                    {hero.ctaPrimary}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="border-gray-300 h-12 px-8 text-base">
                                <Play className="mr-2 h-5 w-5" style={{ color: design.primaryColor }} />
                                {hero.ctaSecondary}
                            </Button>
                        </div>

                        {/* Social Proof */}
                        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                                            style={{ background: `linear - gradient(to bottom right, ${design.primaryColor}, ${design.secondaryColor})` }}
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
                    </div>

                    {/* Dashboard Preview */}
                    <div className="mt-16 relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mx-auto max-w-5xl">
                            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="flex-1 text-center text-sm text-gray-500">Dosory Dashboard</div>
                            </div>
                            <div className="p-6 bg-[#F3F2EF]">
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    {[
                                        { label: "Total Revenue", value: "$124,500", change: "+12%" },
                                        { label: "Active Customers", value: "1,247", change: "+8%" },
                                        { label: "Pending Invoices", value: "23", change: "-5%" },
                                        { label: "Projects", value: "18", change: "+3%" },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
                                            <p className="text-sm text-gray-500">{stat.label}</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                            <p className={`text - sm ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-500'} `}>
                                                {stat.change} from last month
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-xl p-4 border border-gray-200 h-48">
                                        <h3 className="font-semibold text-gray-900 mb-4">Revenue Analytics</h3>
                                        <div className="flex items-end gap-2 h-28">
                                            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 rounded-t"
                                                    style={{
                                                        height: `${h}% `,
                                                        background: `linear - gradient(to top, ${design.primaryColor}, ${design.secondaryColor})`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 border border-gray-200 h-48">
                                        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                                        <div className="space-y-3">
                                            {["New customer signed up", "Invoice #1234 paid", "Project deadline today"].map((item, i) => (
                                                <div key={i} className="flex items-center gap-3 text-sm">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: design.primaryColor }} />
                                                    <span className="text-gray-600">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            What Can Our CRM{" "}
                            <span style={{ color: design.primaryColor }}>Do For You?</span>
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Everything you need to manage and grow your business, all in one powerful platform.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, i) => {
                            const Icon = iconMap[feature.icon] || Users;
                            return (
                                <div key={i} className="group p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all duration-300" style={{ "--hover-border": design.primaryColor } as any}>
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors"
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

            {/* Pricing Section */}
            {plans.length > 0 && (
                <section id="pricing" className="py-24 bg-[#F3F2EF]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                                Simple, Transparent{" "}
                                <span style={{ color: design.primaryColor }}>Pricing</span>
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Choose the plan that works best for your business. All plans include a 14-day free trial.
                            </p>
                        </div>

                        <div className={`grid gap-8 ${plans.length === 1 ? 'max-w-md mx-auto' : plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`bg-white rounded-2xl p-8 shadow-lg relative ${plan.isPopular ? 'scale-105' : 'border border-gray-200'}`}
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
                                        <span className="text-gray-500">/{plan.billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        <li className="flex items-center gap-2 text-gray-600">
                                            <Check className="h-5 w-5 flex-shrink-0" style={{ color: design.primaryColor }} />
                                            {plan.maxUsers === -1 ? 'Unlimited users' : `Up to ${plan.maxUsers} users`}
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
                                            className={`w-full ${plan.isPopular ? 'text-white' : ''}`}
                                            style={plan.isPopular ? { backgroundColor: design.primaryColor } : undefined}
                                            variant={plan.isPopular ? 'default' : 'outline'}
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
            )}

            {/* Stats Section */}
            <section id="testimonials" className="py-24" style={{ background: `linear-gradient(to bottom right, ${design.primaryColor}, ${design.secondaryColor})` }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            What Our Customers Say
                        </h2>
                        <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                            Join thousands of businesses that trust Dosory for their growth
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8 mb-16">
                        {stats.map((stat, i) => {
                            const Icon = iconMap[stat.icon] || TrendingUp;
                            return (
                                <div key={i} className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                                    <div className="text-blue-200">{stat.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Testimonial Card */}
                    <div className="bg-white rounded-2xl p-8 max-w-3xl mx-auto shadow-xl">
                        <div className="flex items-start gap-4">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                                style={{ background: `linear - gradient(to bottom right, ${design.primaryColor}, ${design.secondaryColor})` }}
                            >
                                {testimonial.author.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-gray-700 text-lg mb-4">
                                    "{testimonial.quote}"
                                </p>
                                <div>
                                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                                    <div className="text-gray-500">{testimonial.role}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-[#F3F2EF]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Building2 className="w-16 h-16 mx-auto mb-6" style={{ color: design.primaryColor }} />
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Ready to Transform Your Business?
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                        Start your 14-day free trial today. No credit card required. Cancel anytime.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" className="text-white px-8 h-12" style={{ backgroundColor: design.primaryColor }}>
                                Get Started Free
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button size="lg" variant="outline" className="h-12 px-8">
                                Contact Sales
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            CRM Sales FAQs
                        </h2>
                        <p className="text-xl text-gray-600">
                            Got questions? We've got answers.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-medium text-gray-900">{faq.question}</span>
                                    <ChevronDown className={`w - 5 h - 5 text - gray - 500 transition - transform ${openFaq === i ? 'rotate-180' : ''} `} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-gray-600">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <Link href="/" className="flex items-center gap-2 mb-4">
                                <PlatformLogo size="default" textClassName="text-xl text-white" variant="light" />
                            </Link>
                            <p className="text-gray-400 text-sm">
                                The all-in-one CRM and ERP platform for modern businesses.
                            </p>
                        </div>

                        {[
                            { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog"] },
                            { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
                            { title: "Support", links: ["Help Center", "Contact", "Status", "Terms"] },
                        ].map((col, i) => (
                            <div key={i}>
                                <h3 className="font-semibold mb-4">{col.title}</h3>
                                <ul className="space-y-3">
                                    {col.links.map((link, j) => (
                                        <li key={j}>
                                            <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                                                {link}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-gray-400 text-sm">
                            © {new Date().getFullYear()} Dosory. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <Link href="#" className="text-gray-400 hover:text-white text-sm">Privacy Policy</Link>
                            <Link href="#" className="text-gray-400 hover:text-white text-sm">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
