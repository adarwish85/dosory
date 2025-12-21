"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useRouter, usePathname } from "next/navigation";
import { signOut, signInWithEmailAndPassword, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
    LayoutDashboard, Building2, CreditCard, Users, BarChart3,
    Settings, Bell, Search, LogOut, ChevronDown, Shield, Loader2, Eye, EyeOff, Palette
} from "lucide-react";
import { PlatformLogo } from "@/lib/hooks/use-platform-settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Design system colors
const colors = {
    dark: "#352b38",
    gray: "#7e808c",
    purple: "#dad8f9",
    light: "#f4f3f8",
    accent: "#9b8cff",
};

// Super Admin Login Form Component
function SuperAdminLoginForm({ currentUser }: { currentUser: User | null }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (currentUser) {
                await signOut(auth);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await signInWithEmailAndPassword(auth, email, password);
            window.location.reload();
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
                setError("Invalid email or password");
            } else if (err.code === "auth/too-many-requests") {
                setError("Too many attempts. Please try again later.");
            } else {
                setError(`Failed to sign in: ${err.message || err.code}`);
            }
            setLoading(false);
        }
    };

    const handleSwitchAccount = async () => {
        try {
            await signOut(auth);
            window.location.reload();
        } catch (err) {
            console.error("Sign out error:", err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.light, fontFamily: "var(--font-urbanist)" }}>
            <div className="w-full max-w-md">
                <div className="rounded-3xl shadow-xl p-8 border" style={{ backgroundColor: "white", borderColor: colors.purple }}>
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <PlatformLogo size="large" showText={false} />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: colors.dark }}>Super Admin</h1>
                        <p className="mt-2" style={{ color: colors.gray }}>Sign in to access the admin dashboard</p>
                    </div>

                    {/* Current User Notice */}
                    {currentUser && (
                        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.purple + "40", border: `1px solid ${colors.purple}` }}>
                            <p className="text-sm mb-2" style={{ color: colors.dark }}>
                                Currently signed in as: <strong>{currentUser.email}</strong>
                            </p>
                            <p className="text-xs mb-3" style={{ color: colors.gray }}>
                                This account doesn't have super admin access.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSwitchAccount}
                                className="w-full"
                                style={{ borderColor: colors.dark, color: colors.dark }}
                            >
                                Switch Account
                            </Button>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium" style={{ color: colors.dark }}>Email</Label>
                            <Input
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1.5 rounded-xl border-2 focus:ring-2"
                                style={{ borderColor: colors.purple, backgroundColor: colors.light }}
                            />
                        </div>
                        <div>
                            <Label className="text-sm font-medium" style={{ color: colors.dark }}>Password</Label>
                            <div className="relative mt-1.5">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pr-10 rounded-xl border-2"
                                    style={{ borderColor: colors.purple, backgroundColor: colors.light }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    style={{ color: colors.gray }}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl font-medium text-white"
                            style={{ backgroundColor: colors.dark }}
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <Link href="/dashboard" className="text-sm transition-colors" style={{ color: colors.gray }}>
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const router = useRouter();
    const pathname = usePathname();

    if (authLoading || profileLoading) {
        return (
            <div className="flex h-screen items-center justify-center" style={{ backgroundColor: colors.light }}>
                <div className="flex items-center gap-3" style={{ color: colors.dark }}>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span style={{ fontFamily: "var(--font-urbanist)" }}>Loading...</span>
                </div>
            </div>
        );
    }

    if (!user || profile?.role !== "superadmin") {
        return <SuperAdminLoginForm currentUser={user} />;
    }

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = "/";
    };

    const navItems = [
        { href: "/bunny", label: "Overview", icon: LayoutDashboard },
        { href: "/bunny/landing-builder", label: "Landing Builder", icon: Palette },
        { href: "/bunny/tenants", label: "Tenants", icon: Building2 },
        { href: "/bunny/subscriptions", label: "Subscriptions", icon: CreditCard },
        { href: "/bunny/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/bunny/settings", label: "Settings", icon: Settings },
    ];

    return (
        <TooltipProvider>
            <div className="min-h-screen" style={{ backgroundColor: colors.light, fontFamily: "var(--font-urbanist)" }}>
                {/* Icon Sidebar */}
                <aside className="w-16 fixed left-0 top-0 bottom-0 flex flex-col items-center py-4 z-50" style={{ backgroundColor: colors.dark }}>
                    {/* Logo */}
                    <div className="mb-8">
                        <PlatformLogo size="small" showText={false} />
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 flex flex-col items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                isActive
                                                    ? "text-white"
                                                    : "text-gray-400 hover:text-white"
                                            )}
                                            style={isActive ? { backgroundColor: colors.accent } : {}}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="rounded-lg" style={{ backgroundColor: colors.dark }}>
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </nav>

                    {/* Bottom Status */}
                    <div className="mt-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-4"></div>
                            </TooltipTrigger>
                            <TooltipContent side="right" style={{ backgroundColor: colors.dark }}>
                                All systems operational
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </aside>

                {/* Top Header */}
                <header className="ml-16 h-16 flex items-center justify-between px-6 sticky top-0 z-40" style={{ backgroundColor: colors.light }}>
                    {/* Greeting */}
                    <div>
                        <h1 className="text-xl font-semibold" style={{ color: colors.dark }}>
                            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}
                        </h1>
                        <p className="text-sm" style={{ color: colors.gray }}>Super Admin Dashboard</p>
                    </div>

                    {/* Search */}
                    <div className="flex-1 max-w-md mx-8">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.gray }} />
                            <Input
                                placeholder="Search"
                                className="pl-11 h-11 rounded-xl border-2"
                                style={{ backgroundColor: "white", borderColor: colors.purple, color: colors.dark }}
                            />
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10" style={{ backgroundColor: "white" }}>
                            <Settings className="h-5 w-5" style={{ color: colors.gray }} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10 relative" style={{ backgroundColor: "white" }}>
                            <Bell className="h-5 w-5" style={{ color: colors.gray }} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 rounded-xl h-10 px-3" style={{ backgroundColor: "white" }}>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="/avatar.png" />
                                        <AvatarFallback style={{ backgroundColor: colors.purple, color: colors.dark }}>SA</AvatarFallback>
                                    </Avatar>
                                    <ChevronDown className="h-4 w-4" style={{ color: colors.gray }} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl" style={{ backgroundColor: "white", borderColor: colors.purple }}>
                                <DropdownMenuItem className="rounded-lg" style={{ color: colors.dark }}>
                                    {user.email}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator style={{ backgroundColor: colors.purple }} />
                                <DropdownMenuItem onClick={() => router.push("/dashboard")} className="rounded-lg cursor-pointer" style={{ color: colors.dark }}>
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Tenant Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer text-red-500">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Content */}
                <main className="ml-16 p-6">
                    {children}
                </main>
            </div>
        </TooltipProvider>
    );
}
