
import { TenantEntitlements } from "../lib/entitlements/tenantEntitlements";
import { BillingService } from "../lib/services/billing-service";
import { adminDb } from "../lib/firebase-admin";

// Mocks
const mockPlan = {
    id: "plan_test",
    name: "Test Plan",
    limits: { maxUsers: 5, storageGB: 10 },
    entitlements: {
        modules: ["crm", "billing"],
        featuresByModule: {
            crm: { canExport: false },
            support: { customerPortal: false }
        }
    }
};

const mockAddon = {
    id: "addon_portal",
    status: "active",
    effect: {
        enableModules: ["support"],
        enableFeaturesByModule: {
            support: { customerPortal: true }
        }
    }
};

const mockSubscription = {
    planId: "plan_test",
    planVersion: 1,
    status: "active",
    addons: [] as any[]
};

const mockUsage = {
    usersCount: 3,
    storageUsedGB: 5
};

// Override mocks
BillingService.getSubscription = async () => mockSubscription as any;
BillingService.getPublishedPlan = async () => mockPlan as any;
BillingService.getAddon = async () => mockAddon as any;
BillingService.getTenantUsage = async () => mockUsage as any;

// Mock DB update
(adminDb.collection as any) = () => ({
    doc: () => ({
        update: async () => { },
        set: async () => { },
    })
});

async function runTests() {
    console.log("Starting Verification Tests...");

    // Test 1: Resolve Entitlements (Base Plan)
    console.log("\nTest 1: Base Entitlements");
    mockSubscription.addons = [];
    const ent1 = await TenantEntitlements.resolveTenantEntitlements("t1");
    if (ent1?.limits.maxUsers !== 5) throw new Error("Base limit fail");
    if (ent1?.enabledModules.includes("support")) throw new Error("Base module fail");
    console.log("PASS");

    // Test 2: Addon Application
    console.log("\nTest 2: Addon Application");
    mockSubscription.addons = [{ addonId: "addon_portal", quantity: 1 }];
    const ent2 = await TenantEntitlements.resolveTenantEntitlements("t1");
    if (!ent2?.enabledModules.includes("support")) throw new Error("Addon module fail");
    if (!ent2?.featuresByModule.support.customerPortal) throw new Error("Addon feature fail");
    console.log("PASS");

    // Test 3: Limits
    console.log("\nTest 3: Limit Checking");
    // Mock computed entitlements being present on subscription
    (mockSubscription as any).computedEntitlements = ent1;

    // 3 users / 5 allowed
    const check1 = await TenantEntitlements.checkLimit("t1", "maxUsers");
    if (check1.exceeded) throw new Error("Should not be exceeded");

    // Simulate usage increase
    mockUsage.usersCount = 5;
    const check2 = await TenantEntitlements.checkLimit("t1", "maxUsers");
    if (!check2.exceeded) throw new Error("Should be exceeded (at limit)");
    // Wait, usually >= limit means you can't add MORE. checkLimit logic: current >= allowed means exceeded? 
    // Yes: current 5 >= allowed 5 -> exceeded = true.

    // Test enforcement
    try {
        await TenantEntitlements.enforceLimit("t1", "maxUsers");
        throw new Error("Should have thrown");
    } catch (e: any) {
        if (!e.message.includes("LIMIT_EXCEEDED")) throw e;
    }
    console.log("PASS");

    // Test 4: Write Access
    console.log("\nTest 4: Subscription Status Write Access");
    mockSubscription.status = "suspended";
    try {
        await TenantEntitlements.ensureWriteAccess("t1");
        throw new Error("Should have blocked suspended");
    } catch (e: any) {
        if (!e.message.includes("ACTION_BLOCKED")) throw e;
    }
    console.log("PASS");

    console.log("\nALL TESTS PASSED");
}

runTests().catch(console.error);
