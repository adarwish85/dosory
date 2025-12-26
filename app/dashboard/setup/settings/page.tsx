"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings as SettingsIcon, FileText, Globe, Mail, Wrench, HelpCircle, DollarSign, FileIcon, FileCheck, CreditCard, RefreshCw, CreditCard as PaymentIcon, Users, CheckCircle, Headphones, Target, Zap, Calendar, PenTool, MoreHorizontal } from "lucide-react";
import { Trash2 } from "lucide-react";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { useEffect } from "react";
import { toast } from "sonner";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, X, Loader2 } from "lucide-react";

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState("general");
    const [activeEmailTab, setActiveEmailTab] = useState("smtp");
    const [activeGatewayTab, setActiveGatewayTab] = useState("general");

    // Use the hook
    const { settings, saveSettings, saving, loading, uploadLogo } = useOrganizationSettings();
    const [uploading, setUploading] = useState<"light" | "dark" | "favicon" | null>(null);

    const handleUpload = async (file: File, type: "light" | "dark" | "favicon") => {
        try {
            setUploading(type);
            await uploadLogo(file, type);
            toast.success(`${type === "favicon" ? "Favicon" : "Logo"} uploaded successfully`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(null);
        }
    };
    const [localSubdomain, setLocalSubdomain] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [mainDomain, setMainDomain] = useState("");
    const [rtlAdmin, setRtlAdmin] = useState("no");
    const [rtlCustomer, setRtlCustomer] = useState("no");
    const [allowedFileTypes, setAllowedFileTypes] = useState("");
    const [availability, setAvailability] = useState<"idle" | "loading" | "available" | "unavailable">("idle");
    const [checkError, setCheckError] = useState("");

    // Invoice Settings State
    const [invoiceForm, setInvoiceForm] = useState({
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
    });

    useEffect(() => {
        if (!loading) {
            setInvoiceForm(prev => ({
                ...prev,
                invoiceNumberPrefix: settings.invoiceNumberPrefix ?? "INV-",
                invoiceNextNumber: settings.invoiceNextNumber ?? "000001",
                invoiceDueAfterDays: settings.invoiceDueAfterDays ?? 30,
                invoiceAllowStaffViewAssigned: settings.invoiceAllowStaffViewAssigned ?? false,
                invoiceRequireClientLogin: settings.invoiceRequireClientLogin ?? false,
                invoiceDeleteOnlyLast: settings.invoiceDeleteOnlyLast ?? false,
                invoiceDecrementOnDelete: settings.invoiceDecrementOnDelete ?? false,
                invoiceExcludeDraftsFromClient: settings.invoiceExcludeDraftsFromClient ?? false,
                invoiceShowSaleAgent: settings.invoiceShowSaleAgent ?? false,
                invoiceShowProjectName: settings.invoiceShowProjectName ?? false,
                invoiceShowTotalPaid: settings.invoiceShowTotalPaid ?? false,
                invoiceShowCreditsApplied: settings.invoiceShowCreditsApplied ?? false,
                invoiceShowAmountDue: settings.invoiceShowAmountDue ?? false,
                invoiceAttachPdfToEmail: settings.invoiceAttachPdfToEmail ?? false,
                invoiceNumberFormat: settings.invoiceNumberFormat ?? "number_based",
                invoiceDefaultClientNote: settings.invoiceDefaultClientNote ?? "",
                invoiceDefaultTerms: settings.invoiceDefaultTerms ?? "",
            }));
        }
    }, [loading, settings]);

    const handleSaveInvoiceSettings = async () => {
        await saveSettings(invoiceForm as any);
        toast.success("Invoice settings saved successfully");
    };

    // Finance General State
    const [financeGeneralForm, setFinanceGeneralForm] = useState({
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
    });

    useEffect(() => {
        if (!loading) {
            setFinanceGeneralForm(prev => ({
                ...prev,
                decimalSeparator: settings.decimalSeparator ?? ".",
                thousandSeparator: settings.thousandSeparator ?? ",",
                numberPadding: settings.numberPadding ?? 6,
                autoAssignSaleAgent: settings.autoAssignSaleAgent ?? true,
                showTaxPerItem: settings.showTaxPerItem ?? true,
                removeTaxNameFromRow: settings.removeTaxNameFromRow ?? false,
                excludeCurrencySymbol: settings.excludeCurrencySymbol ?? false,
                defaultTax: settings.defaultTax ?? "14.00%",
                removeDecimalsOnZero: settings.removeDecimalsOnZero ?? false,
                amountToWordsEnable: settings.amountToWordsEnable ?? true,
                amountToWordsLowercase: settings.amountToWordsLowercase ?? false,
            }));
        }
    }, [loading, settings]);

    const handleSaveFinanceGeneral = async () => {
        await saveSettings(financeGeneralForm as any);
        toast.success("Finance settings saved successfully");
    };

    // Finance Proposal State
    const [proposalForm, setProposalForm] = useState({
        proposalNumberPrefix: "PRO-",
        proposalDueAfterDays: 7,
        proposalPipelineLimit: 50,
        proposalPipelineSort: "pipeline_order",
        proposalPipelineSortOrder: "asc",
        proposalShowProjectName: true,
        proposalExcludeDrafts: true,
        proposalAutoConvert: false,
        proposalAllowStaffViewAssigned: true,
        proposalInfoFormat: "",
    });

    useEffect(() => {
        if (!loading) {
            setProposalForm(prev => ({
                ...prev,
                proposalNumberPrefix: settings.proposalNumberPrefix ?? "PRO-",
                proposalDueAfterDays: settings.proposalDueAfterDays ?? 7,
                proposalPipelineLimit: settings.proposalPipelineLimit ?? 50,
                proposalPipelineSort: settings.proposalPipelineSort ?? "pipeline_order",
                proposalPipelineSortOrder: settings.proposalPipelineSortOrder ?? "asc",
                proposalShowProjectName: settings.proposalShowProjectName ?? true,
                proposalExcludeDrafts: settings.proposalExcludeDrafts ?? true,
                proposalAutoConvert: settings.proposalAutoConvert ?? false,
                proposalAllowStaffViewAssigned: settings.proposalAllowStaffViewAssigned ?? true,
                proposalInfoFormat: settings.proposalInfoFormat ?? "{proposal_to}\n{address}\n{city} {state}\n{country_code} {zip_code}\n{phone}\n{email}",
            }));
        }
    }, [loading, settings]);

    const handleSaveProposalSettings = async () => {
        await saveSettings(proposalForm as any);
        toast.success("Proposal settings saved successfully");
    };

    // Finance Estimate State
    const [estimateForm, setEstimateForm] = useState({
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
    });

    useEffect(() => {
        if (!loading) {
            setEstimateForm(prev => ({
                ...prev,
                estimateNumberPrefix: settings.estimateNumberPrefix ?? "EST-",
                estimateNextNumber: settings.estimateNextNumber ?? "000001",
                estimateDueAfterDays: settings.estimateDueAfterDays ?? 7,
                estimateDeleteOnlyLast: settings.estimateDeleteOnlyLast ?? false,
                estimateDecrementOnDelete: settings.estimateDecrementOnDelete ?? false,
                estimateAllowStaffViewAssigned: settings.estimateAllowStaffViewAssigned ?? true,
                estimateRequireClientLogin: settings.estimateRequireClientLogin ?? false,
                estimateShowSaleAgent: settings.estimateShowSaleAgent ?? false,
                estimateShowProjectName: settings.estimateShowProjectName ?? false,
                estimateAutoConvert: settings.estimateAutoConvert ?? false,
                estimateExcludeDraftsFromClient: settings.estimateExcludeDraftsFromClient ?? false,
                estimateNumberFormat: settings.estimateNumberFormat ?? "number_based",
                estimatePipelineLimit: settings.estimatePipelineLimit ?? 50,
                estimatePipelineSort: settings.estimatePipelineSort ?? "pipeline_order",
                estimatePipelineSortOrder: settings.estimatePipelineSortOrder ?? "asc",
                estimateDefaultClientNote: settings.estimateDefaultClientNote ?? "",
                estimateDefaultTerms: settings.estimateDefaultTerms ?? "",
            }));
        }
    }, [loading, settings]);

    const handleSaveEstimateSettings = async () => {
        await saveSettings(estimateForm as any);
        toast.success("Estimate settings saved successfully");
    };

    // Finance Credit Note State
    const [creditNoteForm, setCreditNoteForm] = useState({
        creditNoteNumberPrefix: "CN-",
        creditNoteNextNumber: "000001",
        creditNoteNumberFormat: "number_based",
        creditNoteDecrementOnDelete: false,
        creditNoteShowProjectName: false,
        creditNoteDefaultClientNote: "",
        creditNoteDefaultTerms: "",
    });

    useEffect(() => {
        if (!loading) {
            setCreditNoteForm(prev => ({
                ...prev,
                creditNoteNumberPrefix: settings.creditNoteNumberPrefix ?? "CN-",
                creditNoteNextNumber: settings.creditNoteNextNumber ?? "000001",
                creditNoteNumberFormat: settings.creditNoteNumberFormat ?? "number_based",
                creditNoteDecrementOnDelete: settings.creditNoteDecrementOnDelete ?? false,
                creditNoteShowProjectName: settings.creditNoteShowProjectName ?? false,
                creditNoteDefaultClientNote: settings.creditNoteDefaultClientNote ?? "",
                creditNoteDefaultTerms: settings.creditNoteDefaultTerms ?? "",
            }));
        }
    }, [loading, settings]);

    const handleSaveCreditNoteSettings = async () => {
        await saveSettings(creditNoteForm as any);
        toast.success("Credit Note settings saved successfully");
    };

    // Finance Payment Gateway State
    const [gatewayForm, setGatewayForm] = useState({
        // General
        paymentNotificationEmail: true,
        allowCustomerModifyAmount: false,
        // PayPal
        paypalActive: false,
        paypalLabel: "Paypal",
        paypalFixedFee: "0",
        paypalPercentageFee: "0",
        paypalUsername: "",
        paypalPassword: "",
        paypalSignature: "",
        paypalDescription: "",
        paypalCurrencies: "USD",
        paypalTestMode: false,
        paypalDefaultSelected: false,
    });

    useEffect(() => {
        if (!loading) {
            setGatewayForm(prev => ({
                ...prev,
                paymentNotificationEmail: settings.paymentNotificationEmail ?? true,
                allowCustomerModifyAmount: settings.allowCustomerModifyAmount ?? false,
                paypalActive: settings.paypalActive ?? false,
                paypalLabel: settings.paypalLabel ?? "Paypal",
                paypalFixedFee: settings.paypalFixedFee ?? "0",
                paypalPercentageFee: settings.paypalPercentageFee ?? "0",
                paypalUsername: settings.paypalUsername ?? "",
                paypalPassword: settings.paypalPassword ?? "",
                paypalSignature: settings.paypalSignature ?? "",
                paypalDescription: settings.paypalDescription ?? "Payment for Invoice {invoice_number}",
                paypalCurrencies: settings.paypalCurrencies ?? "USD",
                paypalTestMode: settings.paypalTestMode ?? false,
                paypalDefaultSelected: settings.paypalDefaultSelected ?? false,
            }));
        }
    }, [loading, settings]);

    const handleSaveGatewaySettings = async () => {
        await saveSettings(gatewayForm as any);
        toast.success("Payment Gateway settings saved successfully");
    };

    // Customer Features State
    const [customerForm, setCustomerForm] = useState({
        customerDefaultTheme: "perfex",
        customerDefaultCountry: "",
        customerVisibleTabs: ["all"],
        customerRequiredRegistrationFields: [] as string[],
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
    });

    useEffect(() => {
        if (!loading) {
            setCustomerForm(prev => ({
                ...prev,
                customerDefaultTheme: settings.customerDefaultTheme ?? "perfex",
                customerDefaultCountry: settings.customerDefaultCountry ?? "",
                customerVisibleTabs: settings.customerVisibleTabs ?? ["all"],
                customerRequiredRegistrationFields: settings.customerRequiredRegistrationFields ?? [],
                customerCompanyFieldRequired: settings.customerCompanyFieldRequired ?? true,
                customerCompanyVatRequired: settings.customerCompanyVatRequired ?? false,
                customerAllowRegistration: settings.customerAllowRegistration ?? true,
                customerRequiresRegistrationConfirmation: settings.customerRequiresRegistrationConfirmation ?? true,
                customerAllowPrimaryContactManageContacts: settings.customerAllowPrimaryContactManageContacts ?? false,
                customerEnableHoneypot: settings.customerEnableHoneypot ?? false,
                customerAllowPrimaryContactViewBilling: settings.customerAllowPrimaryContactViewBilling ?? false,
                customerContactsSeeOwnFilesOnly: settings.customerContactsSeeOwnFilesOnly ?? false,
                customerAllowContactsDeleteOwnFiles: settings.customerAllowContactsDeleteOwnFiles ?? true,
                customerUseKnowledgeBase: settings.customerUseKnowledgeBase ?? true,
                customerAllowKnowledgeBaseWithoutRegistration: settings.customerAllowKnowledgeBaseWithoutRegistration ?? true,
                customerShowEstimateRequestLink: settings.customerShowEstimateRequestLink ?? true,
                customerDefaultContactPermissions: settings.customerDefaultContactPermissions ?? ["invoices", "estimates", "contracts", "proposals", "support", "projects"],
                customerInfoFormat: settings.customerInfoFormat ?? "{company_name}\n{street}\n{city} {state}\n{country_code} {zip_code}\n{vat_number_with_label}",
            }));
        }
    }, [loading, settings]);

    const handleSaveCustomerSettings = async () => {
        await saveSettings(customerForm as any);
        toast.success("Customer settings saved successfully");
    };

    // Task Features State
    const [tasksForm, setTasksForm] = useState({
        tasksKanbanLimit: "50",
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
    });

    useEffect(() => {
        if (!loading) {
            setTasksForm(prev => ({
                ...prev,
                tasksKanbanLimit: settings.tasksKanbanLimit?.toString() ?? "50",
                tasksAllowStaffViewAllProjectTasks: settings.tasksAllowStaffViewAllProjectTasks ?? false,
                tasksAllowEditCommentsFirstHourOnly: settings.tasksAllowEditCommentsFirstHourOnly ?? false,
                tasksAutoAssignCreator: settings.tasksAutoAssignCreator ?? true,
                tasksAutoAddCreatorAsFollower: settings.tasksAutoAddCreatorAsFollower ?? true,
                tasksStopOtherTimers: settings.tasksStopOtherTimers ?? true,
                tasksAutoStartTimer: settings.tasksAutoStartTimer ?? true,
                tasksBillableDefault: settings.tasksBillableDefault ?? false,
                tasksTimerRoundOff: settings.tasksTimerRoundOff ?? "no_round",
                tasksTimerRoundOffMultiples: settings.tasksTimerRoundOffMultiples ?? "5",
                tasksDefaultStatus: settings.tasksDefaultStatus ?? "not_started",
                tasksDefaultPriority: settings.tasksDefaultPriority ?? "medium",
                tasksModalWidth: settings.tasksModalWidth ?? "modal-lg",
            }));
        }
    }, [loading, settings]);

    const handleSaveTasksSettings = async () => {
        await saveSettings({
            ...tasksForm,
            tasksKanbanLimit: parseInt(tasksForm.tasksKanbanLimit) || 50,
        } as any);
        toast.success("Task settings saved successfully");
    };

    // Support Features State
    const [supportForm, setSupportForm] = useState({
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
        supportMaxAttachments: "4",
        supportAllowedExtensions: ".jpg,.png,.pdf,.doc,.zip,.rar",
    });

    useEffect(() => {
        if (!loading) {
            setSupportForm(prev => ({
                ...prev,
                supportUseServices: settings.supportUseServices ?? true,
                supportDisablePublicUrl: settings.supportDisablePublicUrl ?? false,
                supportStaffLimitToAssignedDepartments: settings.supportStaffLimitToAssignedDepartments ?? false,
                supportStaffNotificationAssignedOnly: settings.supportStaffNotificationAssignedOnly ?? false,
                supportNotifyOnNewTicket: settings.supportNotifyOnNewTicket ?? true,
                supportNotifyOnCustomerReply: settings.supportNotifyOnCustomerReply ?? true,
                supportStaffOpenTicketsAllContacts: settings.supportStaffOpenTicketsAllContacts ?? false,
                supportAutoAssignFirstReplyStaff: settings.supportAutoAssignFirstReplyStaff ?? false,
                supportAllowNonStaffAccess: settings.supportAllowNonStaffAccess ?? false,
                supportAllowNonAdminDeleteAttachments: settings.supportAllowNonAdminDeleteAttachments ?? false,
                supportAllowNonAdminDeleteTickets: settings.supportAllowNonAdminDeleteTickets ?? false,
                supportAllowCustomerChangeStatus: settings.supportAllowCustomerChangeStatus ?? false,
                supportCustomerShowContactTicketsOnly: settings.supportCustomerShowContactTicketsOnly ?? false,
                supportTicketReplyOrder: settings.supportTicketReplyOrder ?? "asc",
                supportEnableBadge: settings.supportEnableBadge ?? true,
                supportDefaultReplyStatus: settings.supportDefaultReplyStatus ?? "in_progress",
                supportMaxAttachments: settings.supportMaxAttachments?.toString() ?? "4",
                supportAllowedExtensions: settings.supportAllowedExtensions ?? ".jpg,.png,.pdf,.doc,.zip,.rar",
            }));
        }
    }, [loading, settings]);

    const handleSaveSupportSettings = async () => {
        await saveSettings({
            ...supportForm,
            supportMaxAttachments: parseInt(supportForm.supportMaxAttachments) || 4,
        } as any);
        toast.success("Support settings saved successfully");
    };

    // Leads Features State
    const [leadsForm, setLeadsForm] = useState({
        leadsKanbanLimit: "50",
        leadsDefaultStatus: "mql",
        leadsDefaultSource: "facebook",
        leadsDuplicateValidationFields: "email",
        leadsAutoAssignAdminAfterConvert: true,
        leadsAllowNonAdminImport: false,
        leadsKanbanSort: "kanban_order",
        leadsKanbanSortOrder: "asc",
        leadsDisableEditAfterConvert: true,
        leadsModalWidth: "modal-lg",
    });

    useEffect(() => {
        if (!loading) {
            setLeadsForm(prev => ({
                ...prev,
                leadsKanbanLimit: settings.leadsKanbanLimit?.toString() ?? "50",
                leadsDefaultStatus: settings.leadsDefaultStatus ?? "mql",
                leadsDefaultSource: settings.leadsDefaultSource ?? "facebook",
                leadsDuplicateValidationFields: settings.leadsDuplicateValidationFields ?? "email",
                leadsAutoAssignAdminAfterConvert: settings.leadsAutoAssignAdminAfterConvert ?? true,
                leadsAllowNonAdminImport: settings.leadsAllowNonAdminImport ?? false,
                leadsKanbanSort: settings.leadsKanbanSort ?? "kanban_order",
                leadsKanbanSortOrder: settings.leadsKanbanSortOrder ?? "asc",
                leadsDisableEditAfterConvert: settings.leadsDisableEditAfterConvert ?? true,
                leadsModalWidth: settings.leadsModalWidth ?? "modal-lg",
            }));
        }
    }, [loading, settings]);

    const handleSaveLeadsSettings = async () => {
        await saveSettings({
            ...leadsForm,
            leadsKanbanLimit: parseInt(leadsForm.leadsKanbanLimit) || 50,
        } as any);
        toast.success("Leads settings saved successfully");
    };

    // OpenAI Integration State
    const [openaiForm, setOpenaiForm] = useState({
        openaiApiKey: "",
        openaiModel: "gpt-4o",
        openaiMaxTokens: "500",
    });

    useEffect(() => {
        if (!loading) {
            setOpenaiForm(prev => ({
                ...prev,
                openaiApiKey: settings.openaiApiKey ?? "",
                openaiModel: settings.openaiModel ?? "gpt-4o",
                openaiMaxTokens: settings.openaiMaxTokens?.toString() ?? "500",
            }));
        }
    }, [loading, settings]);

    const handleSaveOpenAISettings = async () => {
        await saveSettings({
            ...openaiForm,
            openaiMaxTokens: parseInt(openaiForm.openaiMaxTokens) || 500,
        } as any);
        toast.success("OpenAI settings saved successfully");
    };

    // Calendar Settings State
    const [calendarForm, setCalendarForm] = useState({
        calendarEventsLimit: "4",
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
    });

    useEffect(() => {
        if (!loading) {
            setCalendarForm(prev => ({
                ...prev,
                calendarEventsLimit: settings.calendarEventsLimit?.toString() ?? "4",
                calendarDefaultView: settings.calendarDefaultView ?? "dayGridMonth",
                calendarFirstDay: settings.calendarFirstDay ?? "0",
                calendarShowHideNotifiedReminders: settings.calendarShowHideNotifiedReminders ?? false,
                calendarShowTicketReminders: settings.calendarShowTicketReminders ?? true,
                calendarShowLeadReminders: settings.calendarShowLeadReminders ?? true,
                calendarShowInvoices: settings.calendarShowInvoices ?? true,
                calendarShowCustomerReminders: settings.calendarShowCustomerReminders ?? true,
                calendarShowEstimates: settings.calendarShowEstimates ?? true,
                calendarShowEstimateReminders: settings.calendarShowEstimateReminders ?? true,
                calendarShowProposals: settings.calendarShowProposals ?? true,
                calendarShowProposalReminders: settings.calendarShowProposalReminders ?? true,
                calendarShowContracts: settings.calendarShowContracts ?? true,
                calendarShowInvoiceReminders: settings.calendarShowInvoiceReminders ?? true,
                calendarShowTasks: settings.calendarShowTasks ?? true,
                calendarShowTasksStaffOnly: settings.calendarShowTasksStaffOnly ?? true,
                calendarShowExpenseReminders: settings.calendarShowExpenseReminders ?? true,
                calendarShowProjects: settings.calendarShowProjects ?? true,
                calendarShowTaskReminders: settings.calendarShowTaskReminders ?? true,
                calendarShowCreditNoteReminders: settings.calendarShowCreditNoteReminders ?? true,
                calendarInvoiceColor: settings.calendarInvoiceColor ?? "#ff6f00",
                calendarEstimateColor: settings.calendarEstimateColor ?? "#ff6f00",
                calendarProposalColor: settings.calendarProposalColor ?? "#84c529",
                calendarReminderColor: settings.calendarReminderColor ?? "#03a9f4",
                calendarContractColor: settings.calendarContractColor ?? "#b72974",
                calendarProjectColor: settings.calendarProjectColor ?? "#b72974",
            }));
        }
    }, [loading, settings]);

    const handleSaveCalendarSettings = async () => {
        await saveSettings({
            ...calendarForm,
            calendarEventsLimit: parseInt(calendarForm.calendarEventsLimit) || 4,
        } as any);
        toast.success("Calendar settings saved successfully");
    };

    // PDF Settings State
    const [pdfForm, setPdfForm] = useState({
        pdfFont: "freesans",
        pdfSwapDetails: false,
        pdfFontSize: "10",
        pdfTableHeadingColor: "#323a45",
        pdfTableHeadingTextColor: "#ffffff",
        pdfLogoUrl: "",
        pdfLogoWidth: "150",
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
    });

    useEffect(() => {
        if (!loading) {
            setPdfForm(prev => ({
                ...prev,
                pdfFont: settings.pdfFont ?? "freesans",
                pdfSwapDetails: settings.pdfSwapDetails ?? false,
                pdfFontSize: settings.pdfFontSize?.toString() ?? "10",
                pdfTableHeadingColor: settings.pdfTableHeadingColor ?? "#323a45",
                pdfTableHeadingTextColor: settings.pdfTableHeadingTextColor ?? "#ffffff",
                pdfLogoUrl: settings.pdfLogoUrl ?? "",
                pdfLogoWidth: settings.pdfLogoWidth?.toString() ?? "150",
                pdfShowStatus: settings.pdfShowStatus ?? true,
                pdfShowLink: settings.pdfShowLink ?? true,
                pdfShowPayments: settings.pdfShowPayments ?? true,
                pdfShowPageNumber: settings.pdfShowPageNumber ?? false,
                pdfShowSignatureInvoice: settings.pdfShowSignatureInvoice ?? false,
                pdfShowSignatureEstimate: settings.pdfShowSignatureEstimate ?? false,
                pdfShowSignatureCreditNote: settings.pdfShowSignatureCreditNote ?? false,
                pdfShowSignatureContract: settings.pdfShowSignatureContract ?? false,
                pdfShowSignatureProposal: settings.pdfShowSignatureProposal ?? false,
                pdfSignatureImage: settings.pdfSignatureImage ?? "",
                pdfFormatInvoice: settings.pdfFormatInvoice ?? "A4 Portrait",
                pdfFormatEstimate: settings.pdfFormatEstimate ?? "A4 Portrait",
                pdfFormatProposal: settings.pdfFormatProposal ?? "A4 Portrait",
                pdfFormatPayment: settings.pdfFormatPayment ?? "A4 Portrait",
                pdfFormatCreditNote: settings.pdfFormatCreditNote ?? "A4 Portrait",
                pdfFormatContract: settings.pdfFormatContract ?? "A4 Portrait",
                pdfFormatStatement: settings.pdfFormatStatement ?? "A4 Portrait",
            }));
        }
    }, [loading, settings]);

    const handleSavePdfSettings = async () => {
        await saveSettings({
            ...pdfForm,
            pdfFontSize: parseInt(pdfForm.pdfFontSize) || 10,
            pdfLogoWidth: parseInt(pdfForm.pdfLogoWidth) || 150,
        } as any);
        toast.success("PDF settings saved successfully");
    };

    // E-Sign Settings State
    const [esignForm, setEsignForm] = useState({
        esignProposalRequireSignature: true,
        esignEstimateRequireSignature: true,
        esignLegalBoundText: "By clicking on \"Sign\", I consent to be legally bound by this electronic representation of my signature.",
    });

    useEffect(() => {
        if (!loading) {
            setEsignForm(prev => ({
                ...prev,
                esignProposalRequireSignature: settings.esignProposalRequireSignature ?? true,
                esignEstimateRequireSignature: settings.esignEstimateRequireSignature ?? true,
                esignLegalBoundText: settings.esignLegalBoundText ?? "By clicking on \"Sign\", I consent to be legally bound by this electronic representation of my signature.",
            }));
        }
    }, [loading, settings]);

    const handleSaveEsignSettings = async () => {
        await saveSettings(esignForm as any);
        toast.success("E-Sign settings saved successfully");
    };

    // Misc Settings State
    const [miscForm, setMiscForm] = useState({
        miscRequireLoginForContract: false,
        miscDropboxAppKey: "",
        miscMaxFileSizeMedia: "50",
        miscMaxFileUploadsPost: "10",
        miscLimitTopSearchBarResults: "10",
        miscDefaultStaffRole: "employee",
        miscDeleteActivityLogOlderThan: "1",
        miscShowSetupMenuHover: false,
        miscShowHelpMenu: true,
        miscUseMinified: true,
        miscSaveLastTableOrder: false,
        miscShowTableExportButton: "admin",
        miscTablesPaginationLimit: "25",
        miscAllowNonAdminCreateLeadStatus: false,
        miscAllowNonAdminCreateLeadSource: false,
        miscAllowNonAdminCreateCustomerGroup: false,
        miscAllowNonAdminCreateService: false,
        miscAllowNonAdminSavePredefinedReplies: false,
        miscAllowNonAdminCreateContractType: false,
        miscAllowNonAdminCreateExpenseCategory: false,
    });

    useEffect(() => {
        if (!loading) {
            setMiscForm(prev => ({
                ...prev,
                miscRequireLoginForContract: settings.miscRequireLoginForContract ?? false,
                miscDropboxAppKey: settings.miscDropboxAppKey ?? "",
                miscMaxFileSizeMedia: settings.miscMaxFileSizeMedia?.toString() ?? "50",
                miscMaxFileUploadsPost: settings.miscMaxFileUploadsPost?.toString() ?? "10",
                miscLimitTopSearchBarResults: settings.miscLimitTopSearchBarResults?.toString() ?? "10",
                miscDefaultStaffRole: settings.miscDefaultStaffRole ?? "employee",
                miscDeleteActivityLogOlderThan: settings.miscDeleteActivityLogOlderThan?.toString() ?? "1",
                miscShowSetupMenuHover: settings.miscShowSetupMenuHover ?? false,
                miscShowHelpMenu: settings.miscShowHelpMenu ?? true,
                miscUseMinified: settings.miscUseMinified ?? true,
                miscSaveLastTableOrder: settings.miscSaveLastTableOrder ?? false,
                miscShowTableExportButton: settings.miscShowTableExportButton ?? "admin",
                miscTablesPaginationLimit: settings.miscTablesPaginationLimit?.toString() ?? "25",
                miscAllowNonAdminCreateLeadStatus: settings.miscAllowNonAdminCreateLeadStatus ?? false,
                miscAllowNonAdminCreateLeadSource: settings.miscAllowNonAdminCreateLeadSource ?? false,
                miscAllowNonAdminCreateCustomerGroup: settings.miscAllowNonAdminCreateCustomerGroup ?? false,
                miscAllowNonAdminCreateService: settings.miscAllowNonAdminCreateService ?? false,
                miscAllowNonAdminSavePredefinedReplies: settings.miscAllowNonAdminSavePredefinedReplies ?? false,
                miscAllowNonAdminCreateContractType: settings.miscAllowNonAdminCreateContractType ?? false,
                miscAllowNonAdminCreateExpenseCategory: settings.miscAllowNonAdminCreateExpenseCategory ?? false,
            }));
        }
    }, [loading, settings]);

    const handleSaveMiscSettings = async () => {
        await saveSettings({
            ...miscForm,
            miscMaxFileSizeMedia: parseInt(miscForm.miscMaxFileSizeMedia) || 50,
            miscMaxFileUploadsPost: parseInt(miscForm.miscMaxFileUploadsPost) || 10,
            miscLimitTopSearchBarResults: parseInt(miscForm.miscLimitTopSearchBarResults) || 10,
            miscDeleteActivityLogOlderThan: parseInt(miscForm.miscDeleteActivityLogOlderThan) || 1,
            miscTablesPaginationLimit: parseInt(miscForm.miscTablesPaginationLimit) || 25,
        } as any);
        toast.success("Misc settings saved successfully");
    };

    useEffect(() => {
        if (!loading) {
            setLocalSubdomain(settings.subdomain || "");
            setCompanyName(settings.companyName || "");
            setMainDomain(settings.mainDomain || "");
            setRtlAdmin(settings.rtlAdmin ? "yes" : "no");
            setRtlCustomer(settings.rtlCustomer ? "yes" : "no");
            setAllowedFileTypes(settings.allowedFileTypes || "");
        }
    }, [loading, settings]);

    useEffect(() => {
        const checkAvailability = async () => {
            if (!localSubdomain || localSubdomain.length < 3) {
                setAvailability("idle");
                return;
            }

            if (localSubdomain === settings.subdomain) {
                setAvailability("available");
                return;
            }

            setAvailability("loading");
            try {
                const q = query(
                    collection(db, "organizations"),
                    where("subdomain", "==", localSubdomain)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setAvailability("unavailable");
                    setCheckError("Subdomain is already taken.");
                } else {
                    setAvailability("available");
                    setCheckError("");
                }
            } catch (error) {
                console.error("Error checking subdomain:", error);
                setAvailability("idle");
            }
        };

        const timeoutId = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timeoutId);
    }, [localSubdomain, settings.subdomain]);

    const handleSaveGeneral = async () => {
        if (availability === "unavailable") {
            toast.error("Subdomain is not available");
            return;
        }
        try {
            await saveSettings({
                companyName,
                subdomain: localSubdomain,
                mainDomain,
                rtlAdmin: rtlAdmin === "yes",
                rtlCustomer: rtlCustomer === "yes",
                allowedFileTypes
            });
            toast.success("Settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    const sidebarSections = [
        {
            title: "General",
            items: [
                { id: "general", label: "General", icon: SettingsIcon },
                { id: "company-information", label: "Company Information", icon: FileText },
                { id: "localization", label: "Localization", icon: Globe },
                { id: "email", label: "Email", icon: Mail },

            ]
        },
        {
            title: "Finance",
            items: [
                { id: "finance-general", label: "General", icon: DollarSign },
                { id: "finance-invoices", label: "Invoices", icon: FileIcon },
                { id: "finance-proposals", label: "Proposals", icon: FileCheck },
                { id: "finance-estimates", label: "Estimates", icon: FileIcon },
                { id: "finance-credit-notes", label: "Credit Notes", icon: CreditCard },

                { id: "finance-payment-gateways", label: "Payment Gateways", icon: PaymentIcon },
            ]
        },
        {
            title: "Configure Features",
            items: [
                { id: "customers", label: "Customers", icon: Users },
                { id: "tasks", label: "Tasks", icon: CheckCircle },
                { id: "support", label: "Support", icon: Headphones },
                { id: "leads", label: "Leads", icon: Target },
            ]
        },
        {
            title: "AI Integrations",
            items: [
                { id: "openai", label: "OpenAI", icon: Zap },
            ]
        },
        {
            title: "Other",
            items: [
                { id: "calendar", label: "Calendar", icon: Calendar },
                { id: "pdf", label: "PDF", icon: FileText },
                { id: "e-sign", label: "E-Sign", icon: PenTool },
            ]
        },
        {
            title: "Misc",
            items: [
                { id: "misc", label: "Misc", icon: MoreHorizontal },
            ]
        },
    ];

    const renderContent = () => {
        if (activeSection === "general") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">General</h2>

                    <div className="space-y-4">
                        <div>
                            <Label>Company Logo Light (for dark backgrounds)</Label>
                            {settings.logoLight && (
                                <div className="mt-2 mb-2 relative w-fit">
                                    <div className="bg-gray-900 p-2 rounded-md">
                                        <img src={settings.logoLight} alt="Light Logo" className="h-12 object-contain" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                        onClick={() => saveSettings({ logoLight: "" })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUpload(file, "light");
                                    }}
                                    disabled={uploading === "light"}
                                />
                                {uploading === "light" && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>

                        <div>
                            <Label>Company Logo Dark (Standard)</Label>
                            {settings.logoDark && (
                                <div className="mt-2 mb-2 relative w-fit">
                                    <div className="bg-white p-2 rounded-md border">
                                        <img src={settings.logoDark} alt="Dark Logo" className="h-12 object-contain" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                        onClick={() => saveSettings({ logoDark: "" })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUpload(file, "dark");
                                    }}
                                    disabled={uploading === "dark"}
                                />
                                {uploading === "dark" && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>

                        <div>
                            <Label>Favicon</Label>
                            {settings.favicon && (
                                <div className="mt-2 mb-2 relative w-fit">
                                    <img src={settings.favicon} alt="Favicon" className="h-8 w-8 object-contain" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                        onClick={() => saveSettings({ favicon: "" })}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    type="file"
                                    accept="image/x-icon,image/png"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUpload(file, "favicon");
                                    }}
                                    disabled={uploading === "favicon"}
                                />
                                {uploading === "favicon" && <Loader2 className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>



                        <div>
                            <Label>Subdomain (Tenant URL)</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-gray-500 font-medium">https://</span>
                                <Input
                                    value={localSubdomain}
                                    onChange={(e) => setLocalSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="my-org"
                                    className="max-w-[200px]"
                                />
                                <span className="text-gray-500 font-medium">.dosory.com</span>
                            </div>
                            {availability === "loading" && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                                </p>
                            )}
                            {availability === "available" && localSubdomain !== settings.subdomain && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Subdomain is available
                                </p>
                            )}
                            {availability === "unavailable" && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <X className="h-3 w-3" /> {checkError}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                This will change your dashboard URL.
                            </p>
                        </div>

                        {/* Custom Domain feature hidden for this version
                        <div>
                            <Label>Custom Domain (Optional)</Label>
                            <Input
                                value={mainDomain}
                                placeholder="https://my-domain.com"
                                onChange={(e) => setMainDomain(e.target.value)}
                            />
                        </div>
                        */}

                        <div>
                            <Label className="mb-3 block">RTL Admin Area (Right to Left)</Label>
                            <RadioGroup value={rtlAdmin} onValueChange={setRtlAdmin}>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="rtl-admin-yes" />
                                        <Label htmlFor="rtl-admin-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="rtl-admin-no" />
                                        <Label htmlFor="rtl-admin-no">No</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label className="mb-3 block">RTL Customers Area (Right to Left)</Label>
                            <RadioGroup value={rtlCustomer} onValueChange={setRtlCustomer}>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="rtl-customer-yes" />
                                        <Label htmlFor="rtl-customer-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="rtl-customer-no" />
                                        <Label htmlFor="rtl-customer-no">No</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label>Allowed file types</Label>
                            <Input value={allowedFileTypes} onChange={(e) => setAllowedFileTypes(e.target.value)} />
                            <p className="text-sm text-gray-500 mt-1">
                                Separate file extensions with commas
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveGeneral}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "company-information") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Company Information</h2>

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                        <p className="text-sm text-blue-900">
                            These information will be displayed on invoices/estimates/payments and other PDF documents where company info is required
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label>Company Name</Label>
                            <Input defaultValue="WasilaDev" />
                        </div>

                        <div>
                            <Label>Address</Label>
                            <Input defaultValue="3a Mabotheen Buildings, Nasr City" />
                        </div>

                        <div>
                            <Label>City</Label>
                            <Input defaultValue="Cairo" />
                        </div>

                        <div>
                            <Label>State</Label>
                            <Input defaultValue="Cairo" />
                        </div>

                        <div>
                            <Label>Country Code</Label>
                            <Input defaultValue="Egypt" />
                        </div>

                        <div>
                            <Label>Zip Code</Label>
                            <Input defaultValue="11521" />
                        </div>

                        <div>
                            <Label>Phone</Label>
                            <Input defaultValue="+201000081160" />
                        </div>

                        <div>
                            <Label>VAT Number</Label>
                            <Input />
                        </div>

                        <div>
                            <Label>Company Information Format (PDF and HTML)</Label>
                            <Textarea
                                className="min-h-[150px] font-mono text-sm"
                                defaultValue={`{company_name}
{address}
{city} {state}
{country_code} {zip_code}
{vat_number_with_label}`}
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                <span className="text-blue-600">{"{company_name}"}</span> <span className="text-blue-600">{"{address}"}</span>, <span className="text-blue-600">{"{city}"}</span>, <span className="text-blue-600">{"{state}"}</span>, <span className="text-blue-600">{"{zip_code}"}</span>, <span className="text-blue-600">{"{country_code}"}</span>, <span className="text-blue-600">{"{phone}"}</span>, <span className="text-blue-600">{"{vat_number}"}</span>, <span className="text-blue-600">{"{vat_number_with_label}"}</span>
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                Save Settings
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "localization") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Localization</h2>

                    <div className="space-y-4">
                        <div>
                            <Label>Date Format</Label>
                            <Select defaultValue="d/m/Y">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="d/m/Y">d/m/Y</SelectItem>
                                    <SelectItem value="m/d/Y">m/d/Y</SelectItem>
                                    <SelectItem value="Y-m-d">Y-m-d</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Time Format</Label>
                            <Select defaultValue="12">
                                <SelectTrigger>
                                    <SelectValue>12 hours</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12 hours</SelectItem>
                                    <SelectItem value="24">24 hours</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Default Timezone</Label>
                            <Select defaultValue="Africa/Cairo">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Africa/Cairo">Africa/Cairo</SelectItem>
                                    <SelectItem value="America/New_York">America/New York</SelectItem>
                                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Default Language</Label>
                            <Select defaultValue="english">
                                <SelectTrigger>
                                    <SelectValue>English</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="english">English</SelectItem>
                                    <SelectItem value="arabic">Arabic</SelectItem>
                                    <SelectItem value="spanish">Spanish</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Enabled Languages</Label>
                            <Select defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue>All</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="selected">Selected Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-3 block">Disable Languages</Label>
                            <RadioGroup defaultValue="no">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="disable-lang-yes" />
                                        <Label htmlFor="disable-lang-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="disable-lang-no" />
                                        <Label htmlFor="disable-lang-no">No</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label className="mb-3 block flex items-center gap-2">
                                <HelpCircle className="h-4 w-4" />
                                Output client PDF documents from admin area in client language
                            </Label>
                            <RadioGroup defaultValue="no">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="pdf-lang-yes" />
                                        <Label htmlFor="pdf-lang-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="pdf-lang-no" />
                                        <Label htmlFor="pdf-lang-no">No</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="pt-4">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                Save Settings
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-general") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">General</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label className="mb-2 block">Decimal Separator</Label>
                                <Select
                                    value={financeGeneralForm.decimalSeparator}
                                    onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, decimalSeparator: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select separator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value=".">. (Dot)</SelectItem>
                                        <SelectItem value=",">, (Comma)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-2 block">Thousand Separator</Label>
                                <Select
                                    value={financeGeneralForm.thousandSeparator}
                                    onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, thousandSeparator: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select separator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value=",">, (Comma)</SelectItem>
                                        <SelectItem value=".">. (Dot)</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="space">Space</SelectItem>
                                        <SelectItem value="'">' (Apostrophe)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block flex items-center gap-2">
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                                Number padding zero's for prefix formats
                            </Label>
                            <p className="text-sm text-gray-500 mb-2">eq. If this value is 3 the number will be formatted: 005 or 025</p>
                            <Input
                                type="number"
                                value={financeGeneralForm.numberPadding}
                                onChange={e => setFinanceGeneralForm({ ...financeGeneralForm, numberPadding: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "autoAssignSaleAgent", label: "Automatically assign logged in staff as sale agent" },
                                { key: "showTaxPerItem", label: "Show TAX per item" },
                                { key: "removeTaxNameFromRow", label: "Remove the tax name from item table row" },
                                { key: "excludeCurrencySymbol", label: "Exclude currency symbol from items table Amount" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4 text-gray-400" />
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={financeGeneralForm[item.key as keyof typeof financeGeneralForm] ? "yes" : "no"}
                                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`fg-${item.key}-yes`} />
                                            <Label htmlFor={`fg-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`fg-${item.key}-no`} />
                                            <Label htmlFor={`fg-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Label className="mb-2 block">Default Tax</Label>
                            <Select
                                value={financeGeneralForm.defaultTax}
                                onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, defaultTax: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Tax" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0.00">0.00% (No Tax)</SelectItem>
                                    <SelectItem value="14.00%">14.00% (VAT)</SelectItem>
                                    <SelectItem value="5.00%">5.00%</SelectItem>
                                    <SelectItem value="10.00%">10.00%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <Label className="mb-2 block">Remove decimals on numbers/money with zero decimals (2.00 will become 2, 2.25 will stay 2.25)</Label>
                                <RadioGroup
                                    value={financeGeneralForm.removeDecimalsOnZero ? "yes" : "no"}
                                    onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, removeDecimalsOnZero: val === "yes" })}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="rm-dec-yes" />
                                        <Label htmlFor="rm-dec-yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="rm-dec-no" />
                                        <Label htmlFor="rm-dec-no">No</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium mb-4">Amount to words</h3>
                            <p className="text-sm text-gray-500 mb-4">Output total amount to words in invoice/estimate/proposal</p>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <Label className="mb-2 block">Enable</Label>
                                    <RadioGroup
                                        value={financeGeneralForm.amountToWordsEnable ? "yes" : "no"}
                                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, amountToWordsEnable: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="atw-en-yes" />
                                            <Label htmlFor="atw-en-yes">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="atw-en-no" />
                                            <Label htmlFor="atw-en-no">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Number words into lowercase</Label>
                                    <RadioGroup
                                        value={financeGeneralForm.amountToWordsLowercase ? "yes" : "no"}
                                        onValueChange={(val) => setFinanceGeneralForm({ ...financeGeneralForm, amountToWordsLowercase: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="atw-lc-yes" />
                                            <Label htmlFor="atw-lc-yes">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="atw-lc-no" />
                                            <Label htmlFor="atw-lc-no">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveFinanceGeneral}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-invoices") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Invoices</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Invoice Number Prefix</Label>
                                <Input
                                    value={invoiceForm.invoiceNumberPrefix}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Next Invoice Number</Label>
                                <Input
                                    value={invoiceForm.invoiceNumberPrefix === "number_based" ? invoiceForm.invoiceNextNumber : invoiceForm.invoiceNextNumber}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNextNumber: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Invoice due after (days)</Label>
                                <Input
                                    type="number"
                                    value={invoiceForm.invoiceDueAfterDays}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDueAfterDays: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Boolean Settings */}
                        <div className="space-y-6">
                            {[
                                { key: "invoiceAllowStaffViewAssigned", label: "Allow staff members to view invoices where they are assigned to" },
                                { key: "invoiceRequireClientLogin", label: "Require client to be logged in to view invoice" },
                                { key: "invoiceDeleteOnlyLast", label: "Delete invoice allowed only on last invoice" },
                                { key: "invoiceDecrementOnDelete", label: "Decrement invoice number on delete" },
                                { key: "invoiceExcludeDraftsFromClient", label: "Exclude invoices with draft status from customers area" },
                                { key: "invoiceShowSaleAgent", label: "Show Sale Agent On Invoice" },
                                { key: "invoiceShowProjectName", label: "Show Project Name On Invoice" },
                                { key: "invoiceShowTotalPaid", label: "Show Total Paid On Invoice" },
                                { key: "invoiceShowCreditsApplied", label: "Show Credits Applied On Invoice" },
                                { key: "invoiceShowAmountDue", label: "Show Amount Due On Invoice" },
                                { key: "invoiceAttachPdfToEmail", label: "Attach invoice PDF when sending payment receipt to email" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">{item.label}</Label>
                                    <RadioGroup
                                        value={invoiceForm[item.key as keyof typeof invoiceForm] ? "yes" : "no"}
                                        onValueChange={(val) => setInvoiceForm({ ...invoiceForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`${item.key}-yes`} />
                                            <Label htmlFor={`${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`${item.key}-no`} />
                                            <Label htmlFor={`${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        {/* Number Format */}
                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Invoice Number Format</Label>
                            <RadioGroup
                                value={invoiceForm.invoiceNumberFormat}
                                onValueChange={(val) => setInvoiceForm({ ...invoiceForm, invoiceNumberFormat: val as any })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="number_based" id="fmt-number" />
                                    <Label htmlFor="fmt-number" className="font-normal">Number Based (000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="year_based" id="fmt-year" />
                                    <Label htmlFor="fmt-year" className="font-normal">Year Based (YYYY/000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mixed" id="fmt-mixed" />
                                    <Label htmlFor="fmt-mixed" className="font-normal">000001-YY</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Predefined Client Note</Label>
                                <Textarea
                                    value={invoiceForm.invoiceDefaultClientNote}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDefaultClientNote: e.target.value })}
                                    className="h-24"
                                    placeholder="Thank you for doing business with us..."
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Predefined Terms & Conditions</Label>
                                <Textarea
                                    value={invoiceForm.invoiceDefaultTerms}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDefaultTerms: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={() => saveSettings(invoiceForm as any)}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-proposals") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Proposals</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Proposal Number Prefix</Label>
                                <Input
                                    value={proposalForm.proposalNumberPrefix}
                                    onChange={e => setProposalForm({ ...proposalForm, proposalNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Proposal Due After (days)</Label>
                                <Input
                                    type="number"
                                    value={proposalForm.proposalDueAfterDays}
                                    onChange={e => setProposalForm({ ...proposalForm, proposalDueAfterDays: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Pipeline limit per status</Label>
                                <Input
                                    type="number"
                                    value={proposalForm.proposalPipelineLimit}
                                    onChange={e => setProposalForm({ ...proposalForm, proposalPipelineLimit: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Sort */}
                        <div className="space-y-2">
                            <Label>Default pipeline sort</Label>
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                <Select
                                    value={proposalForm.proposalPipelineSort}
                                    onValueChange={(val) => setProposalForm({ ...proposalForm, proposalPipelineSort: val as any })}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sort By" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pipeline_order">Pipeline Order</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                                <RadioGroup
                                    value={proposalForm.proposalPipelineSortOrder}
                                    onValueChange={(val) => setProposalForm({ ...proposalForm, proposalPipelineSortOrder: val as any })}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="asc" id="sort-asc" />
                                        <Label htmlFor="sort-asc">Ascending</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="desc" id="sort-desc" />
                                        <Label htmlFor="sort-desc">Descending</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "proposalShowProjectName", label: "Show Project Name On Proposal" },
                                { key: "proposalExcludeDrafts", label: "Exclude proposals with draft status from customers area" },
                                { key: "proposalAutoConvert", label: "Auto convert the proposal to invoice after client accept (only customers related proposals)" },
                                { key: "proposalAllowStaffViewAssigned", label: "Allow staff members to view proposals where they are assigned to" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">{item.label}</Label>
                                    <RadioGroup
                                        value={proposalForm[item.key as keyof typeof proposalForm] ? "yes" : "no"}
                                        onValueChange={(val) => setProposalForm({ ...proposalForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`pf-${item.key}-yes`} />
                                            <Label htmlFor={`pf-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`pf-${item.key}-no`} />
                                            <Label htmlFor={`pf-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        <div>
                            <Label className="mb-2 block">Proposal Info Format (PDF and HTML)</Label>
                            <Textarea
                                value={proposalForm.proposalInfoFormat}
                                onChange={e => setProposalForm({ ...proposalForm, proposalInfoFormat: e.target.value })}
                                className="h-32 font-mono text-sm"
                            />
                            <p className="mt-2 text-xs text-blue-600 break-all">
                                {`{proposal_to}, {address}, {city}, {state}, {zip_code}, {country_code}, {country_name}, {phone}, {email}`}
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveProposalSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-estimates") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Estimates</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Estimate Number Prefix</Label>
                                <Input
                                    value={estimateForm.estimateNumberPrefix}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Next estimate Number</Label>
                                <Input
                                    value={estimateForm.estimateNextNumber}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateNextNumber: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Estimate Due After (days)</Label>
                                <Input
                                    type="number"
                                    value={estimateForm.estimateDueAfterDays}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateDueAfterDays: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "estimateDeleteOnlyLast", label: "Delete estimate allowed only on last invoice" }, // using last invoice label as per screenshot? "last invoice" text seems like copy paste error in design or actual text. I'll use text from screenshot "Delete estimate allowed only on last invoice"
                                { key: "estimateDecrementOnDelete", label: "Decrement estimate number on delete" },
                                { key: "estimateAllowStaffViewAssigned", label: "Allow staff members to view estimates where they are assigned to" },
                                { key: "estimateRequireClientLogin", label: "Require client to be logged in to view estimate" },
                                { key: "estimateShowSaleAgent", label: "Show Sale Agent On Estimate" },
                                { key: "estimateShowProjectName", label: "Show Project Name On Estimate" },
                                { key: "estimateAutoConvert", label: "Auto convert the estimate to invoice after client accept" },
                                { key: "estimateExcludeDraftsFromClient", label: "Exclude estimates with draft status from customers area" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        {(item.key === "estimateNextNumber" || item.key === "estimateDueAfterDays" || item.key === "estimateDecrementOnDelete") && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={estimateForm[item.key as keyof typeof estimateForm] ? "yes" : "no"}
                                        onValueChange={(val) => setEstimateForm({ ...estimateForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`ef-${item.key}-yes`} />
                                            <Label htmlFor={`ef-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`ef-${item.key}-no`} />
                                            <Label htmlFor={`ef-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        {/* Number Format */}
                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Estimate Number Format</Label>
                            <RadioGroup
                                value={estimateForm.estimateNumberFormat}
                                onValueChange={(val) => setEstimateForm({ ...estimateForm, estimateNumberFormat: val as any })}
                                className="flex gap-4 flex-wrap"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="number_based" id="est-fmt-number" />
                                    <Label htmlFor="est-fmt-number" className="font-normal">Number Based (000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="year_based" id="est-fmt-year" />
                                    <Label htmlFor="est-fmt-year" className="font-normal">Year Based (YYYY/000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mixed" id="est-fmt-mixed" />
                                    <Label htmlFor="est-fmt-mixed" className="font-normal">000001-YY</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="date_based" id="est-fmt-date" />
                                    <Label htmlFor="est-fmt-date" className="font-normal">000001/MM/YYYY</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>Pipeline limit per status</Label>
                                <Input
                                    type="number"
                                    value={estimateForm.estimatePipelineLimit}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimatePipelineLimit: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Sort */}
                        <div className="space-y-2">
                            <Label>Default pipeline sort</Label>
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                <Select
                                    value={estimateForm.estimatePipelineSort}
                                    onValueChange={(val) => setEstimateForm({ ...estimateForm, estimatePipelineSort: val as any })}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Sort By" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pipeline_order">Pipeline Order</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                                <RadioGroup
                                    value={estimateForm.estimatePipelineSortOrder}
                                    onValueChange={(val) => setEstimateForm({ ...estimateForm, estimatePipelineSortOrder: val as any })}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="asc" id="est-sort-asc" />
                                        <Label htmlFor="est-sort-asc">Ascending</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="desc" id="est-sort-desc" />
                                        <Label htmlFor="est-sort-desc">Descending</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Predefined Client Note</Label>
                                <Textarea
                                    value={estimateForm.estimateDefaultClientNote}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateDefaultClientNote: e.target.value })}
                                    className="h-24"
                                    placeholder="Thank you for doing business with WasilaDev"
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Predefined Terms & Conditions</Label>
                                <Textarea
                                    value={estimateForm.estimateDefaultTerms}
                                    onChange={e => setEstimateForm({ ...estimateForm, estimateDefaultTerms: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveEstimateSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-credit-notes") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Credit Notes</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div className="space-y-4">
                            <div>
                                <Label>Credit Note Number Prefix</Label>
                                <Input
                                    value={creditNoteForm.creditNoteNumberPrefix}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteNumberPrefix: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="flex items-center gap-2 mb-1"><HelpCircle className="h-4 w-4 text-gray-400" /> Next Credit Note Number</Label>
                                <Input
                                    value={creditNoteForm.creditNoteNextNumber}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteNextNumber: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Number Format */}
                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Credit Note Number Format</Label>
                            <RadioGroup
                                value={creditNoteForm.creditNoteNumberFormat}
                                onValueChange={(val) => setCreditNoteForm({ ...creditNoteForm, creditNoteNumberFormat: val as any })}
                                className="flex gap-4 flex-wrap"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="number_based" id="cn-fmt-number" />
                                    <Label htmlFor="cn-fmt-number" className="font-normal">Number Based (000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="year_based" id="cn-fmt-year" />
                                    <Label htmlFor="cn-fmt-year" className="font-normal">Year Based (YYYY/000001)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mixed" id="cn-fmt-mixed" />
                                    <Label htmlFor="cn-fmt-mixed" className="font-normal">000001-YY</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "creditNoteDecrementOnDelete", label: "Decrement credit note number on delete." },
                                { key: "creditNoteShowProjectName", label: "Show Project Name On Credit Note" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        {item.key === "creditNoteDecrementOnDelete" && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={creditNoteForm[item.key as keyof typeof creditNoteForm] ? "yes" : "no"}
                                        onValueChange={(val) => setCreditNoteForm({ ...creditNoteForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`cnf-${item.key}-yes`} />
                                            <Label htmlFor={`cnf-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`cnf-${item.key}-no`} />
                                            <Label htmlFor={`cnf-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <hr className="border-gray-100" />

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Predefined Client Note</Label>
                                <Textarea
                                    value={creditNoteForm.creditNoteDefaultClientNote}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteDefaultClientNote: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Predefined Terms & Conditions</Label>
                                <Textarea
                                    value={creditNoteForm.creditNoteDefaultTerms}
                                    onChange={e => setCreditNoteForm({ ...creditNoteForm, creditNoteDefaultTerms: e.target.value })}
                                    className="h-24"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveCreditNoteSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "finance-payment-gateways") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Payment Gateways</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">
                        <Tabs value={activeGatewayTab} onValueChange={setActiveGatewayTab}>
                            <TabsList>
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="paypal">Paypal</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-6 mt-6">
                                <div className="space-y-6">
                                    {[
                                        { key: "paymentNotificationEmail", label: "Receive notification when customer pay invoice (built-in)" },
                                        { key: "allowCustomerModifyAmount", label: "Allow customer to modify the amount to pay (for online payments)" },
                                    ].map((item) => (
                                        <div key={item.key}>
                                            <Label className="mb-2 block text-sm font-medium text-gray-700">{item.label}</Label>
                                            <RadioGroup
                                                value={gatewayForm[item.key as keyof typeof gatewayForm] ? "yes" : "no"}
                                                onValueChange={(val) => setGatewayForm({ ...gatewayForm, [item.key]: val === "yes" })}
                                                className="flex gap-4"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="yes" id={`pg-${item.key}-yes`} />
                                                    <Label htmlFor={`pg-${item.key}-yes`} className="font-normal">Yes</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="no" id={`pg-${item.key}-no`} />
                                                    <Label htmlFor={`pg-${item.key}-no`} className="font-normal">No</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="paypal" className="space-y-6 mt-6">
                                <h3 className="text-lg font-medium">Paypal</h3>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">Active</Label>
                                    <RadioGroup
                                        value={gatewayForm.paypalActive ? "yes" : "no"}
                                        onValueChange={(val) => setGatewayForm({ ...gatewayForm, paypalActive: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="pp-active-yes" />
                                            <Label htmlFor="pp-active-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="pp-active-no" />
                                            <Label htmlFor="pp-active-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label>Label</Label>
                                    <Input
                                        value={gatewayForm.paypalLabel}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalLabel: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Fixed Fee</Label>
                                    <Input
                                        value={gatewayForm.paypalFixedFee}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalFixedFee: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Percentage Fee</Label>
                                    <Input
                                        value={gatewayForm.paypalPercentageFee}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalPercentageFee: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>PayPal API Username</Label>
                                    <Input
                                        value={gatewayForm.paypalUsername}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalUsername: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>PayPal API Password</Label>
                                    <Input
                                        value={gatewayForm.paypalPassword}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalPassword: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>API Signature</Label>
                                    <Input
                                        value={gatewayForm.paypalSignature}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalSignature: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="mb-2 block">Gateway Dashbord Payment Description</Label>
                                    <Textarea
                                        value={gatewayForm.paypalDescription}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalDescription: e.target.value })}
                                        className="h-24"
                                    />
                                </div>

                                <div>
                                    <Label>Currencies (coma separated)</Label>
                                    <Input
                                        value={gatewayForm.paypalCurrencies}
                                        onChange={e => setGatewayForm({ ...gatewayForm, paypalCurrencies: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">Enable Test Mode</Label>
                                    <RadioGroup
                                        value={gatewayForm.paypalTestMode ? "yes" : "no"}
                                        onValueChange={(val) => setGatewayForm({ ...gatewayForm, paypalTestMode: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="pp-test-yes" />
                                            <Label htmlFor="pp-test-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="pp-test-no" />
                                            <Label htmlFor="pp-test-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">Selected by default on invoice</Label>
                                    <RadioGroup
                                        value={gatewayForm.paypalDefaultSelected ? "yes" : "no"}
                                        onValueChange={(val) => setGatewayForm({ ...gatewayForm, paypalDefaultSelected: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="pp-def-yes" />
                                            <Label htmlFor="pp-def-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="pp-def-no" />
                                            <Label htmlFor="pp-def-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                            </TabsContent>
                        </Tabs>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveGatewaySettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
        if (activeSection === "customers") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Customers</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div>
                            <Label>Default customers theme</Label>
                            <Select
                                value={customerForm.customerDefaultTheme}
                                onValueChange={(val) => setCustomerForm({ ...customerForm, customerDefaultTheme: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="perfex">Perfex</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Default Country</Label>
                            <Select
                                value={customerForm.customerDefaultCountry}
                                onValueChange={(val) => setCustomerForm({ ...customerForm, customerDefaultCountry: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Nothing selected" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="us">United States</SelectItem>
                                    {/* Add more countries as needed */}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Visible Tabs (Profile)</Label>
                            <Select
                                value={customerForm.customerVisibleTabs[0]} // Simplified for single select in prototype
                                onValueChange={(val) => setCustomerForm({ ...customerForm, customerVisibleTabs: [val] })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select tabs" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Required fields for registration (customers area)</Label>
                            <Select>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="First Name - Contact, Last Name - Contact, Email Address - Contact, Company - Company" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default Fields</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "customerCompanyFieldRequired", label: "Company field is required?" },
                                { key: "customerCompanyVatRequired", label: "Company requires the usage of the VAT Number field" },
                                { key: "customerAllowRegistration", label: "Allow customers to register" },
                                { key: "customerRequiresRegistrationConfirmation", label: "Require registration confirmation from administrator after customer register" },
                                { key: "customerAllowPrimaryContactManageContacts", label: "Allow primary contact to manage other customer contacts" },
                                { key: "customerEnableHoneypot", label: "Enable Honeypot spam validation" },
                                { key: "customerAllowPrimaryContactViewBilling", label: "Allow primary contact to view/edit billing & shipping details" },
                                { key: "customerContactsSeeOwnFilesOnly", label: "Contacts see only own files uploaded in customer area (files uploaded in customer profile)", help: true },
                                { key: "customerAllowContactsDeleteOwnFiles", label: "Allow contacts to delete own files uploaded from customers area" },
                                { key: "customerUseKnowledgeBase", label: "Use Knowledge Base", help: true },
                                { key: "customerAllowKnowledgeBaseWithoutRegistration", label: "Allow knowledge base to be viewed without registration" },
                            ].map((item: any) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={customerForm[item.key as keyof typeof customerForm] ? "yes" : "no"}
                                        onValueChange={(val) => setCustomerForm({ ...customerForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`cust-${item.key}-yes`} />
                                            <Label htmlFor={`cust-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`cust-${item.key}-no`} />
                                            <Label htmlFor={`cust-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Label>Show Estimate request link in customers area?</Label>
                            <Select
                                value={customerForm.customerShowEstimateRequestLink ? "yes" : "no"}
                                // Simplified mapping for boolean
                                onValueChange={(val) => setCustomerForm({ ...customerForm, customerShowEstimateRequestLink: val === "yes" })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Estimate Request</SelectItem>
                                    <SelectItem value="no">Hide</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-2 block">Default contact permissions</Label>
                            <div className="space-y-2">
                                {["Invoices", "Estimates", "Contracts", "Proposals", "Support", "Projects"].map((perm) => (
                                    <div key={perm} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`perm-${perm}`}
                                            checked={customerForm.customerDefaultContactPermissions.includes(perm.toLowerCase())}
                                            onCheckedChange={(checked: boolean) => {
                                                const permKey = perm.toLowerCase();
                                                if (checked) {
                                                    setCustomerForm({ ...customerForm, customerDefaultContactPermissions: [...customerForm.customerDefaultContactPermissions, permKey] })
                                                } else {
                                                    setCustomerForm({ ...customerForm, customerDefaultContactPermissions: customerForm.customerDefaultContactPermissions.filter(p => p !== permKey) })
                                                }
                                            }}
                                        />
                                        <Label htmlFor={`perm-${perm}`} className="font-normal cursor-pointer select-none">{perm}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>


                        <div>
                            <Label className="mb-2 block flex items-center gap-2">
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                                Customer Information Format (PDF and HTML)
                            </Label>
                            <Textarea
                                value={customerForm.customerInfoFormat}
                                onChange={e => setCustomerForm({ ...customerForm, customerInfoFormat: e.target.value })}
                                className="h-32 font-mono text-sm"
                            />
                            <div className="mt-2 text-sm text-blue-500 space-x-2">
                                <span>{`{company_name}`}</span>
                                <span>{`{customer_id}`}</span>
                                <span>{`{street}`}</span>
                                <span>{`{city}`}</span>
                                <span>{`{state}`}</span>
                                <span>{`{zip_code}`}</span>
                                <span>{`{country_code}`}</span>
                                <span>{`{country_name}`}</span>
                                <span>{`{phone}`}</span>
                                <span>{`{vat_number}`}</span>
                                <span>{`{vat_number_with_label}`}</span>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveCustomerSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }


        if (activeSection === "tasks") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Tasks</h2>
                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div>
                            <Label>Limit tasks kanban rows per status</Label>
                            <Input
                                type="number"
                                value={tasksForm.tasksKanbanLimit}
                                onChange={e => setTasksForm({ ...tasksForm, tasksKanbanLimit: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "tasksAllowStaffViewAllProjectTasks", label: "Allow all staff to see all tasks related to projects (includes non-staff)" },
                                { key: "tasksAllowEditCommentsFirstHourOnly", label: "Allow customer/staff to add/edit task comments only in the first hour (administrators not applied)" },
                                { key: "tasksAutoAssignCreator", label: "Auto assign task creator when new task is created", help: true },
                                { key: "tasksAutoAddCreatorAsFollower", label: "Auto add task creator as task follower when new task is created" },
                                { key: "tasksStopOtherTimers", label: "Stop all other started timers when starting new timer" },
                                { key: "tasksAutoStartTimer", label: "Change task status to In Progress on timer started (valid only if task status is Not Started)" },
                                { key: "tasksBillableDefault", label: "Billable option is by default checked when new task is created? (only from admin area)" },
                            ].map((item: any) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={tasksForm[item.key as keyof typeof tasksForm] ? "yes" : "no"}
                                        onValueChange={(val) => setTasksForm({ ...tasksForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`task-${item.key}-yes`} />
                                            <Label htmlFor={`task-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`task-${item.key}-no`} />
                                            <Label htmlFor={`task-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Label>Round off task timer</Label>
                            <Select
                                value={tasksForm.tasksTimerRoundOff}
                                onValueChange={(val) => setTasksForm({ ...tasksForm, tasksTimerRoundOff: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no_round">Don't round off</SelectItem>
                                    <SelectItem value="round_up">Round up</SelectItem>
                                    <SelectItem value="round_down">Round down</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span>multiplies of</span>
                            <Select
                                value={tasksForm.tasksTimerRoundOffMultiples}
                                onValueChange={(val) => setTasksForm({ ...tasksForm, tasksTimerRoundOffMultiples: val })}
                            >
                                <SelectTrigger className="w-24">
                                    <SelectValue placeholder="5" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                    <SelectItem value="45">45</SelectItem>
                                    <SelectItem value="60">60</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>minutes</span>
                        </div>

                        <p className="text-sm text-gray-500">Applied to the Timesheets overview report and when invoicing a task/project.</p>

                        <hr className="border-gray-100 my-4" />

                        <div>
                            <Label>Default status when new task is created</Label>
                            <Select
                                value={tasksForm.tasksDefaultStatus}
                                onValueChange={(val) => setTasksForm({ ...tasksForm, tasksDefaultStatus: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not_started">Not Started</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Default Priority</Label>
                            <Select
                                value={tasksForm.tasksDefaultPriority}
                                onValueChange={(val) => setTasksForm({ ...tasksForm, tasksDefaultPriority: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Modal Width Class (modal-lg, modal-xl, modal-xxl)</Label>
                            <Input
                                value={tasksForm.tasksModalWidth}
                                onChange={e => setTasksForm({ ...tasksForm, tasksModalWidth: e.target.value })}
                                className="mt-1"
                            />
                        </div>


                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveTasksSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "support") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Support</h2>

                    <div className="bg-white p-6 rounded-lg border">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                                <TabsTrigger
                                    value="general"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                                >
                                    General
                                </TabsTrigger>
                                <TabsTrigger
                                    value="email_piping"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                                >
                                    Email Piping
                                </TabsTrigger>
                                <TabsTrigger
                                    value="ticket_form"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                                >
                                    Ticket Form
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-6">

                                <div className="space-y-6">
                                    {[
                                        { key: "supportUseServices", label: "Use services" },
                                        { key: "supportDisablePublicUrl", label: "Disable Ticket Public URL" },
                                        { key: "supportStaffLimitToAssignedDepartments", label: "Allow staff to access only ticket that belongs to staff departments" },
                                        { key: "supportStaffNotificationAssignedOnly", label: "Send staff-related ticket notifications to the ticket assignee only", help: true },
                                        { key: "supportNotifyOnNewTicket", label: "Receive notification on new ticket opened", help: true },
                                        { key: "supportNotifyOnCustomerReply", label: "Receive notification when customer reply to a ticket", help: true },
                                        { key: "supportStaffOpenTicketsAllContacts", label: "Allow staff members to open tickets to all contacts", help: true },
                                        { key: "supportAutoAssignFirstReplyStaff", label: "Automatically assign the ticket to the first staff that post a reply" },
                                        { key: "supportAllowNonStaffAccess", label: "Allow access to tickets for non staff members" },
                                        { key: "supportAllowNonAdminDeleteAttachments", label: "Allow non-admin staff members to delete ticket attachments" },
                                        { key: "supportAllowNonAdminDeleteTickets", label: "Allow non-admin staff members to delete tickets and replies" },
                                        { key: "supportAllowCustomerChangeStatus", label: "Allow customer to change ticket status from customers area" },
                                        { key: "supportCustomerShowContactTicketsOnly", label: "In customers area only show tickets related to the logged in contact (Primary contact not applied)" },
                                    ].map((item: any) => (
                                        <div key={item.key}>
                                            <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                                {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                                {item.label}
                                            </Label>
                                            <RadioGroup
                                                value={supportForm[item.key as keyof typeof supportForm] ? "yes" : "no"}
                                                onValueChange={(val) => setSupportForm({ ...supportForm, [item.key]: val === "yes" })}
                                                className="flex gap-4"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="yes" id={`supp-${item.key}-yes`} />
                                                    <Label htmlFor={`supp-${item.key}-yes`} className="font-normal">Yes</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="no" id={`supp-${item.key}-no`} />
                                                    <Label htmlFor={`supp-${item.key}-no`} className="font-normal">No</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4 text-gray-400" />
                                        Ticket Replies Order
                                    </Label>
                                    <RadioGroup
                                        value={supportForm.supportTicketReplyOrder}
                                        onValueChange={(val) => setSupportForm({ ...supportForm, supportTicketReplyOrder: val })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="asc" id="rep-asc" />
                                            <Label htmlFor="rep-asc" className="font-normal">Ascending</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="desc" id="rep-desc" />
                                            <Label htmlFor="rep-desc" className="font-normal">Descending</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">Enable support menu item badge</Label>
                                    <RadioGroup
                                        value={supportForm.supportEnableBadge ? "yes" : "no"}
                                        onValueChange={(val) => setSupportForm({ ...supportForm, supportEnableBadge: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="badge-yes" />
                                            <Label htmlFor="badge-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="badge-no" />
                                            <Label htmlFor="badge-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label>Default status selected when replying to ticket</Label>
                                    <Select
                                        value={supportForm.supportDefaultReplyStatus}
                                        onValueChange={(val) => setSupportForm({ ...supportForm, supportDefaultReplyStatus: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="answered">Answered</SelectItem>
                                            <SelectItem value="hold">On Hold</SelectItem>
                                            <SelectItem value="closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Maximum ticket attachments</Label>
                                    <Input
                                        type="number"
                                        value={supportForm.supportMaxAttachments}
                                        onChange={e => setSupportForm({ ...supportForm, supportMaxAttachments: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Allowed attachments file extensions</Label>
                                    <Input
                                        value={supportForm.supportAllowedExtensions}
                                        onChange={e => setSupportForm({ ...supportForm, supportAllowedExtensions: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                            </TabsContent>

                            <TabsContent value="email_piping">
                                <div className="text-center py-8 text-gray-500">Email Piping Settings (Coming Soon)</div>
                            </TabsContent>

                            <TabsContent value="ticket_form">
                                <div className="text-center py-8 text-gray-500">Ticket Form Settings (Coming Soon)</div>
                            </TabsContent>

                        </Tabs>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveSupportSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "leads") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Leads</h2>

                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div>
                            <Label>Limit leads kanban rows per status</Label>
                            <Input
                                type="number"
                                value={leadsForm.leadsKanbanLimit}
                                onChange={e => setLeadsForm({ ...leadsForm, leadsKanbanLimit: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>Default status</Label>
                            <Select
                                value={leadsForm.leadsDefaultStatus}
                                onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsDefaultStatus: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mql">MQL</SelectItem>
                                    <SelectItem value="sql">SQL</SelectItem>
                                    <SelectItem value="client">Client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Default source</Label>
                            <Select
                                value={leadsForm.leadsDefaultSource}
                                onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsDefaultSource: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="facebook">Facebook</SelectItem>
                                    <SelectItem value="google">Google</SelectItem>
                                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                                    <SelectItem value="referral">Referral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Perform validation for duplicate lead on the following fields:</Label>
                            <Select
                                value={leadsForm.leadsDuplicateValidationFields}
                                onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsDuplicateValidationFields: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email">Email Address</SelectItem>
                                    <SelectItem value="phone">Phone Number</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-6">
                            {[
                                { key: "leadsAutoAssignAdminAfterConvert", label: "Auto assign as admin to customer after convert", help: true },
                                { key: "leadsAllowNonAdminImport", label: "Allow non-admin staff members to import leads" },
                            ].map((item: any) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={leadsForm[item.key as keyof typeof leadsForm] ? "yes" : "no"}
                                        onValueChange={(val) => setLeadsForm({ ...leadsForm, [item.key]: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`lead-${item.key}-yes`} />
                                            <Label htmlFor={`lead-${item.key}-yes`} className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`lead-${item.key}-no`} />
                                            <Label htmlFor={`lead-${item.key}-no`} className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Default leads kanban sort</Label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Select
                                        value={leadsForm.leadsKanbanSort}
                                        onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsKanbanSort: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kanban_order">Kanban Order</SelectItem>
                                            <SelectItem value="name">Name</SelectItem>
                                            <SelectItem value="date_created">Date Created</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <RadioGroup
                                    value={leadsForm.leadsKanbanSortOrder}
                                    onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsKanbanSortOrder: val })}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="asc" id="l-sort-asc" />
                                        <Label htmlFor="l-sort-asc" className="font-normal">Ascending</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="desc" id="l-sort-desc" />
                                        <Label htmlFor="l-sort-desc" className="font-normal">Descending</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">Do not allow leads to be edited after they are converted to customers (administrators not applied)</Label>
                            <RadioGroup
                                value={leadsForm.leadsDisableEditAfterConvert ? "yes" : "no"}
                                onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsDisableEditAfterConvert: val === "yes" })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="l-noedit-yes" />
                                    <Label htmlFor="l-noedit-yes" className="font-normal">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="l-noedit-no" />
                                    <Label htmlFor="l-noedit-no" className="font-normal">No</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label>Modal Width Class (modal-lg, modal-xl, modal-xxl)</Label>
                            <Input
                                value={leadsForm.leadsModalWidth}
                                onChange={e => setLeadsForm({ ...leadsForm, leadsModalWidth: e.target.value })}
                                className="mt-1"
                            />
                        </div>


                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveLeadsSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "calendar") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Calendar</h2>

                    <div className="bg-white p-6 rounded-lg border space-y-6">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="styling">Styling</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-6 mt-6">
                                <div>
                                    <Label>Calendar Events Limit (Month and Week View)</Label>
                                    <Input
                                        type="number"
                                        value={calendarForm.calendarEventsLimit}
                                        onChange={e => setCalendarForm({ ...calendarForm, calendarEventsLimit: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Default View</Label>
                                    <Select
                                        value={calendarForm.calendarDefaultView}
                                        onValueChange={(val) => setCalendarForm({ ...calendarForm, calendarDefaultView: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dayGridMonth">Month</SelectItem>
                                            <SelectItem value="timeGridWeek">Week</SelectItem>
                                            <SelectItem value="timeGridDay">Day</SelectItem>
                                            <SelectItem value="listWeek">Agenda Week</SelectItem>
                                            <SelectItem value="listDay">Agenda Day</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>First Day</Label>
                                    <Select
                                        value={calendarForm.calendarFirstDay}
                                        onValueChange={(val) => setCalendarForm({ ...calendarForm, calendarFirstDay: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">Sunday</SelectItem>
                                            <SelectItem value="1">Monday</SelectItem>
                                            <SelectItem value="2">Tuesday</SelectItem>
                                            <SelectItem value="3">Wednesday</SelectItem>
                                            <SelectItem value="4">Thursday</SelectItem>
                                            <SelectItem value="5">Friday</SelectItem>
                                            <SelectItem value="6">Saturday</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-4">Show on Calendar</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { key: "calendarShowHideNotifiedReminders", label: "Hide notified reminders from calendar" },
                                            { key: "calendarShowTicketReminders", label: "Ticket Reminders" },
                                            { key: "calendarShowLeadReminders", label: "Lead Reminders" },
                                            { key: "calendarShowInvoices", label: "Invoices" },
                                            { key: "calendarShowCustomerReminders", label: "Customer Reminders" },
                                            { key: "calendarShowEstimates", label: "Estimates" },
                                            { key: "calendarShowEstimateReminders", label: "Estimate Reminders" },
                                            { key: "calendarShowProposals", label: "Proposals" },
                                            { key: "calendarShowProposalReminders", label: "Proposal Reminders" },
                                            { key: "calendarShowContracts", label: "Contracts" },
                                            { key: "calendarShowInvoiceReminders", label: "Invoice Reminders" },
                                            { key: "calendarShowTasks", label: "Tasks" },
                                            { key: "calendarShowTasksStaffOnly", label: "Show only tasks assigned to the logged in staff member" },
                                            { key: "calendarShowExpenseReminders", label: "Expense Reminders" },
                                            { key: "calendarShowProjects", label: "Projects" },
                                            { key: "calendarShowTaskReminders", label: "Task Reminders" },
                                            { key: "calendarShowCreditNoteReminders", label: "Credit Note Reminders" },
                                        ].map((item) => (
                                            <div key={item.key}>
                                                <Label className="mb-2 block text-sm font-medium text-gray-700">
                                                    {item.label}
                                                </Label>
                                                <RadioGroup
                                                    value={calendarForm[item.key as keyof typeof calendarForm] ? "yes" : "no"}
                                                    onValueChange={(val) => setCalendarForm({ ...calendarForm, [item.key]: val === "yes" })}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="yes" id={`cal-${item.key}-yes`} />
                                                        <Label htmlFor={`cal-${item.key}-yes`} className="font-normal">Yes</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="no" id={`cal-${item.key}-no`} />
                                                        <Label htmlFor={`cal-${item.key}-no`} className="font-normal">No</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="styling" className="space-y-6 mt-6">
                                {[
                                    { key: "calendarInvoiceColor", label: "Invoice Color" },
                                    { key: "calendarEstimateColor", label: "Estimate Color" },
                                    { key: "calendarProposalColor", label: "Proposal Color" },
                                    { key: "calendarReminderColor", label: "Reminder Color" },
                                    { key: "calendarContractColor", label: "Contract Color" },
                                    { key: "calendarProjectColor", label: "Project Color" },
                                ].map((item) => (
                                    <div key={item.key}>
                                        <Label>{item.label}</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                value={calendarForm[item.key as keyof typeof calendarForm] as string}
                                                onChange={e => setCalendarForm({ ...calendarForm, [item.key]: e.target.value })}
                                                className="flex-1"
                                            />
                                            <div
                                                className="w-10 h-10 rounded border shrink-0"
                                                style={{ backgroundColor: calendarForm[item.key as keyof typeof calendarForm] as string }}
                                            />
                                            <Input
                                                type="color"
                                                value={calendarForm[item.key as keyof typeof calendarForm] as string}
                                                onChange={e => setCalendarForm({ ...calendarForm, [item.key]: e.target.value })}
                                                className="w-12 p-1 h-10"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveCalendarSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "pdf") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">PDF</h2>

                    <div className="bg-white p-6 rounded-lg border space-y-6">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="signature">Signature</TabsTrigger>
                                <TabsTrigger value="formats">Document formats</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-6 mt-6">
                                <div>
                                    <Label>PDF Font</Label>
                                    <Select
                                        value={pdfForm.pdfFont}
                                        onValueChange={(val) => setPdfForm({ ...pdfForm, pdfFont: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="freesans">freesans</SelectItem>
                                            <SelectItem value="alef">alef</SelectItem>
                                            <SelectItem value="dejavu">dejavu</SelectItem>
                                            <SelectItem value="roboto">roboto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                                        Swap Company/Customer Details (company details to right side, customer details to left side)
                                    </Label>
                                    <RadioGroup
                                        value={pdfForm.pdfSwapDetails ? "yes" : "no"}
                                        onValueChange={(val) => setPdfForm({ ...pdfForm, pdfSwapDetails: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="pdfSwapDetails-yes" />
                                            <Label htmlFor="pdfSwapDetails-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="pdfSwapDetails-no" />
                                            <Label htmlFor="pdfSwapDetails-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label>Default font size</Label>
                                    <Input
                                        type="number"
                                        value={pdfForm.pdfFontSize}
                                        onChange={e => setPdfForm({ ...pdfForm, pdfFontSize: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Items table heading color</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                value={pdfForm.pdfTableHeadingColor}
                                                onChange={e => setPdfForm({ ...pdfForm, pdfTableHeadingColor: e.target.value })}
                                                className="flex-1"
                                            />
                                            <div
                                                className="w-10 h-10 rounded border shrink-0"
                                                style={{ backgroundColor: pdfForm.pdfTableHeadingColor }}
                                            />
                                            <Input
                                                type="color"
                                                value={pdfForm.pdfTableHeadingColor}
                                                onChange={e => setPdfForm({ ...pdfForm, pdfTableHeadingColor: e.target.value })}
                                                className="w-12 p-1 h-10"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Items table heading text color</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                value={pdfForm.pdfTableHeadingTextColor}
                                                onChange={e => setPdfForm({ ...pdfForm, pdfTableHeadingTextColor: e.target.value })}
                                                className="flex-1"
                                            />
                                            <div
                                                className="w-10 h-10 rounded border shrink-0"
                                                style={{ backgroundColor: pdfForm.pdfTableHeadingTextColor }}
                                            />
                                            <Input
                                                type="color"
                                                value={pdfForm.pdfTableHeadingTextColor}
                                                onChange={e => setPdfForm({ ...pdfForm, pdfTableHeadingTextColor: e.target.value })}
                                                className="w-12 p-1 h-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label>Custom PDF Company Logo URL</Label>
                                    <Input
                                        value={pdfForm.pdfLogoUrl}
                                        onChange={e => setPdfForm({ ...pdfForm, pdfLogoUrl: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Logo Width (PX)</Label>
                                    <Input
                                        type="number"
                                        value={pdfForm.pdfLogoWidth}
                                        onChange={e => setPdfForm({ ...pdfForm, pdfLogoWidth: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { key: "pdfShowStatus", label: "Show Invoice/Estimate/Credit Note status on PDF documents" },
                                        { key: "pdfShowLink", label: "Show Pay Invoice link to PDF (Not applied if invoice status is Cancelled)" },
                                        { key: "pdfShowPayments", label: "Show invoice payments (transactions) on PDF" },
                                        { key: "pdfShowPageNumber", label: "Show page number on PDF" },
                                    ].map((item) => (
                                        <div key={item.key}>
                                            <Label className="mb-2 block text-sm font-medium text-gray-700">
                                                {item.label}
                                            </Label>
                                            <RadioGroup
                                                value={pdfForm[item.key as keyof typeof pdfForm] ? "yes" : "no"}
                                                onValueChange={(val) => setPdfForm({ ...pdfForm, [item.key]: val === "yes" })}
                                                className="flex gap-4"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="yes" id={`pdf-${item.key}-yes`} />
                                                    <Label htmlFor={`pdf-${item.key}-yes`} className="font-normal">Yes</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="no" id={`pdf-${item.key}-no`} />
                                                    <Label htmlFor={`pdf-${item.key}-no`} className="font-normal">No</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="signature" className="space-y-6 mt-6">
                                <div className="space-y-6">
                                    {[
                                        { key: "pdfShowSignatureInvoice", label: "Show PDF Signature on Invoice" },
                                        { key: "pdfShowSignatureEstimate", label: "Show PDF Signature on Estimate" },
                                        { key: "pdfShowSignatureCreditNote", label: "Show PDF Signature on Credit Note" },
                                        { key: "pdfShowSignatureContract", label: "Show PDF Signature on Contract" },
                                        { key: "pdfShowSignatureProposal", label: "Show PDF Signature on Proposal" },
                                    ].map((item) => (
                                        <div key={item.key}>
                                            <Label className="mb-2 block text-sm font-medium text-gray-700">
                                                {item.label}
                                            </Label>
                                            <RadioGroup
                                                value={pdfForm[item.key as keyof typeof pdfForm] ? "yes" : "no"}
                                                onValueChange={(val) => setPdfForm({ ...pdfForm, [item.key]: val === "yes" })}
                                                className="flex gap-4"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="yes" id={`pdf-${item.key}-yes`} />
                                                    <Label htmlFor={`pdf-${item.key}-yes`} className="font-normal">Yes</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="no" id={`pdf-${item.key}-no`} />
                                                    <Label htmlFor={`pdf-${item.key}-no`} className="font-normal">No</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    ))}

                                    <div>
                                        <Label>Signature Image</Label>
                                        <div className="mt-1 flex gap-2">
                                            <Input
                                                type="text"
                                                placeholder="Image URL or Path"
                                                value={pdfForm.pdfSignatureImage}
                                                onChange={e => setPdfForm({ ...pdfForm, pdfSignatureImage: e.target.value })}
                                            />
                                            {/* File upload would require more logic, sticking to text input for now as per other image fields */}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Please enter the URL of the signature image.</p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="formats" className="space-y-6 mt-6">
                                {[
                                    { key: "pdfFormatInvoice", label: "Invoice" },
                                    { key: "pdfFormatEstimate", label: "Estimate" },
                                    { key: "pdfFormatProposal", label: "Proposal" },
                                    { key: "pdfFormatPayment", label: "Payment" },
                                    { key: "pdfFormatCreditNote", label: "Credit Note" },
                                    { key: "pdfFormatContract", label: "Contract" },
                                    { key: "pdfFormatStatement", label: "Statement" },
                                ].map((item) => (
                                    <div key={item.key}>
                                        <Label>{item.label}</Label>
                                        <Select
                                            value={pdfForm[item.key as keyof typeof pdfForm] as string}
                                            onValueChange={(val) => setPdfForm({ ...pdfForm, [item.key]: val })}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="A4 Portrait">A4 Portrait</SelectItem>
                                                <SelectItem value="A4 Landscape">A4 Landscape</SelectItem>
                                                <SelectItem value="Letter Portrait">Letter Portrait</SelectItem>
                                                <SelectItem value="Letter Landscape">Letter Landscape</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSavePdfSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "e-sign") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">E-Sign</h2>

                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div>
                            <h3 className="text-lg font-medium mb-4">Proposal</h3>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">
                                Require digital signature and identity confirmation on accept
                            </Label>
                            <RadioGroup
                                value={esignForm.esignProposalRequireSignature ? "yes" : "no"}
                                onValueChange={(val) => setEsignForm({ ...esignForm, esignProposalRequireSignature: val === "yes" })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="esignProposalRequireSignature-yes" />
                                    <Label htmlFor="esignProposalRequireSignature-yes" className="font-normal">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="esignProposalRequireSignature-no" />
                                    <Label htmlFor="esignProposalRequireSignature-no" className="font-normal">No</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-4">Estimate</h3>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">
                                Require digital signature and identity confirmation on accept
                            </Label>
                            <RadioGroup
                                value={esignForm.esignEstimateRequireSignature ? "yes" : "no"}
                                onValueChange={(val) => setEsignForm({ ...esignForm, esignEstimateRequireSignature: val === "yes" })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="esignEstimateRequireSignature-yes" />
                                    <Label htmlFor="esignEstimateRequireSignature-yes" className="font-normal">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="esignEstimateRequireSignature-no" />
                                    <Label htmlFor="esignEstimateRequireSignature-no" className="font-normal">No</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label>Legal Bound Text</Label>
                            <Textarea
                                value={esignForm.esignLegalBoundText}
                                onChange={e => setEsignForm({ ...esignForm, esignLegalBoundText: e.target.value })}
                                className="mt-1 h-24"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveEsignSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "misc") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Misc</h2>

                    <div className="bg-white p-6 rounded-lg border space-y-6">
                        <Tabs defaultValue="misc" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                                <TabsTrigger value="misc">Misc</TabsTrigger>
                                <TabsTrigger value="tables">Tables</TabsTrigger>
                                <TabsTrigger value="inline-create">Inline Create</TabsTrigger>
                            </TabsList>

                            <TabsContent value="misc" className="space-y-6 mt-6">
                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                                        Require client to be logged in to view contract
                                    </Label>
                                    <RadioGroup
                                        value={miscForm.miscRequireLoginForContract ? "yes" : "no"}
                                        onValueChange={(val) => setMiscForm({ ...miscForm, miscRequireLoginForContract: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="miscRequireLoginForContract-yes" />
                                            <Label htmlFor="miscRequireLoginForContract-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="miscRequireLoginForContract-no" />
                                            <Label htmlFor="miscRequireLoginForContract-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label>Dropbox APP Key</Label>
                                    <Input
                                        value={miscForm.miscDropboxAppKey}
                                        onChange={e => setMiscForm({ ...miscForm, miscDropboxAppKey: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Max file size upload in Media (MB)</Label>
                                    <Input
                                        type="number"
                                        value={miscForm.miscMaxFileSizeMedia}
                                        onChange={e => setMiscForm({ ...miscForm, miscMaxFileSizeMedia: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <HelpCircle className="h-4 w-4 text-gray-400" />
                                        <Label>Maximum files upload on post</Label>
                                    </div>
                                    <Input
                                        type="number"
                                        value={miscForm.miscMaxFileUploadsPost}
                                        onChange={e => setMiscForm({ ...miscForm, miscMaxFileUploadsPost: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>Limit Top Search Bar Results to</Label>
                                    <Input
                                        type="number"
                                        value={miscForm.miscLimitTopSearchBarResults}
                                        onChange={e => setMiscForm({ ...miscForm, miscLimitTopSearchBarResults: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Default Staff Role</Label>
                                    <Select
                                        value={miscForm.miscDefaultStaffRole}
                                        onValueChange={(val) => setMiscForm({ ...miscForm, miscDefaultStaffRole: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="employee">Employee</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Delete system activity log older then X months</Label>
                                    <Input
                                        type="number"
                                        value={miscForm.miscDeleteActivityLogOlderThan}
                                        onChange={e => setMiscForm({ ...miscForm, miscDeleteActivityLogOlderThan: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                {[
                                    { key: "miscShowSetupMenuHover", label: "Show setup menu item only when hover with mouse on main sidebar area" },
                                    { key: "miscShowHelpMenu", label: "Show help menu item on setup menu" },
                                    { key: "miscUseMinified", label: "Use minified files version for css and js (only system files)" },
                                ].map((item) => (
                                    <div key={item.key}>
                                        <Label className="mb-2 block text-sm font-medium text-gray-700">
                                            {item.label}
                                        </Label>
                                        <RadioGroup
                                            value={miscForm[item.key as keyof typeof miscForm] ? "yes" : "no"}
                                            onValueChange={(val) => setMiscForm({ ...miscForm, [item.key]: val === "yes" })}
                                            className="flex gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id={`misc-${item.key}-yes`} />
                                                <Label htmlFor={`misc-${item.key}-yes`} className="font-normal">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id={`misc-${item.key}-no`} />
                                                <Label htmlFor={`misc-${item.key}-no`} className="font-normal">No</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                ))}
                            </TabsContent>

                            <TabsContent value="tables" className="space-y-6 mt-6">
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <HelpCircle className="h-4 w-4 text-gray-400" />
                                        <Label className="block text-sm font-medium text-gray-700">
                                            Save last order for tables
                                        </Label>
                                    </div>
                                    <RadioGroup
                                        value={miscForm.miscSaveLastTableOrder ? "yes" : "no"}
                                        onValueChange={(val) => setMiscForm({ ...miscForm, miscSaveLastTableOrder: val === "yes" })}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="miscSaveLastTableOrder-yes" />
                                            <Label htmlFor="miscSaveLastTableOrder-yes" className="font-normal">Yes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="miscSaveLastTableOrder-no" />
                                            <Label htmlFor="miscSaveLastTableOrder-no" className="font-normal">No</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                                        Show table export button
                                    </Label>
                                    <RadioGroup
                                        value={miscForm.miscShowTableExportButton}
                                        onValueChange={(val) => setMiscForm({ ...miscForm, miscShowTableExportButton: val })}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all" id="export-all" />
                                            <Label htmlFor="export-all" className="font-normal">To all staff members</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="admin" id="export-admin" />
                                            <Label htmlFor="export-admin" className="font-normal">Only to administrators</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="hide" id="export-hide" />
                                            <Label htmlFor="export-hide" className="font-normal">Hide export button for all staff members</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label>Tables Pagination Limit</Label>
                                    <Input
                                        type="number"
                                        value={miscForm.miscTablesPaginationLimit}
                                        onChange={e => setMiscForm({ ...miscForm, miscTablesPaginationLimit: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="inline-create" className="space-y-6 mt-6">
                                {[
                                    { key: "miscAllowNonAdminCreateLeadStatus", label: "Allow non-admin staff members to create Lead Status in Lead create/edit area?" },
                                    { key: "miscAllowNonAdminCreateLeadSource", label: "Allow non-admin staff members to create Lead Source in Lead create/edit area?" },
                                    { key: "miscAllowNonAdminCreateCustomerGroup", label: "Allow non-admin staff members to create Customer Group in Customer create/edit area?" },
                                    { key: "miscAllowNonAdminCreateService", label: "Allow non-admin staff members to create Service in Ticket create/edit area?" },
                                    { key: "miscAllowNonAdminSavePredefinedReplies", label: "Allow non-admin staff members to save predefined replies from ticket message" },
                                    { key: "miscAllowNonAdminCreateContractType", label: "Allow non-admin staff members to create Contract type in Contract create/edit area?" },
                                    { key: "miscAllowNonAdminCreateExpenseCategory", label: "Allow non-admin staff members to create Expense Category in Expense create/edit area?" },
                                ].map((item) => (
                                    <div key={item.key}>
                                        <Label className="mb-2 block text-sm font-medium text-gray-700">
                                            {item.label}
                                        </Label>
                                        <RadioGroup
                                            value={miscForm[item.key as keyof typeof miscForm] ? "yes" : "no"}
                                            onValueChange={(val) => setMiscForm({ ...miscForm, [item.key]: val === "yes" })}
                                            className="flex gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id={`misc-${item.key}-yes`} />
                                                <Label htmlFor={`misc-${item.key}-yes`} className="font-normal">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id={`misc-${item.key}-no`} />
                                                <Label htmlFor={`misc-${item.key}-no`} className="font-normal">No</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>

                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveMiscSettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "openai") {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">OpenAI</h2>

                    <div className="bg-white p-6 rounded-lg border space-y-6">

                        <div>
                            <Label>OpenAI API Key</Label>
                            <div className="mt-1">
                                <Input
                                    type="password"
                                    value={openaiForm.openaiApiKey}
                                    onChange={e => setOpenaiForm({ ...openaiForm, openaiApiKey: e.target.value })}
                                    placeholder="sk-..."
                                />
                            </div>
                        </div>

                        <div>
                            <Label>OpenAI Model</Label>
                            <Select
                                value={openaiForm.openaiModel}
                                onValueChange={(val) => setOpenaiForm({ ...openaiForm, openaiModel: val })}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Max Output Tokens</Label>
                            <Input
                                type="number"
                                value={openaiForm.openaiMaxTokens}
                                onChange={e => setOpenaiForm({ ...openaiForm, openaiMaxTokens: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div className="pt-4">
                            <h3 className="text-lg font-medium mb-2">Advanced Features</h3>
                            <div className="flex items-center gap-4">
                                <Button className="bg-gray-900 text-white hover:bg-gray-800 gap-2">
                                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.49933 0.25C3.49635 0.25 0.25 3.49593 0.25 7.50024C0.25 11.5046 3.49635 14.75 7.49933 14.75C11.5023 14.75 14.75 11.5046 14.75 7.50024C14.75 3.49593 11.5023 0.25 7.49933 0.25ZM7.49933 1.75C10.674 1.75 13.25 4.32563 13.25 7.50024C13.25 10.6749 10.674 13.25 7.49933 13.25C4.32468 13.25 1.75 10.6749 1.75 7.50024C1.75 4.32563 4.32468 1.75 7.49933 1.75ZM6.82529 10.5002H8.17336V6.00024H6.82529V10.5002ZM6.82529 5.25024H8.17336V3.75024H6.82529V5.25024Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                    OpenAI Fine-Tuning
                                </Button>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">Fine-tune OpenAI models with your knowledge base and predefined replies content for more accurate responses.</p>
                        </div>


                        <div className="pt-4 flex justify-end">
                            <Button
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                onClick={handleSaveOpenAISettings}
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeSection === "email") {
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Email</h2>
                        <Button variant="outline">Share details</Button>
                    </div>

                    <Tabs value={activeEmailTab} onValueChange={setActiveEmailTab}>
                        <TabsList>
                            <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
                            <TabsTrigger value="queue">Email Queue</TabsTrigger>
                        </TabsList>

                        <TabsContent value="smtp" className="space-y-6 mt-6">
                            <div>
                                <h3 className="text-lg font-medium mb-4">SMTP Settings <span className="text-sm text-gray-500">Setup main email</span></h3>

                                <div className="space-y-4">
                                    <div>
                                        <Label>Mail Engine</Label>
                                        <RadioGroup defaultValue="phpmailer" className="flex gap-4 mt-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="phpmailer" id="phpmailer" />
                                                <Label htmlFor="phpmailer">PHPMailer</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="codeigniter" id="codeigniter" />
                                                <Label htmlFor="codeigniter">CodeIgniter</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                        <p className="text-sm text-yellow-900">
                                            The "mail" protocol is not the recommended protocol to send emails, you should strongly consider configuring the "SMTP" protocol to avoid any disruptions and delivery issues.
                                        </p>
                                    </div>

                                    <div>
                                        <Label>Email Protocol</Label>
                                        <RadioGroup defaultValue="mail" className="flex flex-wrap gap-4 mt-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="smtp" id="smtp" />
                                                <Label htmlFor="smtp">SMTP</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="oauth2" id="oauth2" />
                                                <Label htmlFor="oauth2">Microsoft OAuth 2.0</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="gmail" id="gmail" />
                                                <Label htmlFor="gmail">Gmail OAuth 2.0</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="sendmail" id="sendmail" />
                                                <Label htmlFor="sendmail">Sendmail</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="mail" id="mail" />
                                                <Label htmlFor="mail">Mail</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div>
                                        <Label>Email</Label>
                                        <Input defaultValue="dev@wasiladev.com" />
                                    </div>

                                    <div>
                                        <Label>Email Charset</Label>
                                        <Input defaultValue="utf-8" />
                                    </div>

                                    <div>
                                        <Label>BCC All Emails To</Label>
                                        <Input placeholder="BCC email address" />
                                    </div>

                                    <div>
                                        <Label>Email Signature</Label>
                                        <Textarea defaultValue="WasilaDev Team" className="min-h-[100px]" />
                                    </div>

                                    <div>
                                        <Label>Predefined Header</Label>
                                        <Textarea
                                            className="min-h-[150px] font-mono text-xs"
                                            defaultValue={`<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<style>
body {
  background-color: #f6f6f6;
  font-family: sans-serif;
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
  padding: 0;
  -ms-text-size-adjust: 100%;`}
                                        />
                                    </div>

                                    <div>
                                        <Label>Predefined Footer</Label>
                                        <Textarea
                                            className="min-h-[150px] font-mono text-xs"
                                            defaultValue={`</tr>
</table>
</td>
</tr>
<!-- END MAIN CONTENT AREA →
</table>
<!-- START FOOTER →
<div class="footer">
<table border="0" cellpadding="0" cellspacing="0">
<tr>
<td class="content-block">
<span>{companyname}</span>`}
                                        />
                                    </div>

                                    <div className="border-t pt-6">
                                        <h4 className="font-medium mb-4">Send Test Email</h4>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Send test email to make sure that your SMTP settings is set correctly.
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                defaultValue="a.darwish@wasiladev.com"
                                                className="flex-1"
                                            />
                                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                                Test
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                            Save Settings
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="queue" className="space-y-6 mt-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-3 block flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        Enable Email Queue
                                    </Label>
                                    <RadioGroup defaultValue="yes">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="queue-yes" />
                                                <Label htmlFor="queue-yes">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="queue-no" />
                                                <Label htmlFor="queue-no">No</Label>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div>
                                    <Label className="mb-3 block flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        Do not add emails with attachments in the queue?
                                    </Label>
                                    <RadioGroup defaultValue="yes">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="attach-yes" />
                                                <Label htmlFor="attach-yes">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="attach-no" />
                                                <Label htmlFor="attach-no">No</Label>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="pt-6">
                                    <h4 className="font-medium mb-4">Email Queue</h4>

                                    <div className="bg-white rounded-lg border">
                                        <div className="p-4 border-b flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <select className="border rounded px-3 py-1.5 text-sm">
                                                    <option>25</option>
                                                    <option>50</option>
                                                    <option>100</option>
                                                </select>
                                                <Button variant="outline" size="sm">Export</Button>
                                            </div>
                                            <div className="relative">
                                                <Input placeholder="Search..." className="w-64" />
                                            </div>
                                        </div>

                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm">New Ticket Reply [Ticket ID: 1984]</td>
                                                    <td className="px-4 py-3 text-sm">mohamed.fathi@egjc.com.eg</td>
                                                    <td className="px-4 py-3 text-sm">sent</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <button className="text-red-600 hover:text-red-800">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm">New Ticket Reply [Ticket ID: 1984]</td>
                                                    <td className="px-4 py-3 text-sm">mohamed.fathi@egjc.com.eg</td>
                                                    <td className="px-4 py-3 text-sm">sent</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <button className="text-red-600 hover:text-red-800">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="p-4 border-t flex items-center justify-between text-sm text-gray-600">
                                            <span>Showing 1 to 2 of 2 entries</span>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" disabled>Previous</Button>
                                                <Button variant="outline" size="sm" className="bg-gray-900 text-white">1</Button>
                                                <Button variant="outline" size="sm" disabled>Next</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                        Save Settings
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold capitalize">{activeSection.replace('-', ' ')}</h2>
                <p className="text-gray-500">This section is under development.</p>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r p-4">
                <h2 className="text-lg font-semibold mb-6">Settings</h2>

                <div className="space-y-6">
                    {sidebarSections.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                {section.title}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveSection(item.id)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeSection === item.id
                                                ? 'bg-gray-100 text-gray-900 font-medium'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                <div className="max-w-4xl">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
