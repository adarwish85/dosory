/**
 * Seed the DEMO tenant with realistic, fake (no-PII) data for marketing screenshots.
 *
 * Target org: xa05pc7etiatsusju8xyygdazqk2 (a demo tenant — safe to publish).
 * Populates: customers, contacts, leads (pipeline), invoices, projects, tasks,
 * employees (+departments/job-titles), expenses (+categories).
 *
 * Run:  npx tsx scripts/seed-demo-tenant.ts
 *
 * DESTRUCTIVE — READ BEFORE RUNNING. There is no idempotency guard (an earlier version of
 * this header claimed one; it never existed). Every run DELETES every document in the
 * SEEDABLE collections below for ORG_ID and for WIPE_ALSO, then re-seeds from scratch.
 * Re-runs don't pile up because the data is wiped, not because it is skipped. Only ever
 * point this at a tenant whose data is disposable.
 */
import { admin, db } from "./_admin";

// Target demo tenant (what the live dashboard reads — logged in as jobsys@gmail.com).
const ORG_ID = "wasiladev";
const OWNER_UID = "xa05pc7EtiatSuSJu8xYygdAZqk2"; // jobsys@gmail.com — assignee for "my work" views
// Orgs to wipe clean (no seed) — removes the earlier mis-seed from the "testy" tenant.
const WIPE_ALSO = ["org_uI7Ufzr4bXZLYQXLpfruSEXPKAI2_1765902729459"];

const FieldValue = admin.firestore.FieldValue;
const ts = (daysFromNow: number) => admin.firestore.Timestamp.fromDate(new Date(Date.now() + daysFromNow * 86400000));
const now = () => FieldValue.serverTimestamp();

// `jobTitles` is kept here purely to CLEAN UP the camelCase docs earlier runs of this script
// wrote; nothing reads that collection. The seeder now writes `job_titles`, which the app does.
const SEEDABLE = [
    "customers",
    "contacts",
    "leads",
    "invoices",
    "estimates",
    "projects",
    "tasks",
    "employees",
    "departments",
    "job_titles",
    "jobTitles",
    "expenses",
    "expenseCategories",
    "activities",
    "payments",
];

async function wipeOrg(orgId: string) {
    let grand = 0;
    for (const col of SEEDABLE) {
        let total = 0;
        while (true) {
            const snap = await db.collection(col).where("orgId", "==", orgId).limit(450).get();
            if (snap.empty) break;
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            total += snap.size;
        }
        if (total) console.log(`    ${col}: -${total}`);
        grand += total;
    }
    console.log(`  ✓ wiped ${grand} docs from ${orgId}`);
}

async function main() {
    // 1. Clean up the earlier mis-seed from the wrong tenant(s).
    for (const org of WIPE_ALSO) {
        console.log(`Wiping mis-seed from ${org}…`);
        await wipeOrg(org);
    }

    // 2. Wipe the real demo tenant clean, then seed curated data.
    console.log(`Wiping demo tenant ${ORG_ID}…`);
    await wipeOrg(ORG_ID);

    const ownerId = OWNER_UID;
    const base = { orgId: ORG_ID, createdBy: ownerId, createdAt: now(), updatedAt: now() };
    console.log(`Seeding org ${ORG_ID} (owner ${ownerId})…`);

    // ---------------- Customers + contacts ----------------
    const customers = [
        {
            company: "Northwind Trading",
            email: "ops@northwind.co",
            phone: "+1 415 555 0192",
            status: "active",
            city: "San Francisco",
        },
        {
            company: "Meridian Studios",
            email: "hello@meridian.design",
            phone: "+1 212 555 0148",
            status: "active",
            city: "New York",
        },
        {
            company: "Brightpath Logistics",
            email: "dispatch@brightpath.io",
            phone: "+1 312 555 0177",
            status: "active",
            city: "Chicago",
        },
        {
            company: "Cedar & Co.",
            email: "accounts@cedar.co",
            phone: "+1 206 555 0133",
            status: "active",
            city: "Seattle",
        },
        {
            company: "Lumen Health",
            email: "billing@lumenhealth.com",
            phone: "+1 617 555 0166",
            status: "active",
            city: "Boston",
        },
        {
            company: "Atlas Manufacturing",
            email: "po@atlasmfg.com",
            phone: "+1 713 555 0121",
            status: "inactive",
            city: "Houston",
        },
        {
            company: "Vertex Analytics",
            email: "team@vertex.ai",
            phone: "+1 408 555 0188",
            status: "active",
            city: "San Jose",
        },
        {
            company: "Harbor & Vine",
            email: "events@harborvine.com",
            phone: "+1 305 555 0154",
            status: "active",
            city: "Miami",
        },
    ];
    const custIds: string[] = [];
    for (const c of customers) {
        const ref = await db.collection("customers").add({
            company: c.company,
            name: c.company,
            email: c.email,
            phone: c.phone,
            status: c.status,
            address: { city: c.city, country: "United States" },
            ...base,
        });
        custIds.push(ref.id);
        await db.collection("contacts").add({
            firstName: ["Sarah", "James", "Mia", "David", "Elena", "Tom", "Priya", "Noah"][custIds.length % 8],
            lastName: ["Chen", "Okafor", "Rossi", "Park", "Costa", "Hughes", "Patel", "Berg"][custIds.length % 8],
            email: `contact@${c.email.split("@")[1]}`,
            phone: c.phone,
            customerId: ref.id,
            isPrimary: true,
            ...base,
        });
    }
    console.log(`  ✓ ${custIds.length} customers + contacts`);

    // ---------------- Leads (pipeline) ----------------
    const leads = [
        { name: "Acme Robotics", company: "Acme Robotics", status: "new", value: 14000, source: "Website" },
        { name: "Orbit Media", company: "Orbit Media", status: "new", value: 6500, source: "Referral" },
        {
            name: "Pinecrest Realty",
            company: "Pinecrest Realty",
            status: "contacted",
            value: 9200,
            source: "Cold email",
        },
        { name: "Bluewave Foods", company: "Bluewave Foods", status: "contacted", value: 21000, source: "Trade show" },
        { name: "Summit Legal", company: "Summit Legal", status: "qualified", value: 33000, source: "Referral" },
        { name: "Nova Fitness", company: "Nova Fitness", status: "qualified", value: 12500, source: "Website" },
        {
            name: "Greenleaf Energy",
            company: "Greenleaf Energy",
            status: "offer-sent",
            value: 48000,
            source: "Partner",
        },
        { name: "Cobalt Software", company: "Cobalt Software", status: "offer-sent", value: 27500, source: "Website" },
        { name: "Riverside Hotels", company: "Riverside Hotels", status: "won", value: 54000, source: "Referral" },
        { name: "Delta Freight", company: "Delta Freight", status: "won", value: 18900, source: "Cold email" },
        { name: "Maple & Stone", company: "Maple & Stone", status: "lost", value: 8000, source: "Website" },
    ];
    for (const l of leads) {
        await db.collection("leads").add({
            name: l.name,
            company: l.company,
            email: `sales@${l.company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
            status: l.status,
            value: l.value,
            source: l.source,
            assignedTo: ownerId,
            isPublic: false,
            ...base,
        });
    }
    console.log(`  ✓ ${leads.length} leads`);

    // ---------------- Invoices ----------------
    const mkItems = (rows: [string, number, number][]) =>
        rows.map(([description, quantity, rate], i) => ({
            id: `it_${i}`,
            description,
            quantity,
            rate,
            taxRate: 0,
            amount: quantity * rate,
        }));
    const invoiceDefs = [
        {
            n: 1024,
            ci: 0,
            status: "paid",
            items: mkItems([
                ["Implementation — Phase 1", 1, 8500],
                ["Onboarding & training", 6, 250],
            ]),
        },
        { n: 1025, ci: 1, status: "paid", items: mkItems([["Brand & UI design retainer", 1, 6000]]) },
        {
            n: 1026,
            ci: 2,
            status: "sent",
            items: mkItems([
                ["Logistics platform — monthly", 1, 3200],
                ["Premium support", 1, 800],
            ]),
        },
        {
            n: 1027,
            ci: 4,
            status: "overdue",
            items: mkItems([
                ["Compliance module", 1, 4500],
                ["Data migration", 12, 180],
            ]),
        },
        { n: 1028, ci: 3, status: "sent", items: mkItems([["Consulting — September", 24, 220]]) },
        {
            n: 1029,
            ci: 6,
            status: "partial",
            items: mkItems([
                ["Analytics seats (10)", 10, 49],
                ["Setup fee", 1, 1500],
            ]),
        },
        { n: 1030, ci: 7, status: "draft", items: mkItems([["Event package", 1, 12500]]) },
        { n: 1031, ci: 1, status: "paid", items: mkItems([["Website refresh", 1, 7400]]) },
    ];
    // Demo data must be INTERNALLY CONSISTENT. This used to set amountPaid/amountDue
    // directly and create no payment documents at all, so a demo tenant had invoices marked
    // paid that no payment explained — `total - payments - amountDue` was non-zero for every
    // one of them, and the accounting invariant check flagged them as violations that were
    // really just fabricated data. Every non-zero amountPaid now has a payment behind it.
    let paymentCount = 0;
    for (const inv of invoiceDefs) {
        const subtotal = inv.items.reduce((s, it) => s + it.amount, 0);
        const total = subtotal;
        const amountPaid = inv.status === "paid" ? total : inv.status === "partial" ? Math.round(total * 0.4) : 0;
        const invoiceRef = await db.collection("invoices").add({
            number: `INV-${inv.n}`,
            invoiceNumber: `INV-${inv.n}`,
            customerId: custIds[inv.ci],
            customerName: customers[inv.ci].company,
            date: ts(-(inv.n - 1020) * 3),
            dueDate: ts(inv.status === "overdue" ? -8 : 14),
            currency: "USD",
            items: inv.items,
            subtotal,
            taxTotal: 0,
            total,
            amountPaid,
            amountDue: total - amountPaid,
            status: inv.status,
            ...base,
        });

        // The payment that explains amountPaid, so total - payments - amountDue === 0.
        if (amountPaid > 0) {
            await db.collection("payments").add({
                invoiceId: invoiceRef.id,
                invoiceNumber: `INV-${inv.n}`,
                customerId: custIds[inv.ci],
                customerName: customers[inv.ci].company,
                amount: amountPaid,
                currency: "USD",
                date: ts(-(inv.n - 1020) * 3 + 2),
                paymentMode: "Bank Transfer",
                note: "Seeded demo payment",
                ...base,
            });
            paymentCount++;
        }
    }
    console.log(`  ✓ ${invoiceDefs.length} invoices, ${paymentCount} matching payments`);

    // ---------------- Projects + tasks ----------------
    const projectDefs = [
        { name: "Website Redesign", ci: 1, status: "active", priority: "high", progress: 62 },
        { name: "ERP Rollout — Phase 2", ci: 0, status: "active", priority: "critical", progress: 38 },
        { name: "Mobile App MVP", ci: 6, status: "active", priority: "medium", progress: 75 },
        { name: "Brand Refresh", ci: 7, status: "on_hold", priority: "low", progress: 20 },
        { name: "Data Migration", ci: 4, status: "completed", priority: "high", progress: 100 },
    ];
    const projIds: string[] = [];
    for (const p of projectDefs) {
        const ref = await db.collection("projects").add({
            name: p.name,
            customerId: custIds[p.ci],
            customerName: customers[p.ci].company,
            description: `${p.name} engagement for ${customers[p.ci].company}.`,
            status: p.status,
            priority: p.priority,
            projectType: "client",
            billingType: "fixed",
            projectRate: 0,
            currency: "USD",
            progress: p.progress,
            startDate: ts(-30),
            deadline: ts(30),
            members: [{ userId: ownerId, role: "project_admin" }],
            projectOwnerId: ownerId,
            ...base,
        });
        projIds.push(ref.id);
    }
    const taskDefs = [
        ["Wireframe key pages", 0, "done", "high"],
        ["Design system tokens", 0, "in_progress", "medium"],
        ["Homepage build", 0, "in_progress", "high"],
        ["SEO audit", 0, "to_do", "low"],
        ["Chart of accounts setup", 1, "done", "high"],
        ["Migrate suppliers", 1, "in_progress", "critical"],
        ["Train finance team", 1, "to_do", "medium"],
        ["Auth & onboarding", 2, "done", "high"],
        ["Push notifications", 2, "in_progress", "medium"],
        ["App store assets", 2, "to_do", "low"],
        ["Moodboard sign-off", 3, "blocked", "medium"],
        ["Final QA pass", 4, "done", "high"],
    ] as const;
    for (const [name, pi, status, priority] of taskDefs) {
        await db.collection("tasks").add({
            name,
            projectId: projIds[pi],
            status,
            priority,
            assignees: [ownerId],
            followers: [],
            dueDate: ts(Math.floor(Math.random() * 20) - 5),
            billable: true,
            isPublic: false,
            ...base,
        });
    }
    console.log(`  ✓ ${projIds.length} projects + ${taskDefs.length} tasks`);

    // ---------------- HR: departments, job titles, employees ----------------
    // Collection name and shape must match what the app READS, or the seed is invisible:
    //   - job titles live in `job_titles` (snake_case). This script wrote `jobTitles`, which
    //     no reader queries — useJobTitles, the employee form's select and use-employees'
    //     denormalisation lookup all use `job_titles`. A Sweep E split-brain in seed data.
    //   - both hooks orderBy("name") and the lists filter on status, so a row without
    //     `status: "active"` sorts/filters out of the UI even when it exists.
    const deptDefs = ["Engineering", "Sales", "Operations", "Finance"];
    const deptIds: Record<string, string> = {};
    for (const name of deptDefs) {
        const ref = await db.collection("departments").add({ name, status: "active", employeeCount: 0, ...base });
        deptIds[name] = ref.id;
    }
    const titleDefs = ["Software Engineer", "Account Executive", "Operations Lead", "Accountant"];
    const titleIds: Record<string, string> = {};
    for (const name of titleDefs) {
        const ref = await db.collection("job_titles").add({ name, status: "active", ...base });
        titleIds[name] = ref.id;
    }
    const employees = [
        {
            firstName: "Sarah",
            lastName: "Chen",
            dept: "Engineering",
            title: "Software Engineer",
            type: "full_time",
            loc: "hybrid",
        },
        {
            firstName: "Marcus",
            lastName: "Webb",
            dept: "Sales",
            title: "Account Executive",
            type: "full_time",
            loc: "remote",
        },
        {
            firstName: "Aisha",
            lastName: "Rahman",
            dept: "Operations",
            title: "Operations Lead",
            type: "full_time",
            loc: "office",
        },
        {
            firstName: "Daniel",
            lastName: "Ortiz",
            dept: "Finance",
            title: "Accountant",
            type: "full_time",
            loc: "office",
        },
        {
            firstName: "Lena",
            lastName: "Novak",
            dept: "Engineering",
            title: "Software Engineer",
            type: "contractor",
            loc: "remote",
        },
        {
            firstName: "Tom",
            lastName: "Fielding",
            dept: "Sales",
            title: "Account Executive",
            type: "part_time",
            loc: "hybrid",
        },
    ];
    for (const e of employees) {
        await db.collection("employees").add({
            firstName: e.firstName,
            lastName: e.lastName,
            email: `${e.firstName.toLowerCase()}.${e.lastName.toLowerCase()}@demo.dosory.com`,
            phone: "+1 555 010 0" + Math.floor(Math.random() * 900 + 100),
            employmentType: e.type,
            // The employees list renders the DENORMALISED names (`departmentName` /
            // `jobTitleName`, written by use-employees.createEmployee). `department` /
            // `jobTitle` are read by nothing, so seeded staff showed "No department".
            departmentId: deptIds[e.dept],
            departmentName: e.dept,
            jobTitleId: titleIds[e.title],
            jobTitleName: e.title,
            hireDate: ts(-Math.floor(Math.random() * 700 + 60)),
            status: "active",
            workLocation: e.loc,
            hrRole: "employee",
            ...base,
        });
    }
    console.log(`  ✓ ${deptDefs.length} departments, ${titleDefs.length} job titles, ${employees.length} employees`);

    // ---------------- Finance: expense categories + expenses ----------------
    const catDefs = ["Software", "Travel", "Office", "Marketing", "Contractors"];
    const catIds: Record<string, string> = {};
    for (const name of catDefs) {
        const ref = await db.collection("expenseCategories").add({ name, ...base });
        catIds[name] = ref.id;
    }
    const expenseDefs = [
        { cat: "Software", payee: "Cloud Hosting", amount: 1240, days: -3 },
        { cat: "Software", payee: "Design Suite", amount: 540, days: -8 },
        { cat: "Travel", payee: "Client visit — NYC", amount: 880, days: -12 },
        { cat: "Marketing", payee: "Conference booth", amount: 3200, days: -20 },
        { cat: "Office", payee: "Co-working space", amount: 1500, days: -25 },
        { cat: "Contractors", payee: "Lena Novak", amount: 4800, days: -30 },
        { cat: "Software", payee: "Analytics platform", amount: 290, days: -2 },
        { cat: "Travel", payee: "Team offsite", amount: 2100, days: -18 },
    ];
    for (const x of expenseDefs) {
        await db.collection("expenses").add({
            categoryId: catIds[x.cat],
            category: x.cat,
            payee: x.payee,
            amount: x.amount,
            currency: "USD",
            date: ts(x.days),
            billable: false,
            description: `${x.cat} expense — ${x.payee}`,
            ...base,
        });
    }
    console.log(`  ✓ ${catDefs.length} expense categories, ${expenseDefs.length} expenses`);

    console.log("\n✅ Demo tenant seeded. Refresh the dashboard to see it populated.");
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    });
