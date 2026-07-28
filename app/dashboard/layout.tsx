"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
    LayoutDashboard,
    Users,
    CreditCard,
    Settings,
    FileText,
    CheckSquare,
    MessageSquare,
    BarChart3,
    Bell,
    Search,
    Menu,
    Building2,
    Store,
    Monitor,
    Wallet,
    Briefcase,
    FileSignature,
    Receipt,
    Database,
    LayoutTemplate,
    FolderKanban,
    LogOut,
    Loader2,
    DollarSign,
    X,
    User,
    Zap,
    Scroll,
    LifeBuoy,
    Target,
    Book,
    BarChart,
    Plus,
    ChevronDown,
    Home,
    Calendar,
    Clock,
    PanelRightClose,
    PanelRightOpen,
} from "lucide-react";
import { PlatformLogo, usePlatformSettings } from "@/lib/hooks/use-platform-settings";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";
import { SetupSidebar } from "@/components/dashboard/setup-sidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { StickyNotesBoard } from "@/components/dashboard/StickyNotes";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
import { LanguageSwitcher } from "@/components/language-switcher";
import { usePermissions, canAccessModule } from "@/lib/hooks/use-permissions";
import { useEnsureProvisioned } from "@/lib/provisioning/ensure-provisioned-client";
import { SystemBanners } from "@/components/dashboard/system-banners";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useUnreadMessages } from "@/lib/hooks/use-chat";
import { clearCollectionCache } from "@/lib/cache/collection-cache";
import { useTranslation } from "@/lib/i18n";

interface StaffProfile {
    firstName?: string;
    lastName?: string;
    email?: string;
    image?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { settings, loading: settingsLoading } = useOrganizationSettings(); // Contains subdomain
    const { profile } = useUserProfile();
    // F1c: login-time provisioning guard. If this org has no subscriptions/{orgId} doc
    // (half-provisioned tenant — signup's provision call never landed), heal it via the
    // idempotent provision route instead of presenting a broken dashboard where every
    // write 403s. Healthy tenants: one cheap getDoc, no UI.
    const provisioningStatus = useEnsureProvisioned(user, profile?.actualOrgId || profile?.orgId);
    const { permissions, isAdmin, loading: permissionsLoading } = usePermissions();
    const { unreadCount: notificationUnreadCount } = useNotifications();
    const { unreadCount: messagesUnreadCount } = useUnreadMessages();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true); // Default expanded
    const [setupOpen, setSetupOpen] = useState(false);
    const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
    const [expandedSections, setExpandedSections] = useState<string[]>(["Sales"]); // Default expanded

    const RIGHT_SIDEBAR_KEY = "dashboard_right_sidebar_collapsed";

    // Load right sidebar preference from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(RIGHT_SIDEBAR_KEY);
        if (saved !== null) {
            Promise.resolve().then(() => {
                setRightSidebarOpen(saved !== "true"); // saved "true" means collapsed, so inverse for open state
            });
        }
    }, []);

    // Handler to toggle right sidebar and persist preference
    const handleToggleRightSidebar = () => {
        const newValue = !rightSidebarOpen;
        setRightSidebarOpen(newValue);
        localStorage.setItem(RIGHT_SIDEBAR_KEY, String(!newValue)); // Save collapsed state
    };

    // Enforce Tenant Subdomain
    useEffect(() => {
        // Wait for all data to load
        if (loading || settingsLoading || !profile?.orgId) return;

        // Skip subdomain enforcement when superadmin is impersonating
        const impersonationState =
            typeof window !== "undefined"
                ? JSON.parse(localStorage.getItem("impersonation-storage") || '{"state":{}}').state
                : {};
        if (impersonationState?.isImpersonating) {
            console.log("[DashboardLayout] Skipping subdomain redirect - impersonation active");
            return;
        }

        const host = window.location.host;

        const isLocal = host.includes("localhost");
        const rootDomain = isLocal ? "localhost:3000" : process.env.NEXT_PUBLIC_ROOT_DOMAIN || "dosory.com";

        if (!host.endsWith(rootDomain)) {
            // If we are on a completely different domain (e.g. firebaseapp.com), do not enforce redirect
            return;
        }

        let currentSubdomain = "";
        // Extract subdomain if present
        if (host !== rootDomain && host.endsWith(rootDomain)) {
            // e.g. acme.dosory.com -> acme
            currentSubdomain = host.replace(`.${rootDomain}`, "");
        }

        // Determine expected subdomain: Use custom subdomain if set.
        // If not set, but we are on a custom subdomain (not orgId), trust it and stay there.
        // Otherwise fallback to orgId default.
        const expectedSubdomain =
            settings.subdomain ||
            (currentSubdomain && currentSubdomain !== profile.orgId ? currentSubdomain : profile.orgId);

        // If current subdomain doesn't match expected one, redirect
        if (expectedSubdomain && expectedSubdomain !== currentSubdomain) {
            const protocol = window.location.protocol;
            const targetHost = `${expectedSubdomain}.${rootDomain}`;

            // Circuit Breaker: Stop infinite loops
            // We allow the redirect if we are "upgrading" from the default orgId subdomain to a custom one
            const urlParams = new URLSearchParams(window.location.search);
            const isUpgrading = currentSubdomain === profile.orgId && expectedSubdomain !== profile.orgId;

            if (urlParams.get("redirected") && !isUpgrading) {
                console.warn(`[Subdomain Redirect] Loop prevented. Stopped redirect to ${targetHost}`);
                return;
            }

            // Strict check to ensure we are not already on the target host
            if (window.location.host !== targetHost) {
                console.log(
                    `[DashboardLayout] Redirecting to tenant subdomain: ${expectedSubdomain} from ${currentSubdomain}`
                );

                const currentPath = window.location.pathname;
                const currentSearch = new URLSearchParams(window.location.search);
                currentSearch.set("redirected", "true");

                window.location.href = `${protocol}//${targetHost}${currentPath}?${currentSearch.toString()}`;
            }
        }
    }, [profile, loading, settingsLoading, settings.subdomain]);

    // Subscribe to the canonical staff profile for real-time display updates.
    // Staff docs are keyed by email (with authUid), never by uid — the previous
    // doc(db,"staff",user.uid) read depended on a duplicate uid-keyed doc that
    // provisioning never created and that the dedupe cleanup removes. Reading by
    // email also fixes the sidebar for non-admin staff, whose uid-keyed doc never existed.
    useEffect(() => {
        const email = user?.email?.toLowerCase();
        if (!email) return;

        const staffRef = doc(db, "staff", email);
        const unsubscribe = onSnapshot(staffRef, (snap) => {
            if (snap.exists()) {
                setStaffProfile(snap.data() as StaffProfile);
            }
        });

        return () => unsubscribe();
    }, [user?.email]);

    // Get display name from staff profile or fall back to auth user
    const displayName =
        staffProfile?.firstName && staffProfile?.lastName
            ? `${staffProfile.firstName} ${staffProfile.lastName}`
            : user?.displayName || t("navigation.user.fallbackName");
    const displayEmail = staffProfile?.email || user?.email;
    const displayInitial = staffProfile?.firstName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "U";

    // Only block on auth loading — settings/profile load in parallel, modules show their own skeletons
    if (loading)
        return <div className="flex h-screen items-center justify-center bg-[#F3F2EF]">{t("common.loading")}</div>;

    if (!user) {
        router.push("/login");
        return null;
    }

    // F1c: half-provisioned tenant detected — the guard is converging it via the idempotent
    // provision route. Brief; only shown when subscriptions/{orgId} is confirmed missing.
    // "failed" falls through (broken-but-visible beats an infinite setup screen).
    if (provisioningStatus === "healing") {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#F3F2EF]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-700 font-medium">{t("navigation.provisioning.finishingSetup")}</p>
            </div>
        );
    }

    if (settings.maintenanceMode) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F3F2EF]">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Settings className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("navigation.maintenance.title")}</h1>
                    <p className="text-gray-600 mb-6">
                        {t("navigation.maintenance.description", { platformName: settings.platformName ?? "" })}
                    </p>
                    <Button onClick={() => window.location.reload()}>{t("navigation.maintenance.refresh")}</Button>
                </div>
            </div>
        );
    }

    const handleLogout = async () => {
        clearCollectionCache(); // Clear stale data cache
        await signOut(auth);
        router.push("/");
    };

    const navItems = [
        { href: "/dashboard", label: t("navigation.nav.dashboard"), icon: Home, module: "home" },
        {
            label: t("navigation.nav.sales"),
            icon: Zap,
            module: "sales",
            children: [
                { href: "/dashboard/leads", label: t("navigation.nav.leads"), module: "leads" },
                { href: "/dashboard/customers", label: t("navigation.nav.customers"), module: "customers" },
                { href: "/dashboard/sales/estimates", label: t("navigation.nav.estimates"), module: "invoices" },
                { href: "/dashboard/contracts", label: t("navigation.nav.contracts"), module: "contracts" },
            ],
        },
        {
            label: t("navigation.nav.marketing"),
            icon: Book,
            module: "marketing",
            children: [
                { href: "/dashboard/knowledge-base", label: t("navigation.nav.knowledgeBase"), module: "knowledge" },
            ],
        },
        {
            label: t("navigation.nav.operations"),
            icon: FolderKanban,
            module: "projects",
            children: [
                { href: "/dashboard/projects", label: t("navigation.nav.projects"), module: "projects" },
                { href: "/dashboard/tasks", label: t("navigation.nav.tasks"), module: "tasks" },
            ],
        },
        {
            label: t("navigation.nav.accounting"),
            icon: DollarSign,
            module: "accounting",
            children: [
                { href: "/dashboard/invoices", label: t("navigation.nav.invoices"), module: "invoices" },
                { href: "/dashboard/accounting/payments", label: t("navigation.nav.payments"), module: "invoices" },
                {
                    href: "/dashboard/accounting/credit-notes",
                    label: t("navigation.nav.creditNotes"),
                    module: "invoices",
                },
                { href: "/dashboard/expenses", label: t("navigation.nav.expenses"), module: "expenses" },
            ],
        },
        {
            label: t("navigation.nav.support"),
            icon: LifeBuoy,
            module: "support",
            children: [{ href: "/dashboard/support", label: t("navigation.nav.tickets"), module: "support" }],
        },
        {
            label: t("navigation.nav.reports"),
            icon: BarChart,
            module: "reports",
            children: [{ href: "/dashboard/reports", label: t("navigation.nav.reports"), module: "reports" }],
        },
        {
            label: t("navigation.nav.hr"),
            icon: Users,
            module: "hr",
            children: [
                { href: "/dashboard/hr/employees", label: t("navigation.nav.employees"), module: "hr" },
                { href: "/dashboard/hr/attendance", label: t("navigation.nav.attendance"), module: "hr" },
                { href: "/dashboard/hr/leaves", label: t("navigation.nav.leaves"), module: "hr" },
                { href: "/dashboard/hr/payroll", label: t("navigation.nav.payroll"), module: "hr" },
                { href: "/dashboard/hr/performance", label: t("navigation.nav.performance"), module: "hr" },
                { href: "/dashboard/hr/documents", label: t("navigation.nav.documents"), module: "hr" },
                { href: "/dashboard/hr/reports", label: t("navigation.nav.hrReports"), module: "hr" },
            ],
        },
    ];

    // Filter nav items based on user permissions
    const filteredNavItems = navItems.filter((item) => {
        // Home is always visible
        if (item.module === "home") return true;
        // Check permission for this module
        return canAccessModule(permissions, isAdmin, item.module);
    });

    // Shortcuts moved to RightSidebar component

    // Get impersonation state
    const impersonationState =
        typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("impersonation-storage") || '{"state":{}}').state
            : {};
    const isImpersonating = impersonationState?.isImpersonating;
    const impersonatedOrgName = impersonationState?.impersonatedOrgName;

    const handleExitImpersonation = () => {
        localStorage.removeItem("impersonation-storage");
        window.location.href = "/sa/tenants";
    };

    return (
        <OnboardingProvider>
            <StickyNotesBoard />
            <div className="min-h-screen bg-[#F3F2EF]">
                {/* Impersonation Banner */}
                {isImpersonating && (
                    <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white py-2 px-4 z-[60] flex items-center justify-center gap-4">
                        <span className="text-sm font-medium">
                            👤 {t("navigation.impersonation.viewingAs")} <strong>{impersonatedOrgName}</strong>
                        </span>
                        <button
                            onClick={handleExitImpersonation}
                            className="bg-white text-orange-600 px-3 py-1 rounded text-sm font-medium hover:bg-orange-100"
                        >
                            {t("navigation.impersonation.exit")}
                        </button>
                    </div>
                )}

                {/* Top Header Bar */}
                <header
                    className={`fixed left-0 right-0 h-14 bg-white border-b border-[#E0E0E0] z-50 shadow-sm ${isImpersonating ? "top-10" : "top-0"}`}
                >
                    <div className="h-full px-4 flex items-center justify-between">
                        {/* Left: Tenant Logo */}
                        <div className="flex items-center">
                            <Link href="/">
                                <PlatformLogo size="default" textClassName="text-xl font-bold text-gray-900" />
                            </Link>
                        </div>

                        {/* Center: Search Bar */}
                        <div className="hidden md:flex flex-1 justify-center max-w-xl mx-4">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="search"
                                    placeholder={t("navigation.search.placeholder")}
                                    className="w-full pl-10 bg-[#F3F2EF] border border-gray-200 rounded-lg h-10 focus-visible:ring-1 focus-visible:ring-[#0A66C2]"
                                />
                            </div>
                        </div>

                        {/* Right: Actions & Profile */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="icon"
                                className="hidden sm:flex bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1c1e21] rounded-full h-10 w-10"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>

                            {/* Messages Icon */}
                            {/* Messages Icon */}
                            <Link href="/dashboard/messages" className="relative">
                                <Button
                                    size="icon"
                                    className="hidden sm:flex bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1c1e21] rounded-full h-10 w-10"
                                >
                                    <MessageSquare className="h-5 w-5" />
                                </Button>
                                {messagesUnreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                                        {messagesUnreadCount > 99 ? "99+" : messagesUnreadCount}
                                    </span>
                                )}
                            </Link>

                            {/* Language Switcher */}
                            <LanguageSwitcher variant="ghost" className="hidden sm:flex" />

                            {/* Notifications Icon */}
                            <Link href="/dashboard/notifications" className="relative">
                                <Button
                                    size="icon"
                                    className="hidden sm:flex bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1c1e21] rounded-full h-10 w-10"
                                >
                                    <Bell className="h-5 w-5" />
                                </Button>
                                {notificationUnreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                                        {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                                    </span>
                                )}
                            </Link>

                            <Button
                                size="icon"
                                className="lg:hidden bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1c1e21] rounded-full h-10 w-10"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="ml-1">
                                        <Avatar className="h-10 w-10 border-2 border-transparent hover:border-[#0A66C2] transition-colors">
                                            <AvatarImage src={staffProfile?.image || user?.photoURL || ""} />
                                            <AvatarFallback className="bg-[#0A66C2] text-white">
                                                {displayInitial}
                                            </AvatarFallback>
                                        </Avatar>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 rounded-lg shadow-xl p-2">
                                    <div className="p-3 bg-white rounded-lg shadow-sm border mb-2">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-14 w-14">
                                                <AvatarImage src={staffProfile?.image || user?.photoURL || ""} />
                                                <AvatarFallback className="bg-[#0A66C2] text-white text-lg">
                                                    {displayInitial}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-[#1c1e21]">{displayName}</p>
                                                <p className="text-sm text-[#65676B]">{displayEmail}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <DropdownMenuItem asChild className="rounded-lg">
                                        <Link
                                            href={`/dashboard/setup/team-roles/staff/${user?.uid}`}
                                            className="cursor-pointer py-3"
                                        >
                                            <User className="h-5 w-5 mr-3" />
                                            {t("navigation.menu.profileSettings")}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-lg">
                                        <Link href="/dashboard/setup/settings" className="cursor-pointer py-3">
                                            <Settings className="h-5 w-5 mr-3" />
                                            {t("navigation.menu.settingsPrivacy")}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="text-red-600 cursor-pointer rounded-lg py-3"
                                    >
                                        <LogOut className="h-5 w-5 mr-3" />
                                        {t("navigation.menu.logout")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Main 3-Column Layout */}
                <div className="pt-14 flex">
                    {/* Left Sidebar - Fixed */}
                    <aside
                        className={`hidden lg:block w-[240px] fixed left-0 bottom-0 overflow-y-auto px-2 py-3 ${isImpersonating ? "top-24" : "top-14"}`}
                    >
                        <nav className="space-y-0.5">
                            {/* Navigation Items */}
                            {filteredNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.href ? pathname === item.href : false;

                                if (item.children) {
                                    const isExpanded = expandedSections.includes(item.label);
                                    const hasActiveChild = item.children.some(
                                        (child) => pathname === child.href || pathname.startsWith(child.href + "/")
                                    );

                                    const toggleSection = () => {
                                        setExpandedSections((prev) =>
                                            prev.includes(item.label)
                                                ? prev.filter((s) => s !== item.label)
                                                : [...prev, item.label]
                                        );
                                    };

                                    return (
                                        <div key={item.label}>
                                            <button
                                                onClick={toggleSection}
                                                className={cn(
                                                    "flex items-center justify-between w-full p-2 rounded-lg transition-colors",
                                                    hasActiveChild
                                                        ? "text-[#0A66C2]"
                                                        : "text-[#65676B] hover:bg-[#E4E6EB]"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                                            hasActiveChild ? "bg-[#0A66C2] text-white" : "bg-[#E4E6EB]"
                                                        )}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium text-sm">{item.label}</span>
                                                </div>
                                                <ChevronDown
                                                    className={cn(
                                                        "h-4 w-4 transition-transform duration-200",
                                                        isExpanded ? "rotate-180" : ""
                                                    )}
                                                />
                                            </button>
                                            <div
                                                className={cn(
                                                    "ml-5 space-y-0.5 overflow-hidden transition-all duration-200",
                                                    isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                                )}
                                            >
                                                {item.children.map((child) => (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={cn(
                                                            "block py-1.5 px-3 rounded-lg text-sm transition-colors",
                                                            pathname === child.href ||
                                                                pathname.startsWith(child.href + "/")
                                                                ? "bg-[#E7F3FF] text-[#0A66C2] font-medium"
                                                                : "text-[#65676B] hover:bg-[#E4E6EB]"
                                                        )}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href!}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg transition-colors",
                                            isActive
                                                ? "bg-[#E7F3FF] text-[#0A66C2]"
                                                : "text-[#1c1e21] hover:bg-[#E4E6EB]"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center",
                                                isActive ? "bg-[#0A66C2] text-white" : "bg-[#E4E6EB]"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium text-sm">{item.label}</span>
                                    </Link>
                                );
                            })}

                            {/* Setup Link */}
                            <button
                                onClick={() => setSetupOpen(true)}
                                className="flex items-center gap-2 p-2 rounded-lg text-[#1c1e21] hover:bg-[#E4E6EB] transition-colors w-full text-left"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#E4E6EB] flex items-center justify-center">
                                    <Settings className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-sm">{t("navigation.nav.setup")}</span>
                            </button>
                        </nav>
                    </aside>

                    {/* Center Content - Scrollable */}
                    <main
                        className={cn(
                            "flex-1 lg:ml-[240px] min-h-[calc(100vh-56px)] p-3 overflow-hidden transition-all duration-300",
                            rightSidebarOpen ? "lg:mr-[220px]" : "lg:mr-0"
                        )}
                    >
                        <div className="w-full overflow-x-auto">
                            {/* Content Card */}
                            <div className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] min-w-0">
                                <div className="p-4 overflow-x-auto">
                                    <SystemBanners />
                                    {/* R3: persistent provisioning failure must not be silent — without the
                                        subscription doc every write 403s "No subscription found". Reload re-runs
                                        the healing guard (its once-per-mount ref resets). */}
                                    {provisioningStatus === "failed" && (
                                        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                            <span>{t("navigation.provisioning.setupIncomplete")}</span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.location.reload()}
                                            >
                                                {t("navigation.provisioning.retry")}
                                            </Button>
                                        </div>
                                    )}
                                    {children}
                                </div>
                            </div>
                        </div>

                        {/* Toggle Right Sidebar Button */}
                        <button
                            onClick={handleToggleRightSidebar}
                            className={cn(
                                "hidden lg:flex fixed z-50 items-center justify-center w-3 h-8 bg-white rounded-l-md shadow-sm border-y border-l border-[#E0E0E0] hover:bg-[#F3F2EF] transition-all duration-300",
                                isImpersonating ? "top-28" : "top-[70px]",
                                rightSidebarOpen ? "right-[220px]" : "right-0"
                            )}
                            title={rightSidebarOpen ? t("navigation.panel.hide") : t("navigation.panel.show")}
                        >
                            {rightSidebarOpen ? (
                                <PanelRightClose className="h-3 w-3 text-[#65676B]" />
                            ) : (
                                <PanelRightOpen className="h-3 w-3 text-[#65676B]" />
                            )}
                        </button>
                    </main>

                    {/* Right Sidebar - Fixed & Collapsible */}
                    <RightSidebar isOpen={rightSidebarOpen} topOffset={isImpersonating ? "top-24" : "top-14"} />
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div
                        className={`lg:hidden fixed inset-0 bg-white z-40 overflow-y-auto p-4 ${isImpersonating ? "top-24" : "top-14"}`}
                    >
                        <nav className="space-y-1">
                            {filteredNavItems.map((item) => {
                                const Icon = item.icon;
                                if (item.children) {
                                    return (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex items-center gap-3 p-3 text-[#65676B] font-medium">
                                                <Icon className="h-5 w-5" />
                                                {item.label}
                                            </div>
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block py-2 px-10 text-[#65676B] hover:bg-[#E4E6EB] rounded-lg"
                                                >
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    );
                                }
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href!}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                            pathname === item.href
                                                ? "bg-[#E7F3FF] text-[#0A66C2]"
                                                : "text-[#1c1e21] hover:bg-[#E4E6EB]"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </div>

            {/* Onboarding Wizard */}
            <OnboardingWizard />

            {/* Setup Sidebar */}
            <SetupSidebar
                isOpen={setupOpen}
                onClose={() => setSetupOpen(false)}
                topOffset={isImpersonating ? "top-24" : "top-14"}
            />

            {/* Floating Onboarding Widget */}
            {/* <OnboardingChecklist /> */}
        </OnboardingProvider>
    );
}
