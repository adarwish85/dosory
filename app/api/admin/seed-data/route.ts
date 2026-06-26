import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export async function GET(req: NextRequest) {
    // A1: a GET that injects fake fixture data into the first tenant it finds — Super Admin
    // only. (Candidate for deletion: it writes the "Acme Corp" demo data the audit flagged.)
    const authResult = await requireSuperAdmin(req);
    if (!authResult.success) return authResult.response;

    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("userId");

    if (!userId) {
        // Try to find first user
        const usersSnap = await adminDb.collection("users").limit(1).get();
        if (usersSnap.empty) {
            return NextResponse.json({ error: "No users found. Please signup first." }, { status: 404 });
        }
        userId = usersSnap.docs[0].id;
        console.log("Auto-selected userId:", userId);
    }

    try {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const orgId = userData?.orgId || userData?.organizationId;

        if (!orgId) {
            return NextResponse.json({ error: "User has no orgId" }, { status: 400 });
        }

        console.log(`Seeding data for Org: ${orgId}`);

        // 1. Create Customers
        const customers = [
            { name: "Acme Corp", email: "contact@acme.com", status: "active" },
            { name: "Globex Inc", email: "info@globex.com", status: "active" },
            { name: "Soylent Corp", email: "sales@soylent.com", status: "inactive" },
        ];

        const customerIds = [];
        for (const c of customers) {
            const ref = await adminDb.collection("customers").add({
                ...c,
                orgId,
                createdAt: FieldValue.serverTimestamp(),
                phone: "555-0123",
                address: "123 Business Rd",
            });
            customerIds.push(ref.id);
        }

        // 2. Create Projects
        const projects = [
            { title: "Website Redesign", budget: 5000, status: "in_progress", customerId: customerIds[0] },
            { title: "Mobile App", budget: 15000, status: "planning", customerId: customerIds[1] },
        ];

        for (const p of projects) {
            await adminDb.collection("projects").add({
                ...p,
                orgId,
                createdAt: FieldValue.serverTimestamp(),
                dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
            });
        }

        // 3. Create Invoices
        // Past 6 months distribution
        const invoices = [
            { amount: 1200, status: "paid", date: new Date(Date.now() - 86400000 * 5) },
            { amount: 3500, status: "pending", date: new Date() },
            { amount: 800, status: "overdue", date: new Date(Date.now() - 86400000 * 15) },
            { amount: 5000, status: "paid", date: new Date(Date.now() - 86400000 * 45) }, // Last month
            { amount: 450, status: "draft", date: new Date() },
        ];

        for (const inv of invoices) {
            const total = inv.amount;
            const amountPaid = inv.status === "paid" ? total : 0;
            const amountDue = total - amountPaid;

            await adminDb.collection("invoices").add({
                ...inv,
                invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
                orgId,
                customerId: customerIds[0],
                createdAt: FieldValue.serverTimestamp(),
                dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
                items: [{ description: "Service", quantity: 1, price: inv.amount, amount: inv.amount }],
                subtotal: total,
                taxTotal: 0,
                total: total,
                amountPaid: amountPaid,
                amountDue: amountDue,
                currency: "USD",
                createdBy: userId,
            });
        }

        return NextResponse.json({ success: true, message: "Data seeded successfully" });
    } catch (error) {
        console.error("Seeding error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
