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
    dark: "#111827", // Gray 900
    gray: "#6B7280", // Gray 500
    primary: "#0ea5e9", // Sky 500
    primaryLight: "#e0f2fe", // Sky 100
    background: "#f9fafb", // Gray 50
    white: "#ffffff",
    border: "#f3f4f6", // Gray 100
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
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.background, fontFamily: "var(--font-urbanist)" }}>
            <div className="w-full max-w-md">
                <div className="rounded-3xl shadow-xl p-8 border" style={{ backgroundColor: "white", borderColor: colors.border }}>
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
                        <div className="rounded-xl p-4 mb-6 bg-blue-50 border border-blue-100">
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
                                className="w-full text-gray-700 border-gray-300"
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
                                className="mt-1.5 rounded-xl border-2 focus:ring-2 bg-gray-50 border-gray-200"
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
                                    className="pr-10 rounded-xl border-2 bg-gray-50 border-gray-200"
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
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex items-center gap-3 text-gray-900">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading...</span>
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
        { href: "/bunny", label: "Dashboard", icon: LayoutDashboard },
        { href: "/bunny/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/bunny/tenants", label: "Tenants", icon: Users }, // Changed icon to Users based on "Tenant Management"
        { href: "/bunny/subscriptions", label: "Billing", icon: CreditCard }, // "Billing" often maps to Subscriptions/Revenue
        { href: "/bunny/settings", label: "Settings", icon: Settings },
    ];

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gray-50 font-sans">
                {/* Full Sidebar */}
                <aside className="w-64 fixed left-0 top-0 bottom-0 bg-white border-r border-gray-100 flex flex-col z-50">
                    {/* Logo Area */}
                    <div className="h-16 flex items-center px-6 border-b border-gray-50">
                        <Link href="/bunny" className="flex items-center gap-2">
                            {/* Placeholder for Logo - keeping PlatformLogo or using simple text */}
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">D</div>
                            <span className="font-bold text-xl text-gray-900">Dosory</span>
                        </Link>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Platform
                        </div>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || (item.href !== "/bunny" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600 rounded-none rounded-r-lg" // Simulating the active state style
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-gray-400")} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Status / Logout */}
                    <div className="p-4 border-t border-gray-50">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            Log Out
                        </button>
                    </div>
                </aside>

                {/* Main Content Wrapper */}
                <div className="ml-64 min-h-screen flex flex-col">
                    {/* Top Header */}
                    <header className="h-16 bg-white border-b border-gray-100 sticky top-0 z-40 px-6 flex items-center justify-between">
                        {/* Page Title / Breadcrumb Placeholder */}
                        <div>
                            {/* Dynamic title based on path could go here, for now static or simple */}
                            <h1 className="text-lg font-semibold text-gray-800">
                                {navItems.find(i => i.href === pathname)?.label || "Dashboard"}
                            </h1>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:block w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search..."
                                    className="pl-9 h-9 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 transition-all text-sm rounded-lg"
                                />
                            </div>

                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </Button>

                            <div className="h-8 w-px bg-gray-200 mx-1"></div>

                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-900 leading-none">{profile?.firstName || "Admin"} {profile?.lastName || "User"}</p>
                                    <p className="text-xs text-gray-500 mt-1">Super Admin</p>
                                </div>
                                <Avatar className="h-9 w-9 border border-gray-200">
                                    <AvatarImage src={profile?.photoURL || ""} />
                                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                                        {(profile?.firstName?.[0] || user.email?.[0] || "A").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 p-6 overflow-x-hidden">
                        <div className="max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
