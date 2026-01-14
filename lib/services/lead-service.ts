import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { Lead } from "@/lib/types";

export interface ConvertLeadOptions {
    company?: string;
    email?: string;
    createContact?: boolean;
    createProjectFromDeal?: boolean;
    createInvoiceFromEstimate?: boolean;
    selectedEstimateId?: string;
}

export interface UserProfile {
    uid: string;
    orgId: string;
    email: string;
}

export async function convertLeadToCustomerService(
    db: Firestore,
    profile: UserProfile,
    leadId: string,
    options: ConvertLeadOptions = {}
): Promise<string> {
    if (!profile.orgId) throw new Error("No organization");

    const {
        company,
        email,
        createContact = true,
        createProjectFromDeal = false,
        createInvoiceFromEstimate = false,
        selectedEstimateId,
    } = options;

    // Get lead data
    const leadDocRef = doc(db, "leads", leadId);
    const leadSnap = await getDoc(leadDocRef);

    if (!leadSnap.exists()) throw new Error("Lead not found");
    const leadDoc = { id: leadSnap.id, ...leadSnap.data() } as Lead;

    if (leadDoc.convertedToCustomerId) {
        throw new Error("Lead already converted to customer: " + leadDoc.convertedToCustomerId);
    }

    const finalCompany = company || leadDoc.company || leadDoc.name;
    const finalEmail = email || leadDoc.email || "";

    console.log("🔄 Starting lead conversion for ID:", leadId);

    // Idempotency Check
    const existingCustomerQuery = query(
        collection(db, "customers"),
        where("fromLeadId", "==", leadId),
        where("orgId", "==", profile.orgId)
    );
    const existingCustomerSnap = await getDocs(existingCustomerQuery);

    let customerRef: { id: string };
    if (existingCustomerSnap.docs.length > 0) {
        customerRef = { id: existingCustomerSnap.docs[0].id };
        console.log("✅ Existing customer found (idempotency):", customerRef.id);
    } else {
        // 1. Create Customer
        console.log("🔄 Step 1: Creating customer...");
        const slugify = (text: string) =>
            text
                .toString()
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "-")
                .replace(/[^\w-]+/g, "")
                .replace(/--+/g, "-");
        const newCustomerRef = await addDoc(collection(db, "customers"), {
            company: finalCompany,
            phone: leadDoc.phone || "",
            website: leadDoc.website || "",
            address: leadDoc.address || {},
            defaultLanguage: leadDoc.defaultLanguage || "en",
            notes: leadDoc.description || "",
            groups: leadDoc.tags || [],
            status: "active",
            fromLeadId: leadId,
            slug: slugify(finalCompany),
            orgId: profile.orgId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: profile.uid,
        });
        customerRef = newCustomerRef;
        console.log("✅ Customer created:", customerRef.id);
    }

    // 2. Create Contact
    if (createContact) {
        // Check if contact already exists for this customer (basic idempotency)
        const contactQ = query(
            collection(db, "contacts"),
            where("customerId", "==", customerRef.id),
            where("email", "==", finalEmail),
            where("orgId", "==", profile.orgId)
        );
        const contactSnap = await getDocs(contactQ);

        if (contactSnap.empty) {
            console.log("🔄 Step 2: Creating contact...");
            const leadName = leadDoc.name || "Contact";
            const nameParts = leadName.trim().split(" ");
            const contactData = {
                customerId: customerRef.id,
                firstName: nameParts[0] || leadName,
                lastName: nameParts.slice(1).join(" ") || "",
                email: finalEmail,
                phone: leadDoc.phone || "",
                position: leadDoc.position || "",
                isPrimary: true,
                status: "active",
                permissions: [],
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            };
            await addDoc(collection(db, "contacts"), contactData);
            console.log("✅ Contact created.");
        }
    }

    // 3. Create Project from Deal
    let newProjectId: string | undefined;
    if (createProjectFromDeal && leadDoc.deal) {
        // Check if project exists from this lead/deal? Hard to check specifically without a link back.
        // For now, assume if convertedToCustomerId was null, we haven't done this.
        console.log("🔄 Step 3: Creating project from deal...");
        const projectData = {
            name: leadDoc.deal.subject || `Project for ${finalCompany}`,
            customerId: customerRef.id,
            description: leadDoc.deal.description || "",
            status: "to_do",
            projectRate: leadDoc.deal.value || 0,
            startDate: serverTimestamp(),
            deadline: leadDoc.deal.expectedCloseDate || null,
            billingType: "fixed",
            orgId: profile.orgId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: profile.uid,
        };
        const projectRef = await addDoc(collection(db, "projects"), projectData);
        newProjectId = projectRef.id;
        console.log("✅ Project created:", newProjectId);
    }

    // 4. Create Invoice from Estimate
    if (createInvoiceFromEstimate && selectedEstimateId) {
        console.log("🔄 Step 4: Creating invoice from estimate:", selectedEstimateId);
        const estimateSnap = await getDoc(doc(db, "estimates", selectedEstimateId));
        if (estimateSnap.exists()) {
            const estData = estimateSnap.data();
            // Idempotency: skip if already converted
            if (estData.convertedToInvoiceId) {
                console.log("Skip: Estimate already converted");
            } else {
                const invoiceData = {
                    customerId: customerRef.id,
                    customerName: finalCompany,
                    projectId: newProjectId || null,
                    date: serverTimestamp(),
                    dueDate: serverTimestamp(),
                    status: "draft",
                    currency: estData.currency,
                    subtotal: estData.subtotal,
                    discount: estData.discount,
                    taxTotal: estData.taxTotal,
                    total: estData.total,
                    items: estData.items,
                    amountPaid: 0,
                    amountDue: estData.total,
                    notes: estData.notes || "",
                    terms: estData.terms || "",
                    orgId: profile.orgId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: profile.uid,
                    fromEstimateId: selectedEstimateId,
                    fromEstimateNumber: estData.number,
                    number: `INV-${Date.now().toString().slice(-6)}`,
                };
                const invRef = await addDoc(collection(db, "invoices"), invoiceData);

                await updateDoc(doc(db, "estimates", selectedEstimateId), {
                    status: "accepted",
                    convertedToInvoiceId: invRef.id,
                    updatedAt: serverTimestamp(),
                });
                console.log("✅ Invoice created and estimate updated.");
            }
        }
    }

    // 5. Transfer related items
    console.log("🔄 Step 5: Transferring related items...");
    const transferRelated = async (coll: string, field: string) => {
        const q = query(collection(db, coll), where(field, "==", leadId), where("orgId", "==", profile.orgId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        let hasUpdates = false;
        snap.docs.forEach((d) => {
            // Check if already transferred to avoid double moves (though updates are safe)
            const data = d.data();
            if (data.customerId === customerRef.id) return;

            const update: Record<string, unknown> = {
                customerId: customerRef.id,
                transferredFromLeadId: leadId,
                updatedAt: serverTimestamp(),
            };
            if (coll === "tasks") update.relatedTo = { type: "customer", id: customerRef.id };
            else update.customerName = finalCompany;

            batch.update(doc(db, coll, d.id), update);
            hasUpdates = true;
        });
        if (hasUpdates) await batch.commit();
    };

    await Promise.all([
        transferRelated("proposals", "leadId"),
        transferRelated("estimates", "leadId"),
        transferRelated("tasks", "relatedTo.id"),
    ]);

    // 6. Transfer lead notes
    console.log("🔄 Step 6: Transferring notes...");
    const leadNotesRef = collection(db, "leads", leadId, "notes");
    const leadNotesSnap = await getDocs(leadNotesRef);
    for (const noteDoc of leadNotesSnap.docs) {
        const noteData = noteDoc.data();
        await addDoc(collection(db, "customers", customerRef.id, "notes"), {
            ...noteData,
            addedFrom: profile.email || "System",
            description: noteData.content || noteData.description || "",
            dateAdded: noteData.createdAt
                ? new Date(noteData.createdAt.toDate()).toLocaleString()
                : new Date().toLocaleString(),
            customerId: customerRef.id,
            orgId: profile.orgId,
            transferredFromLeadId: leadId,
            transferredFromNoteId: noteDoc.id,
            createdAt: noteData.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        await deleteDoc(doc(db, "leads", leadId, "notes", noteDoc.id));
    }

    // 7. Transfer generic reminders
    console.log("🔄 Step 7: Transferring reminders...");
    const genericRemindersQuery = query(
        collection(db, "reminders"),
        where("relatedTo.id", "==", leadId),
        where("orgId", "==", profile.orgId)
    );
    const genericRemindersSnap = await getDocs(genericRemindersQuery);
    for (const reminderDoc of genericRemindersSnap.docs) {
        await updateDoc(doc(db, "reminders", reminderDoc.id), {
            relatedTo: { type: "customer", id: customerRef.id },
            customerId: customerRef.id,
            transferredFromLeadId: leadId,
            updatedAt: serverTimestamp(),
        });
    }

    // 8. Transfer activities
    console.log("🔄 Step 8: Transferring activities...");
    const activitiesQuery = query(
        collection(db, "activities"),
        where("relatedTo.id", "==", leadId),
        where("orgId", "==", profile.orgId)
    );
    const activitiesSnap = await getDocs(activitiesQuery);
    for (const activityDoc of activitiesSnap.docs) {
        await updateDoc(doc(db, "activities", activityDoc.id), {
            relatedTo: { type: "customer", id: customerRef.id },
            customerId: customerRef.id,
            transferredFromLeadId: leadId,
            updatedAt: serverTimestamp(),
        });
    }

    // 9. Transfer generic files
    console.log("🔄 Step 9: Transferring files...");
    const genericFilesQuery = query(
        collection(db, "files"),
        where("relatedTo.id", "==", leadId),
        where("orgId", "==", profile.orgId)
    );
    const genericFilesSnap = await getDocs(genericFilesQuery);
    for (const fileDoc of genericFilesSnap.docs) {
        const fileData = fileDoc.data();
        await addDoc(collection(db, "customer_files"), {
            ...fileData,
            customerId: customerRef.id,
            relatedTo: { type: "customer", id: customerRef.id },
            transferredFromLeadId: leadId,
            createdAt: fileData.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        await deleteDoc(fileDoc.ref);
    }

    // 10. Delete Lead
    console.log("🔄 Step 10: Deleting lead...");
    await deleteDoc(doc(db, "leads", leadId));
    console.log("✅ Lead deleted successfully.");

    return customerRef.id;
}
