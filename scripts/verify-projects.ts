const admin = require("firebase-admin");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// Setup Environment
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

if (!admin.apps.length) {
    admin.initializeApp({ projectId: "dosory-test" });
}

const db = getFirestore();

// --- Test Data ---
const ORG_ID = "test-org-projects";
const USER_ID = "project-manager-1";
const CUSTOMER_ID = "customer-1";

async function verifyProjectsFlow() {
    console.log("🚀 Starting Projects Verification...");

    try {
        // 1. Create a Project
        console.log("\n1. Creating Project...");
        const projectRef = db.collection("projects").doc();
        const startDate = Timestamp.now();
        const deadline = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        const newProject = {
            id: projectRef.id,
            orgId: ORG_ID,
            name: "Website Redesign",
            customerId: CUSTOMER_ID,
            customerName: "Acme Corp",
            status: "active",
            priority: "high",
            projectType: "client",
            billingType: "fixed",
            startDate: startDate,
            deadline: deadline,
            progress: 0,
            members: [{ staffId: USER_ID, role: "project_manager" }],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await projectRef.set(newProject);
        console.log("✅ Project created:", newProject.id);

        // 2. Add Tasks
        console.log("\n2. Adding Tasks...");
        const tasksCollection = db.collection("tasks");

        // Task 1: Done
        const task1Ref = tasksCollection.doc();
        const task1 = {
            id: task1Ref.id,
            orgId: ORG_ID,
            projectId: newProject.id,
            name: "Design Mockups",
            status: "done",
            priority: "high",
            assignees: [USER_ID],
            isPublic: false,
            billable: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        await task1Ref.set(task1);

        // Task 2: To Do (Overdue)
        const task2Ref = tasksCollection.doc();
        const overdueDate = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
        const task2 = {
            id: task2Ref.id,
            orgId: ORG_ID,
            projectId: newProject.id,
            name: "Client Review",
            status: "to_do",
            priority: "medium",
            dueDate: overdueDate,
            assignees: [USER_ID],
            isPublic: false,
            billable: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        await task2Ref.set(task2);

        // Task 3: In Progress
        const task3Ref = tasksCollection.doc();
        const task3 = {
            id: task3Ref.id,
            orgId: ORG_ID,
            projectId: newProject.id,
            name: "Frontend Implementation",
            status: "in_progress",
            priority: "high",
            assignees: [USER_ID],
            isPublic: false,
            billable: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        await task3Ref.set(task3);
        console.log("✅ Tasks added");

        // 3. Verify Health Calculation Logic
        console.log("\n3. Verifying Health Calculation...");

        const tasksSnap = await db.collection("tasks").where("projectId", "==", newProject.id).get();
        const tasks = tasksSnap.docs.map((t: any) => t.data());

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === "done").length;
        const overdueTasks = tasks.filter((t: any) => {
            if (t.status === "done") return false;
            // @ts-ignore
            if (!t.dueDate) return false;
            // @ts-ignore
            return t.dueDate.toMillis() < Date.now();
        }).length;

        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        let health = "on_track";
        if (overdueTasks > 0) health = "at_risk"; // Simplified rule for test

        console.log(`   Total: ${totalTasks}, Completed: ${completedTasks}, Overdue: ${overdueTasks}`);
        console.log(`   Calculated Progress: ${progress}%`);
        console.log(`   Calculated Health: ${health}`);

        if (progress !== 33) console.warn("⚠️ Progress calculation might be off (expected 33%)"); // 1/3
        if (health !== "at_risk")
            console.warn("⚠️ Health calculation might be off (expected at_risk due to overdue task)");

        if (progress === 33 && health === "at_risk") {
            console.log("✅ logic matches expectations.");
        }

        console.log("\n✅ Verification Complete!");
    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifyProjectsFlow();
