"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface OrganizationSettings {
    // General
    companyName: string;
    logoLight?: string;
    logoDark?: string;
    favicon?: string;
    subdomain?: string; // Custom subdomain e.g. "acme"
    mainDomain?: string;
    rtlAdmin: boolean;
    rtlCustomer: boolean;
    allowedFileTypes: string;

    // Company Information
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    phone?: string;
    vatNumber?: string;

    // Localization
    dateFormat: string;
    timeFormat: "12" | "24";
    timezone: string;
    defaultLanguage: string;

    // Metadata
    updatedAt?: Date;
    createdAt?: Date;

    // Invoice Settings
    invoiceNumberPrefix?: string;
    invoiceNextNumber?: string;
    invoiceDueAfterDays?: number;
    invoiceAllowStaffViewAssigned?: boolean;
    invoiceRequireClientLogin?: boolean;
    invoiceDeleteOnlyLast?: boolean;
    invoiceDecrementOnDelete?: boolean;
    invoiceExcludeDraftsFromClient?: boolean;
    invoiceShowSaleAgent?: boolean;
    invoiceShowProjectName?: boolean;
    invoiceShowTotalPaid?: boolean;
    invoiceShowCreditsApplied?: boolean;
    invoiceShowAmountDue?: boolean;
    invoiceAttachPdfToEmail?: boolean;
    invoiceNumberFormat?: "number_based" | "year_based" | "mixed";
    invoiceDefaultClientNote?: string;
    invoiceDefaultTerms?: string;

    // Finance General
    decimalSeparator?: "." | ",";
    thousandSeparator?: "," | "." | "none" | "space" | "'";
    numberPadding?: number;
    autoAssignSaleAgent?: boolean;
    showTaxPerItem?: boolean;
    removeTaxNameFromRow?: boolean;
    excludeCurrencySymbol?: boolean;
    defaultTax?: string;
    removeDecimalsOnZero?: boolean;
    amountToWordsEnable?: boolean;
    amountToWordsLowercase?: boolean;

    // Finance Proposals
    proposalNumberPrefix?: string;
    proposalDueAfterDays?: number;
    proposalPipelineLimit?: number;
    proposalPipelineSort?: "pipeline_order" | "date";
    proposalPipelineSortOrder?: "asc" | "desc";
    proposalShowProjectName?: boolean;
    proposalExcludeDrafts?: boolean;
    proposalAutoConvert?: boolean;
    proposalAllowStaffViewAssigned?: boolean;
    proposalInfoFormat?: string;

    // Finance Estimates
    estimateNumberPrefix?: string;
    estimateNextNumber?: string;
    estimateDueAfterDays?: number;
    estimateDeleteOnlyLast?: boolean;
    estimateDecrementOnDelete?: boolean;
    estimateAllowStaffViewAssigned?: boolean;
    estimateRequireClientLogin?: boolean;
    estimateShowSaleAgent?: boolean;
    estimateShowProjectName?: boolean;
    estimateAutoConvert?: boolean;
    estimateExcludeDraftsFromClient?: boolean;
    estimateNumberFormat?: "number_based" | "year_based" | "mixed" | "date_based"; // Added date_based based on screenshot
    estimatePipelineLimit?: number;
    estimatePipelineSort?: "pipeline_order" | "date";
    estimatePipelineSortOrder?: "asc" | "desc";
    estimateDefaultClientNote?: string;
    estimateDefaultTerms?: string;

    // Finance Credit Notes
    creditNoteNumberPrefix?: string;
    creditNoteNextNumber?: string;
    creditNoteNumberFormat?: "number_based" | "year_based" | "mixed";
    creditNoteDecrementOnDelete?: boolean;
    creditNoteShowProjectName?: boolean;
    creditNoteDefaultClientNote?: string;
    creditNoteDefaultTerms?: string;

    // Finance Payment Gateways - General
    paymentNotificationEmail?: boolean;
    allowCustomerModifyAmount?: boolean;

    // Finance Payment Gateways - PayPal
    paypalActive?: boolean;
    paypalLabel?: string;
    paypalFixedFee?: string;
    paypalPercentageFee?: string;
    paypalUsername?: string;
    paypalPassword?: string;
    paypalSignature?: string;
    paypalDescription?: string;
    paypalCurrencies?: string;
    paypalTestMode?: boolean;
    paypalDefaultSelected?: boolean;

    // Feature - Customers
    customerDefaultTheme?: string;
    customerDefaultCountry?: string;
    customerVisibleTabs?: string[];
    customerRequiredRegistrationFields?: string[];
    customerCompanyFieldRequired?: boolean;
    customerCompanyVatRequired?: boolean;
    customerAllowRegistration?: boolean;
    customerRequiresRegistrationConfirmation?: boolean;
    customerAllowPrimaryContactManageContacts?: boolean;
    customerEnableHoneypot?: boolean;
    customerAllowPrimaryContactViewBilling?: boolean;
    customerContactsSeeOwnFilesOnly?: boolean;
    customerAllowContactsDeleteOwnFiles?: boolean;
    customerUseKnowledgeBase?: boolean;
    customerAllowKnowledgeBaseWithoutRegistration?: boolean;
    customerShowEstimateRequestLink?: boolean; // Can be string if select dropdown
    customerDefaultContactPermissions?: string[];
    customerInfoFormat?: string;

    // Feature - Tasks
    tasksKanbanLimit?: number;
    tasksAllowStaffViewAllProjectTasks?: boolean;
    tasksAllowEditCommentsFirstHourOnly?: boolean;
    tasksAutoAssignCreator?: boolean;
    tasksAutoAddCreatorAsFollower?: boolean;
    tasksStopOtherTimers?: boolean;
    tasksAutoStartTimer?: boolean; // Change status to In Progress...
    tasksBillableDefault?: boolean;
    tasksTimerRoundOff?: string;
    tasksTimerRoundOffMultiples?: string;
    tasksDefaultStatus?: string;
    tasksDefaultPriority?: string;
    tasksModalWidth?: string;

    // Feature - Support (General)
    supportUseServices?: boolean;
    supportDisablePublicUrl?: boolean;
    supportStaffLimitToAssignedDepartments?: boolean;
    supportStaffNotificationAssignedOnly?: boolean;
    supportNotifyOnNewTicket?: boolean;
    supportNotifyOnCustomerReply?: boolean;
    supportStaffOpenTicketsAllContacts?: boolean;
    supportAutoAssignFirstReplyStaff?: boolean;
    supportAllowNonStaffAccess?: boolean;
    supportAllowNonAdminDeleteAttachments?: boolean;
    supportAllowNonAdminDeleteTickets?: boolean;
    supportAllowCustomerChangeStatus?: boolean;
    supportCustomerShowContactTicketsOnly?: boolean;
    supportTicketReplyOrder?: string;
    supportEnableBadge?: boolean;
    supportDefaultReplyStatus?: string;
    supportMaxAttachments?: number;
    supportAllowedExtensions?: string;

    // Feature - Leads
    leadsKanbanLimit?: number;
    leadsDefaultStatus?: string;
    leadsDefaultSource?: string;
    leadsDuplicateValidationFields?: string;
    leadsAutoAssignAdminAfterConvert?: boolean;
    leadsAllowNonAdminImport?: boolean;
    leadsKanbanSort?: string;
    leadsKanbanSortOrder?: string;
    leadsDisableEditAfterConvert?: boolean;
    leadsModalWidth?: string;

    // AI Integration - OpenAI
    openaiApiKey?: string;
    openaiModel?: string;
    openaiMaxTokens?: number;



    // Calendar Settings
    calendarEventsLimit?: number;
    calendarDefaultView?: string;
    calendarFirstDay?: string;
    calendarShowHideNotifiedReminders?: boolean;
    calendarShowTicketReminders?: boolean;
    calendarShowLeadReminders?: boolean;
    calendarShowInvoices?: boolean;
    calendarShowCustomerReminders?: boolean;
    calendarShowEstimates?: boolean;
    calendarShowEstimateReminders?: boolean;
    calendarShowProposals?: boolean;
    calendarShowProposalReminders?: boolean;
    calendarShowContracts?: boolean;
    calendarShowInvoiceReminders?: boolean;
    calendarShowTasks?: boolean;
    calendarShowTasksStaffOnly?: boolean;
    calendarShowExpenseReminders?: boolean;
    calendarShowProjects?: boolean;
    calendarShowTaskReminders?: boolean;
    calendarShowCreditNoteReminders?: boolean;
    calendarInvoiceColor?: string;
    calendarEstimateColor?: string;
    calendarProposalColor?: string;
    calendarReminderColor?: string;
    calendarContractColor?: string;
    calendarProjectColor?: string;


    // PDF Settings
    pdfFont?: string;
    pdfSwapDetails?: boolean;
    pdfFontSize?: number;
    pdfTableHeadingColor?: string;
    pdfTableHeadingTextColor?: string;
    pdfLogoUrl?: string;
    pdfLogoWidth?: number;
    pdfShowStatus?: boolean;
    pdfShowLink?: boolean;
    pdfShowPayments?: boolean;
    pdfShowPageNumber?: boolean;
    pdfShowSignatureInvoice?: boolean;
    pdfShowSignatureEstimate?: boolean;
    pdfShowSignatureCreditNote?: boolean;
    pdfShowSignatureContract?: boolean;
    pdfShowSignatureProposal?: boolean;
    pdfSignatureImage?: string;
    pdfFormatInvoice?: string;
    pdfFormatEstimate?: string;
    pdfFormatProposal?: string;
    pdfFormatPayment?: string;
    pdfFormatCreditNote?: string;
    pdfFormatContract?: string;
    pdfFormatStatement?: string;


    // E-Sign Settings
    esignProposalRequireSignature?: boolean;
    esignEstimateRequireSignature?: boolean;
    esignLegalBoundText?: string;

    // Misc Settings
    miscRequireLoginForContract?: boolean;
    miscDropboxAppKey?: string;
    miscMaxFileSizeMedia?: number;
    miscMaxFileUploadsPost?: number;
    miscLimitTopSearchBarResults?: number;
    miscDefaultStaffRole?: string;
    miscDeleteActivityLogOlderThan?: number;
    miscShowSetupMenuHover?: boolean;
    miscShowHelpMenu?: boolean;
    miscUseMinified?: boolean;
    miscSaveLastTableOrder?: boolean;
    miscShowTableExportButton?: string;
    miscTablesPaginationLimit?: number;
    miscAllowNonAdminCreateLeadStatus?: boolean;
    miscAllowNonAdminCreateLeadSource?: boolean;
    miscAllowNonAdminCreateCustomerGroup?: boolean;
    miscAllowNonAdminCreateService?: boolean;
    miscAllowNonAdminSavePredefinedReplies?: boolean;
    miscAllowNonAdminCreateContractType?: boolean;
    miscAllowNonAdminCreateExpenseCategory?: boolean;

    // Platform
    platformName?: string;
    maintenanceMode?: boolean;
}

const DEFAULT_SETTINGS: OrganizationSettings = {
    companyName: "",
    platformName: "WasilaDev",
    maintenanceMode: false,
    rtlAdmin: false,
    rtlCustomer: false,
    allowedFileTypes: ".png,.jpg,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt",
    dateFormat: "d/m/Y",
    timeFormat: "12",
    timezone: "Africa/Cairo",
    defaultLanguage: "en",
    subdomain: "", // Default empty

    // Invoice Defaults
    invoiceNumberPrefix: "INV-",
    invoiceNextNumber: "000001",
    invoiceDueAfterDays: 30,
    invoiceAllowStaffViewAssigned: false,
    invoiceRequireClientLogin: false,
    invoiceDeleteOnlyLast: false,
    invoiceDecrementOnDelete: false,
    invoiceExcludeDraftsFromClient: false,
    invoiceShowSaleAgent: false,
    invoiceShowProjectName: false,
    invoiceShowTotalPaid: false,
    invoiceShowCreditsApplied: false,
    invoiceShowAmountDue: false,
    invoiceAttachPdfToEmail: false,
    invoiceNumberFormat: "number_based",
    invoiceDefaultClientNote: "",
    invoiceDefaultTerms: "",

    // Finance General Defaults
    decimalSeparator: ".",
    thousandSeparator: ",",
    numberPadding: 6,
    autoAssignSaleAgent: true,
    showTaxPerItem: true,
    removeTaxNameFromRow: false,
    excludeCurrencySymbol: false,
    defaultTax: "14.00%",
    removeDecimalsOnZero: false,
    amountToWordsEnable: true,
    amountToWordsLowercase: false,

    // Finance Proposals Defaults
    proposalNumberPrefix: "PRO-",
    proposalDueAfterDays: 7,
    proposalPipelineLimit: 50,
    proposalPipelineSort: "pipeline_order",
    proposalPipelineSortOrder: "asc",
    proposalShowProjectName: true,
    proposalExcludeDrafts: true,
    proposalAutoConvert: false,
    proposalAllowStaffViewAssigned: true,
    proposalInfoFormat: "{proposal_to}\n{address}\n{city} {state}\n{country_code} {zip_code}\n{phone}\n{email}",

    // Finance Estimates Defaults
    estimateNumberPrefix: "EST-",
    estimateNextNumber: "000001",
    estimateDueAfterDays: 7,
    estimateDeleteOnlyLast: false,
    estimateDecrementOnDelete: false,
    estimateAllowStaffViewAssigned: true,
    estimateRequireClientLogin: false,
    estimateShowSaleAgent: false,
    estimateShowProjectName: false,
    estimateAutoConvert: false,
    estimateExcludeDraftsFromClient: false,
    estimateNumberFormat: "number_based",
    estimatePipelineLimit: 50,
    estimatePipelineSort: "pipeline_order",
    estimatePipelineSortOrder: "asc",
    estimateDefaultClientNote: "",
    estimateDefaultTerms: "",

    // Finance Credit Notes Defaults
    creditNoteNumberPrefix: "CN-",
    creditNoteNextNumber: "000001",
    creditNoteNumberFormat: "number_based",
    creditNoteDecrementOnDelete: false,
    creditNoteShowProjectName: false,
    creditNoteDefaultClientNote: "",
    creditNoteDefaultTerms: "",

    // Finance Payment Gateways Defaults
    paymentNotificationEmail: true,
    allowCustomerModifyAmount: false,
    paypalActive: false,
    paypalLabel: "Paypal",
    paypalFixedFee: "0",
    paypalPercentageFee: "0",
    paypalUsername: "",
    paypalPassword: "",
    paypalSignature: "",
    paypalDescription: "Payment for Invoice {invoice_number}",
    paypalCurrencies: "USD",
    paypalTestMode: false,
    paypalDefaultSelected: false,

    // Feature - Customers Defaults
    customerDefaultTheme: "perfex",
    customerDefaultCountry: "",
    customerVisibleTabs: ["all"],
    customerRequiredRegistrationFields: [],
    customerCompanyFieldRequired: true,
    customerCompanyVatRequired: false,
    customerAllowRegistration: true,
    customerRequiresRegistrationConfirmation: true,
    customerAllowPrimaryContactManageContacts: false,
    customerEnableHoneypot: false,
    customerAllowPrimaryContactViewBilling: false,
    customerContactsSeeOwnFilesOnly: false,
    customerAllowContactsDeleteOwnFiles: true,
    customerUseKnowledgeBase: true,
    customerAllowKnowledgeBaseWithoutRegistration: true,
    customerShowEstimateRequestLink: true,
    customerDefaultContactPermissions: ["invoices", "estimates", "contracts", "proposals", "support", "projects"],
    customerInfoFormat: "{company_name}\n{street}\n{city} {state}\n{country_code} {zip_code}\n{vat_number_with_label}",

    // Feature - Tasks Defaults
    tasksKanbanLimit: 50,
    tasksAllowStaffViewAllProjectTasks: false,
    tasksAllowEditCommentsFirstHourOnly: false,
    tasksAutoAssignCreator: true,
    tasksAutoAddCreatorAsFollower: true,
    tasksStopOtherTimers: true,
    tasksAutoStartTimer: true,
    tasksBillableDefault: false,
    tasksTimerRoundOff: "no_round",
    tasksTimerRoundOffMultiples: "5",
    tasksDefaultStatus: "not_started",
    tasksDefaultPriority: "medium",
    tasksModalWidth: "modal-lg",

    // Feature - Support Defaults
    supportUseServices: true,
    supportDisablePublicUrl: false,
    supportStaffLimitToAssignedDepartments: false,
    supportStaffNotificationAssignedOnly: false,
    supportNotifyOnNewTicket: true,
    supportNotifyOnCustomerReply: true,
    supportStaffOpenTicketsAllContacts: false,
    supportAutoAssignFirstReplyStaff: false,
    supportAllowNonStaffAccess: false,
    supportAllowNonAdminDeleteAttachments: false,
    supportAllowNonAdminDeleteTickets: false,
    supportAllowCustomerChangeStatus: false,
    supportCustomerShowContactTicketsOnly: false,
    supportTicketReplyOrder: "asc",
    supportEnableBadge: true,
    supportDefaultReplyStatus: "in_progress",
    supportMaxAttachments: 4,
    supportAllowedExtensions: ".jpg,.png,.pdf,.doc,.zip,.rar",

    // Feature - Leads Defaults
    leadsKanbanLimit: 50,
    leadsDefaultStatus: "mql",
    leadsDefaultSource: "facebook",
    leadsDuplicateValidationFields: "email",
    leadsAutoAssignAdminAfterConvert: true,
    leadsAllowNonAdminImport: false,
    leadsKanbanSort: "kanban_order",
    leadsKanbanSortOrder: "asc",
    leadsDisableEditAfterConvert: true,
    leadsModalWidth: "modal-lg",

    openaiApiKey: "",
    openaiModel: "gpt-4o",
    openaiMaxTokens: 500,

    // Calendar Defaults
    calendarEventsLimit: 4,
    calendarDefaultView: "dayGridMonth",
    calendarFirstDay: "0",
    calendarShowHideNotifiedReminders: false,
    calendarShowTicketReminders: true,
    calendarShowLeadReminders: true,
    calendarShowInvoices: true,
    calendarShowCustomerReminders: true,
    calendarShowEstimates: true,
    calendarShowEstimateReminders: true,
    calendarShowProposals: true,
    calendarShowProposalReminders: true,
    calendarShowContracts: true,
    calendarShowInvoiceReminders: true,
    calendarShowTasks: true,
    calendarShowTasksStaffOnly: true,
    calendarShowExpenseReminders: true,
    calendarShowProjects: true,
    calendarShowTaskReminders: true,
    calendarShowCreditNoteReminders: true,
    calendarInvoiceColor: "#ff6f00",
    calendarEstimateColor: "#ff6f00",
    calendarProposalColor: "#84c529",
    calendarReminderColor: "#03a9f4",
    calendarContractColor: "#b72974",
    calendarProjectColor: "#b72974",


    // PDF Defaults
    pdfFont: "freesans",
    pdfSwapDetails: false,
    pdfFontSize: 10,
    pdfTableHeadingColor: "#323a45",
    pdfTableHeadingTextColor: "#ffffff",
    pdfLogoUrl: "",
    pdfLogoWidth: 150,
    pdfShowStatus: true,
    pdfShowLink: true,
    pdfShowPayments: true,
    pdfShowPageNumber: false,
    pdfShowSignatureInvoice: false,
    pdfShowSignatureEstimate: false,
    pdfShowSignatureCreditNote: false,
    pdfShowSignatureContract: false,
    pdfShowSignatureProposal: false,
    pdfSignatureImage: "",
    pdfFormatInvoice: "A4 Portrait",
    pdfFormatEstimate: "A4 Portrait",
    pdfFormatProposal: "A4 Portrait",
    pdfFormatPayment: "A4 Portrait",
    pdfFormatCreditNote: "A4 Portrait",
    pdfFormatContract: "A4 Portrait",
    pdfFormatStatement: "A4 Portrait",

    // E-Sign Defaults
    esignProposalRequireSignature: true,
    esignEstimateRequireSignature: true,
    esignLegalBoundText: "By clicking on \"Sign\", I consent to be legally bound by this electronic representation of my signature.",

    // Misc Defaults
    miscRequireLoginForContract: false,
    miscDropboxAppKey: "",
    miscMaxFileSizeMedia: 50,
    miscMaxFileUploadsPost: 10,
    miscLimitTopSearchBarResults: 10,
    miscDefaultStaffRole: "employee",
    miscDeleteActivityLogOlderThan: 1,
    miscShowSetupMenuHover: false,
    miscShowHelpMenu: true,
    miscUseMinified: true,
    miscSaveLastTableOrder: false,
    miscShowTableExportButton: "admin",
    miscTablesPaginationLimit: 25,
    miscAllowNonAdminCreateLeadStatus: false,
    miscAllowNonAdminCreateLeadSource: false,
    miscAllowNonAdminCreateCustomerGroup: false,
    miscAllowNonAdminCreateService: false,
    miscAllowNonAdminSavePredefinedReplies: false,
    miscAllowNonAdminCreateContractType: false,
    miscAllowNonAdminCreateExpenseCategory: false,
};

export function useOrganizationSettings() {
    const { profile, loading: profileLoading } = useUserProfile();
    const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Real-time settings listener
    useEffect(() => {
        // Wait for profile to load
        if (profileLoading) return;

        // If no orgId (e.g. logged out or no profile), stop loading
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        // Import onSnapshot for real-time listening
        const setupListeners = async () => {
            const { onSnapshot } = await import("firebase/firestore");

            // Listen to settings subcollection
            const settingsRef = doc(db, "organizations", profile.orgId, "settings", "general");
            const orgRef = doc(db, "organizations", profile.orgId);

            // First get subdomain from org doc (one-time, subdomain rarely changes)
            let subdomain = "";
            try {
                const orgSnap = await getDoc(orgRef);
                if (orgSnap.exists()) {
                    subdomain = orgSnap.data().subdomain || "";
                }
            } catch (error) {
                console.error("Error loading org doc:", error);
            }

            // Set up real-time listener for settings
            const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setSettings({
                        ...DEFAULT_SETTINGS,
                        ...data,
                        subdomain, // Include subdomain from org doc
                        updatedAt: data.updatedAt?.toDate?.(),
                        createdAt: data.createdAt?.toDate?.(),
                    });
                } else {
                    // No settings doc yet, use defaults with subdomain
                    setSettings({ ...DEFAULT_SETTINGS, subdomain });
                }
                setLoading(false);
            }, (error) => {
                console.error("Error in settings listener:", error);
                setLoading(false);
            });

            return unsubscribe;
        };

        let unsubscribe: (() => void) | undefined;
        setupListeners().then(unsub => {
            unsubscribe = unsub;
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [profile?.orgId, profileLoading]);

    // Save settings
    const saveSettings = useCallback(async (updates: Partial<OrganizationSettings>) => {
        if (!profile?.orgId) throw new Error("No organization");

        setSaving(true);
        try {
            // Handle Subdomain logic separately if it's being updated
            if (updates.subdomain !== undefined) {
                const newSubdomain = updates.subdomain.toLowerCase().trim();

                // If subdomain is effectively changing
                if (newSubdomain !== settings.subdomain) {
                    // Check uniqueness
                    const { collection, query, where, getDocs } = await import("firebase/firestore");
                    const orgsRef = collection(db, "organizations");
                    const q = query(orgsRef, where("subdomain", "==", newSubdomain));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        // Check if the found doc is NOT this org (collision)
                        const existingDoc = querySnapshot.docs[0];
                        if (existingDoc.id !== profile.orgId) {
                            throw new Error("Subdomain is already taken.");
                        }
                    }

                    // Update root organization document
                    // Update root organization document (upsert to handle missing doc)
                    const orgRef = doc(db, "organizations", profile.orgId);
                    await setDoc(orgRef, { subdomain: newSubdomain }, { merge: true });
                }
            }

            // Update Settings Subcollection
            // Exclude subdomain from this update as it lives on the root doc
            const { subdomain, ...settingsUpdates } = updates;

            if (Object.keys(settingsUpdates).length > 0) {
                const settingsRef = doc(db, "organizations", profile.orgId, "settings", "general");
                await setDoc(settingsRef, {
                    ...settingsUpdates,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            }

            setSettings(prev => ({ ...prev, ...updates }));

            // Check if company profile is complete for onboarding
            const hasCompanyInfo = updates.companyName || settings.companyName;
            if (hasCompanyInfo) {
                await triggerOnboardingStep("companyProfile");
            }

        } catch (error) {
            console.error("Error saving settings:", error);
            throw error;
        } finally {
            setSaving(false);
        }
    }, [profile?.orgId, settings.companyName, settings.subdomain]);

    // Upload logo
    const uploadLogo = useCallback(async (file: File, type: "light" | "dark" | "favicon"): Promise<string> => {
        if (!profile?.orgId) throw new Error("No organization");

        const path = `organizations/${profile.orgId}/branding/${type}-${Date.now()}`;
        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // Save URL to settings
        const field = type === "light" ? "logoLight" : type === "dark" ? "logoDark" : "favicon";
        await saveSettings({ [field]: url });

        return url;
    }, [profile?.orgId, saveSettings]);

    // Trigger onboarding step completion
    const triggerOnboardingStep = useCallback(async (step: string) => {
        if (!profile?.uid) return;

        try {
            const docRef = doc(db, "users", profile.uid, "onboarding", "state");
            await updateDoc(docRef, {
                [`steps.${step}`]: true,
            });
        } catch (error) {
            // Silently fail if onboarding doc doesn't exist
            console.log("Onboarding step trigger skipped:", step);
        }
    }, [profile?.uid]);

    return {
        settings,
        loading,
        saving,
        saveSettings,
        uploadLogo,
        triggerOnboardingStep,
    };
}
