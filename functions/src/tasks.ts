import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface TaskRepeat {
    frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
    interval?: number;
    endDate?: admin.firestore.Timestamp;
}

export const onTaskUpdate = functions.firestore
    .document("tasks/{taskId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // 1. Check if status changed from !completed to completed
        if (before.status === "completed" || after.status !== "completed") {
            return null;
        }

        // 2. Check if recurring
        const repeat = after.repeat as TaskRepeat | undefined;
        if (!repeat) return null;

        // 3. Check if we already generated the next task
        if (after.nextTaskId) return null;

        // 4. Calculate next StartDate and DueDate
        const oldStartDate = after.startDate ? after.startDate.toDate() : new Date();
        const oldDueDate = after.dueDate ? after.dueDate.toDate() : null;

        let nextStartDate = new Date(oldStartDate);
        let nextDueDate = oldDueDate ? new Date(oldDueDate) : null;

        const interval = repeat.interval || 1;

        const addDays = (date: Date, days: number) => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        };
        const addMonths = (date: Date, months: number) => {
            const result = new Date(date);
            result.setMonth(result.getMonth() + months);
            return result;
        };
        const addYears = (date: Date, years: number) => {
            const result = new Date(date);
            result.setFullYear(result.getFullYear() + years);
            return result;
        };

        if (repeat.frequency === "daily") {
            nextStartDate = addDays(nextStartDate, interval);
            if (nextDueDate) nextDueDate = addDays(nextDueDate, interval);
        } else if (repeat.frequency === "weekly") {
            nextStartDate = addDays(nextStartDate, interval * 7);
            if (nextDueDate) nextDueDate = addDays(nextDueDate, interval * 7);
        } else if (repeat.frequency === "monthly") {
            nextStartDate = addMonths(nextStartDate, interval);
            if (nextDueDate) nextDueDate = addMonths(nextDueDate, interval);
        } else if (repeat.frequency === "yearly") {
            nextStartDate = addYears(nextStartDate, interval);
            if (nextDueDate) nextDueDate = addYears(nextDueDate, interval);
        }

        // Check EndDate
        if (repeat.endDate && nextStartDate > repeat.endDate.toDate()) {
            return null; // Stop recurrence
        }

        // 5. Create new Task
        // Remove fields that shouldn't be copied
        const { id, nextTaskId, createdAt, updatedAt, ...taskData } = after;

        const newTaskData = {
            ...taskData,
            status: "not_started",
            startDate: admin.firestore.Timestamp.fromDate(nextStartDate),
            dueDate: nextDueDate ? admin.firestore.Timestamp.fromDate(nextDueDate) : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            previousTaskId: context.params.taskId,
        };

        const collectionRef = admin.firestore().collection("tasks");
        const newDocRef = await collectionRef.add(newTaskData);

        // 6. Update old task with nextTaskId
        await change.after.ref.update({
            nextTaskId: newDocRef.id
        });

        console.log(`Generated recurring task ${newDocRef.id} from ${context.params.taskId}`);
        return null;
    });
