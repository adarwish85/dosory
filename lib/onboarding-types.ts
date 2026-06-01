// Onboarding types and constants

export type OnboardingRole = "admin" | "staff";

export type OnboardingUseCase = "sales" | "billing" | "projects" | "full";

export interface OnboardingSteps {
    welcome: boolean;
    companyProfile: boolean;
    firstRecord: boolean;
    inviteTeam: boolean;
    integrations: boolean;
}

export interface OnboardingState {
    completed: boolean;
    startedAt: Date | null;
    completedAt: Date | null;
    role: OnboardingRole;
    useCase: OnboardingUseCase | null;
    steps: OnboardingSteps;
    skippedAt: Date | null;
    currentStep: number;
    emailsSent: string[];
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
    completed: false,
    startedAt: null,
    completedAt: null,
    role: "admin",
    useCase: null,
    steps: {
        welcome: false,
        companyProfile: false,
        firstRecord: false,
        inviteTeam: false,
        integrations: false,
    },
    skippedAt: null,
    currentStep: 0,
    emailsSent: [],
};

export const ADMIN_STEPS = [
    { key: "welcome", label: "Welcome", description: "Choose your use case" },
    { key: "companyProfile", label: "Company Profile", description: "Set up your business info" },
    { key: "firstRecord", label: "First Record", description: "Add your first customer or lead" },
    { key: "inviteTeam", label: "Invite Team", description: "Add team members (optional)" },
    { key: "integrations", label: "Integrations", description: "Connect email & payments (optional)" },
];

export const STAFF_STEPS = [
    { key: "welcome", label: "Welcome", description: "Quick tour of features" },
    { key: "firstRecord", label: "First Action", description: "Complete your first task" },
];

export const USE_CASE_OPTIONS = [
    { value: "sales", label: "Sales & CRM", description: "Manage leads, estimates, and customers", icon: "🎯" },
    { value: "billing", label: "Invoicing & Billing", description: "Create invoices and track payments", icon: "💰" },
    { value: "projects", label: "Project Management", description: "Manage projects and tasks", icon: "📋" },
    { value: "full", label: "Full Suite", description: "Use all features", icon: "🚀" },
];
