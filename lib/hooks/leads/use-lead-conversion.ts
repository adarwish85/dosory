"use client";

import { useCallback, useState } from "react";
import {
    collection,
    doc,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    getDocs,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lead } from "@/lib/types";
import type { UserProfile } from "@/components/hooks/use-user-profile";
import type { ConvertLeadOptions } from "./types";

export function useLeadConversion(profile: UserProfile | null) {
    const [isConverting, setIsConverting] = useState(false);
    const [conversionStep, setConversionStep] = useState<string | null>(null);

    const convertToCustomer = useCallback(
        async (leadId: string, options: ConvertLeadOptions = {}): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            setIsConverting(true);
            setConversionStep("Initializing...");

            try {
                const {
                    company,
                    email,
                    createContact = true,
                    createProjectFromDeal = false,
                    createInvoiceFromEstimate = false,
                    selectedEstimateId,
                } = options;

                // Get lead data
                setConversionStep("Fetching lead data...");
                const leadDocRef = doc(db, "leads", leadId);
                const leadSnap = await getDoc(leadDocRef);

                if (!leadSnap.exists()) throw new Error("Lead not found");
                const leadDoc = { id: leadSnap.id, ...leadSnap.data() } as Lead;

                if (leadDoc.convertedToCustomerId) {
                    throw new Error("Lead already converted to customer: " + leadDoc.convertedToCustomerId);
                }

                const finalCompany = company || leadDoc.company || leadDoc.name;
                const finalEmail = email || leadDoc.email || "";

                // Idempotency Check
                setConversionStep("Checking for existing records...");
                const existingCustomerQuery = query(
                    collection(db, "customers"),
                    where("fromLeadId", "==", leadId),
                    where("orgId", "==", profile.orgId)
                );
                const existingCustomerSnap = await getDocs(existingCustomerQuery);

                let customerRef: { id: string };
                if (existingCustomerSnap.docs.length > 0) {
                    customerRef = { id: existingCustomerSnap.docs[0].id };
                } else {
                    // 1. Create Customer
                    setConversionStep("Creating customer profile...");
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
                }

                // 2. Create Contact
                if (createContact) {
                    setConversionStep("Creating primary contact...");
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
                }

                // 3. Create Project
                if (createProjectFromDeal && leadDoc.deal) {
                    setConversionStep("Creating project from deal...");
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
                    await addDoc(collection(db, "projects"), projectData);
                }

                // 4. Create Invoice
                if (createInvoiceFromEstimate && selectedEstimateId) {
                    setConversionStep("Creating invoice from estimate...");
                    const estimateSnap = await getDoc(doc(db, "estimates", selectedEstimateId));
                    if (estimateSnap.exists()) {
                        const estData = estimateSnap.data();
                        const invoiceData = {
                            customerId: customerRef.id,
                            customerName: finalCompany,
                            projectId: null, // Could link if project created above, but simpler for now
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
                    }
                }

                // 5. Transfer related items
                setConversionStep("Transferring related items...");
                const transferRelated = async (coll: string, field: string) => {
                    const q = query(
                        collection(db, coll),
                        where(field, "==", leadId),
                        where("orgId", "==", profile.orgId)
                    );
                    const snap = await getDocs(q);
                    const batch = writeBatch(db);
                    snap.docs.forEach((d) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const update: any = {
                            customerId: customerRef.id,
                            transferredFromLeadId: leadId,
                            updatedAt: serverTimestamp(),
                        };
                        if (coll === "tasks") update.relatedTo = { type: "customer", id: customerRef.id };
                        else if (coll === "proposals" || coll === "estimates")
                            update.leadId = null; // Clear leadId? No keep history, just add customerId.
                        else update.customerName = finalCompany;

                        batch.update(doc(db, coll, d.id), update);
                    });
                    if (snap.docs.length > 0) await batch.commit();
                };

                await Promise.all([
                    transferRelated("proposals", "leadId"),
                    transferRelated("estimates", "leadId"),
                    transferRelated("tasks", "relatedTo.id"),
                ]);

                // 6. Transfer lead notes
                setConversionStep("Transferring notes...");
                const leadNotesRef = collection(db, "leads", leadId, "notes");
                const leadNotesSnap = await getDocs(leadNotesRef);
                for (const noteDoc of leadNotesSnap.docs) {
                    const noteData = noteDoc.data();
                    await addDoc(collection(db, "customers", customerRef.id, "notes"), {
                        ...noteData,
                        addedFrom: profile?.email || "System",
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
                setConversionStep("Transferring reminders...");
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
                setConversionStep("Transferring activities...");
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
                setConversionStep("Transferring files...");
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
                setConversionStep("Finalizing conversion...");
                await deleteDoc(doc(db, "leads", leadId));

                setConversionStep("Done!");
                setIsConverting(false);
                return customerRef.id;
            } catch (error) {
                console.error("Conversion failed:", error);
                setIsConverting(false);
                setConversionStep(null);
                throw error;
            }
        },
        [profile?.orgId, profile?.uid, profile?.email]
    );

    return { convertToCustomer, isConverting, conversionStep };
}
