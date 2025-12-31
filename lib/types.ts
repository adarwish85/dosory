// Core entity types for the CRM platform
// All entities include orgId for multi-tenancy

import { Timestamp } from "firebase/firestore";

// ============================================
// Base Types
// ============================================

export interface BaseEntity {
    id: string;
    orgId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy?: string;
}

export type EntityStatus = "active" | "inactive" | "archived";

// ============================================
// Customer & Contact
// ============================================

export interface Customer extends BaseEntity {
    company: string;
    vatNumber?: string;
    phone?: string;
    website?: string;
    address?: Address;
    billingAddress?: Address;
    shippingAddress?: Address;
    currency?: string;
    defaultLanguage?: string;
    status: EntityStatus;
    groups?: string[];
    notes?: string;
    portalEnabled?: boolean;
    customFields?: Record<string, unknown>;
}

export interface Contact extends BaseEntity {
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position?: string;
    isPrimary: boolean;
    permissions?: ContactPermission[];
    status: EntityStatus;
    portalAccess?: {
        enabled: boolean;
        modules: string[];
        invitedAt?: Timestamp;
        lastLogin?: Timestamp;
    };
}

export type ContactPermission = "invoices" | "estimates" | "contracts" | "proposals" | "support" | "projects";

export interface Address {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}

// ============================================
// Lead
// ============================================

export interface Lead extends BaseEntity {
    name: string;
    name_lower?: string; // For case-insensitive search
    company?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: Address;
    source?: string;
    status: LeadStatus;
    assignedTo?: string;
    value?: number;
    tags?: string[];
    description?: string;
    dateConverted?: Timestamp;
    convertedToCustomerId?: string;
    lastContactedAt?: Timestamp;
    position?: string;
    defaultLanguage?: string;
    isPublic?: boolean;
    isStarred?: boolean;
    leadScore?: number; // 0-100 score based on criteria
    deal?: Deal;
}

export interface Deal {
    subject: string;
    value: number;
    description?: string;
    expectedCloseDate?: Timestamp;
    products?: LineItem[];
}

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost" | "junk";

// ============================================
// Activity (for Leads & Customers)
// ============================================

export type ActivityType = "meeting" | "call" | "follow_up" | "email";
export type ActivityOutcome = "completed" | "pending" | "cancelled";

export interface Activity extends BaseEntity {
    type: ActivityType;
    subject: string;
    dateTime: Timestamp;
    duration?: number; // minutes
    notes?: string;
    outcome: ActivityOutcome;
    relatedTo: {
        type: "lead" | "customer";
        id: string;
    };
}

// ============================================
// Invoice
// ============================================

export interface Invoice extends BaseEntity {
    number: string;
    numberFormatted?: string;
    customerId: string;
    customerName: string;
    projectId?: string;
    projectName?: string; // Denormalized for display
    date: Timestamp;
    dueDate: Timestamp;
    status: InvoiceStatus;
    currency: string;
    subtotal: number;
    discount?: DiscountInfo;
    taxTotal: number;
    total: number;
    amountPaid: number;
    amountDue: number;
    items: LineItem[];
    notes?: string;
    terms?: string;
    tags?: string[];
    recurring?: RecurringInfo;
    sentAt?: Timestamp;
    viewedAt?: Timestamp;
    paidAt?: Timestamp;
    senderName?: string;
    senderAddress?: string[];
    billToName?: string;
    billToAddress?: string[];
    shipToName?: string;
    shipToAddress?: string[];
}

export type InvoiceStatus = "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue" | "cancelled";

export interface LineItem {
    id: string;
    description: string;
    longDescription?: string;
    quantity: number;
    rate: number;
    taxId?: string;
    taxRate?: number;
    amount: number;
    unit?: string;
}

export interface DiscountInfo {
    type: "percentage" | "fixed";
    value: number;
}

export interface RecurringInfo {
    frequency: "weekly" | "monthly" | "quarterly" | "yearly";
    cycles?: number; // null = infinite
    cyclesCompleted: number;
    nextDate: Timestamp;
}

// ============================================
// Estimate
// ============================================

export interface Estimate extends BaseEntity {
    number: string;
    customerId: string;
    customerName: string;
    leadId?: string;
    date: Timestamp;
    expiryDate: Timestamp;
    status: EstimateStatus;
    currency: string;
    subtotal: number;
    discount?: DiscountInfo;
    taxTotal: number;
    total: number;
    items: LineItem[];
    notes?: string;
    terms?: string;
    tags?: string[];
    sentAt?: Timestamp;
    acceptedAt?: Timestamp;
    declinedAt?: Timestamp;
    convertedToInvoiceId?: string;
}

export type EstimateStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";

// ============================================
// Proposal
// ============================================

export interface Proposal extends BaseEntity {
    number: string;
    subject: string;
    customerId?: string;
    leadId?: string;
    date: Timestamp;
    openTill: Timestamp;
    status: ProposalStatus;
    currency: string;
    subtotal: number;
    discount?: DiscountInfo;
    taxTotal: number;
    total: number;
    items: LineItem[];
    content?: string; // Rich text content
    allowComments: boolean;
    assignedTo?: string;
    sentAt?: Timestamp;
    acceptedAt?: Timestamp;
    declinedAt?: Timestamp;
    convertedToEstimateId?: string;
    convertedToInvoiceId?: string;
}

export type ProposalStatus = "draft" | "sent" | "open" | "revised" | "declined" | "accepted";

// ============================================
// Credit Note
// ============================================

export interface CreditNote extends BaseEntity {
    number: string;
    customerId: string;
    customerName: string;
    invoiceId?: string;
    date: Timestamp;
    status: CreditNoteStatus;
    currency: string;
    subtotal: number;
    discount?: DiscountInfo;
    taxTotal: number;
    total: number;
    creditsUsed: number;
    creditsRemaining: number;
    items: LineItem[];
    notes?: string;
}

export type CreditNoteStatus = "open" | "closed" | "void";

// ============================================
// Payment
// ============================================

export interface Payment extends BaseEntity {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    amount: number;
    currency: string;
    paymentMode: string;
    date: Timestamp;
    transactionId?: string;
    note?: string;
}

// ============================================
// Product/Item Catalog
// ============================================

export interface Product extends BaseEntity {
    name: string;
    description?: string;
    longDescription?: string;
    rate: number;
    taxId?: string;
    unit?: string;
    groupId?: string;
}

export interface ProductGroup extends BaseEntity {
    name: string;
}

// ============================================
// Project
// ============================================

export interface Project extends BaseEntity {
    name: string;
    customerId: string;
    customerName: string;
    description?: string;
    status: ProjectStatus;
    startDate?: Timestamp;
    deadline?: Timestamp;
    billingType: ProjectBillingType;
    projectRate?: number;
    estimatedHours?: number;
    members: ProjectMember[];
    tags?: string[];
    currency?: string;
    progress: number;
}

export type ProjectStatus = "not_started" | "in_progress" | "on_hold" | "cancelled" | "finished";

export type ProjectBillingType = "fixed" | "hourly" | "task_hours";

export interface ProjectMember {
    staffId: string;
    hourlyRate?: number;
}

// ============================================
// Task
// ============================================

export interface Task extends BaseEntity {
    name: string;
    description?: string;
    projectId?: string;
    customerId?: string;
    status: TaskStatus;
    priority: TaskPriority;
    startDate?: Timestamp;
    dueDate?: Timestamp;
    assignees: string[];
    followers?: string[];
    tags?: string[];
    isPublic: boolean;
    billable: boolean;
    hourlyRate?: number;
    relatedTo?: TaskRelation;
    repeat?: TaskRepeat;
    checklist?: TaskChecklistItem[];
    milestoneId?: string;
}

export type TaskStatus = "not_started" | "in_progress" | "testing" | "awaiting_feedback" | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    assignee?: string;
}

export interface TaskRepeat {
    frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
    interval?: number; // e.g. every 2 weeks
    endDate?: Timestamp;
    days?: number[]; // Pending on frequency (e.g. days of week)
}

export interface TaskRelation {
    type: "customer" | "lead" | "invoice" | "estimate" | "proposal" | "contract";
    id: string;
}

// ============================================
// Expense
// ============================================

export interface Expense extends BaseEntity {
    categoryId: string;
    categoryName: string;
    amount: number;
    currency: string;
    taxId?: string;
    taxRate?: number;
    taxAmount?: number;
    date: Timestamp;
    customerId?: string;
    projectId?: string;
    invoiceId?: string;
    paymentMode?: string;
    reference?: string;
    note?: string;
    receiptUrl?: string;
    billable: boolean;
}

export interface ExpenseCategory extends BaseEntity {
    name: string;
    description?: string;
}

// ============================================
// Subscription
// ============================================

export interface Subscription extends BaseEntity {
    name: string;
    customerId: string;
    customerName: string;
    description?: string;
    currency: string;
    amount: number;
    taxId?: string;
    billingCycle: BillingCycle;
    status: SubscriptionStatus;
    startDate: Timestamp;
    nextBillingDate: Timestamp;
    endDate?: Timestamp;
    stripeSubscriptionId?: string;
    paypalSubscriptionId?: string;
    items: LineItem[];
    quotas?: Record<string, number>;
    capabilities?: {
        clientPortal: boolean;
        customDomain?: boolean;
        subdomain?: boolean;
        [key: string]: boolean | string | number | undefined;
    };
}

export type BillingCycle = "monthly" | "quarterly" | "semi_annual" | "annual";

export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "paused" | "future";

// ============================================
// Contract
// ============================================

export interface Contract extends BaseEntity {
    subject: string;
    customerId: string;
    customerName: string;
    contractValue?: number;
    contractType?: string;
    startDate: Timestamp;
    endDate?: Timestamp;
    description?: string;
    content?: string; // Rich text
    status: ContractStatus;
    signedAt?: Timestamp;
    signedByContactId?: string;
}

export type ContractStatus = "draft" | "sent" | "signed" | "expired" | "trash";

// ============================================
// Support Ticket
// ============================================

export interface Ticket extends BaseEntity {
    subject: string;
    customerId?: string;
    contactId?: string;
    departmentId: string;
    priority: TicketPriority;
    status: TicketStatus;
    assignedTo?: string;
    serviceId?: string;
    projectId?: string;
    lastReply?: Timestamp;
    lastReplyByStaff: boolean;
    tags?: string[];
    customerName?: string;
}

export type TicketPriority = "low" | "medium" | "high";

export type TicketStatus = "open" | "in_progress" | "answered" | "on_hold" | "closed";

export interface TicketReply extends BaseEntity {
    ticketId: string;
    message: string;
    attachments?: string[];
    isStaffReply: boolean;
    staffId?: string;
    contactId?: string;
}

export interface Department extends BaseEntity {
    name: string;
    email?: string;
    imapHost?: string;
    imapPort?: number;
    imapUsername?: string;
    imapEncryption?: "ssl" | "tls" | "none";
    hideFromClient: boolean;
}

// ============================================
// Knowledge Base
// ============================================

export interface KnowledgeArticle extends BaseEntity {
    subject: string;
    slug: string;
    groupId: string;
    description?: string;
    content: string;
    isActive: boolean;
    internalOnly: boolean;
    views: number;
    order: number;
}

export interface KnowledgeGroup extends BaseEntity {
    name: string;
    slug: string;
    description?: string;
    color?: string;
    isActive: boolean;
    order: number;
}

// ============================================
// Staff & Roles
// ============================================

export interface Staff extends BaseEntity {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    facebook?: string;
    linkedin?: string;
    skype?: string;
    hourlyRate?: number;
    roleId: string;
    departmentIds?: string[];
    isAdmin: boolean;
    status: EntityStatus;
    lastLogin?: Timestamp;
    photoURL?: string;
    image?: string;
}

export interface Role extends BaseEntity {
    name: string;
    description?: string;
    permissions: string[];
}

export type Permission =
    // Customers
    | "customers_view"
    | "customers_create"
    | "customers_edit"
    | "customers_delete"
    // Leads
    | "leads_view"
    | "leads_create"
    | "leads_edit"
    | "leads_delete"
    // Invoices
    | "invoices_view"
    | "invoices_create"
    | "invoices_edit"
    | "invoices_delete"
    // Estimates
    | "estimates_view"
    | "estimates_create"
    | "estimates_edit"
    | "estimates_delete"
    // Proposals
    | "proposals_view"
    | "proposals_create"
    | "proposals_edit"
    | "proposals_delete"
    // Projects
    | "projects_view"
    | "projects_create"
    | "projects_edit"
    | "projects_delete"
    // Tasks
    | "tasks_view"
    | "tasks_create"
    | "tasks_edit"
    | "tasks_delete"
    // Expenses
    | "expenses_view"
    | "expenses_create"
    | "expenses_edit"
    | "expenses_delete"
    // Contracts
    | "contracts_view"
    | "contracts_create"
    | "contracts_edit"
    | "contracts_delete"
    // Support
    | "tickets_view"
    | "tickets_create"
    | "tickets_edit"
    | "tickets_delete"
    // Knowledge Base
    | "knowledge_view"
    | "knowledge_create"
    | "knowledge_edit"
    | "knowledge_delete"
    // Staff
    | "staff_view"
    | "staff_create"
    | "staff_edit"
    | "staff_delete"
    // Reports
    | "reports_view"
    // Settings
    | "settings_view"
    | "settings_edit";

// ============================================
// Settings & Configuration
// ============================================

export interface Tax extends BaseEntity {
    name: string;
    rate: number;
    isDefault: boolean;
}

export interface Currency extends BaseEntity {
    code: string;
    name: string;
    symbol: string;
    placement: "before" | "after";
    decimalSeparator: string;
    thousandsSeparator: string;
    isDefault: boolean;
}

export interface PaymentMode extends BaseEntity {
    name: string;
    description?: string;
    showOnInvoice: boolean;
    isActive: boolean;
    invoicesOnly?: boolean;
    expensesOnly?: boolean;
}

export interface CustomField extends BaseEntity {
    fieldTo: CustomFieldEntity;
    name: string;
    slug: string;
    type: CustomFieldType;
    options?: string[]; // For select/checkbox/radio
    defaultValue?: string;
    required: boolean;
    showOnTable: boolean;
    showOnPdf: boolean;
    order: number;
    gridWidth?: number;
}

export type CustomFieldEntity =
    | "customers"
    | "contacts"
    | "leads"
    | "invoices"
    | "estimates"
    | "proposals"
    | "projects"
    | "tasks"
    | "expenses"
    | "contracts"
    | "tickets";

export type CustomFieldType =
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime"
    | "select"
    | "multiselect"
    | "checkbox"
    | "link"
    | "color";

// ============================================
// Email Templates
// ============================================

export interface EmailTemplate extends BaseEntity {
    name: string;
    slug: string;
    type: EmailTemplateType;
    subject: string;
    content: string;
    isActive: boolean;
}

export type EmailTemplateType =
    | "invoice"
    | "estimate"
    | "proposal"
    | "contract"
    | "ticket"
    | "lead"
    | "project"
    | "task"
    | "custom";

export interface ScheduledEmail extends BaseEntity {
    templateId?: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    content: string;
    scheduledFor: Timestamp;
    status: "pending" | "sent" | "failed";
    sentAt?: Timestamp;
    error?: string;
    relatedTo?: {
        type: string;
        id: string;
    };
}

// ============================================
// SMTP Settings
// ============================================

export interface SmtpSettings {
    host: string;
    port: number;
    encryption: "ssl" | "tls" | "none";
    username: string;
    password: string;
    fromName: string;
    fromEmail: string;
}

// ============================================
// Organization Settings
// ============================================

export interface Organization {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: Address;
    logo?: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    fiscalYearStart: number; // Month 1-12
    invoicePrefix?: string;
    estimatePrefix?: string;
    proposalPrefix?: string;
    creditNotePrefix?: string;
    contractPrefix?: string;
    smtpSettings?: SmtpSettings;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalMode?: "sandbox" | "live";
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// Notifications
// ============================================

export interface Notification extends BaseEntity {
    userId: string;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    link?: string;
    read: boolean;
}

// ============================================
// Reminders
// ============================================

export interface Reminder extends BaseEntity {
    date: Timestamp;
    assignedTo: string;
    description: string;
    sendEmail: boolean;
    relatedTo?: TaskRelation; // Reusing TaskRelation { type, id }
    isRead?: boolean; // For when the reminder triggers
    createdBy: string;
}

// ============================================
// Files
// ============================================

export interface FileDoc extends BaseEntity {
    name: string;
    size: number;
    type: string; // mime type
    url: string;
    path: string; // storage path
    relatedTo?: TaskRelation; // { type, id }
    uploadedBy: string;
}

export interface CustomerFile extends BaseEntity {
    name: string;
    url: string;
    size: number;
    type: string;
    customerId: string;
    uploadedBy: string;
}

export interface VaultItem extends BaseEntity {
    name: string;
    value: string;
    customerId: string;
    type: "password" | "text" | "key";
    visibility?: "private" | "shared";
    url?: string;
    username?: string;
}

// ============================================
// Milestones
// ============================================

export interface Milestone extends BaseEntity {
    name: string;
    description?: string;
    dueDate: Timestamp;
    projectId: string;
    color?: string; // hex code
    order: number;
    status: "incomplete" | "complete";
}

// ============================================
// Timesheets & Time Logs
// ============================================

export interface Timesheet extends BaseEntity {
    projectId: string;
    taskId?: string;
    userId: string;
    startTime: Timestamp;
    endTime?: Timestamp;
    duration: number; // in seconds
    note?: string;
    billable: boolean;
}

// ============================================
// Project Files
// ============================================

export interface ProjectFile extends BaseEntity {
    name: string;
    url: string;
    size: number;
    type: string;
    projectId: string;
    customerId?: string;
    uploadedBy: string;
    folderId?: string;
    description?: string;
}

// ============================================
// Discussions
// ============================================

export interface ProjectDiscussion extends BaseEntity {
    projectId: string;
    subject: string;
    description: string;
    lastReply?: Timestamp;
    createdBy: string;
    participants: string[];
}

export interface DiscussionComment extends BaseEntity {
    discussionId: string;
    content: string;
    userId: string;
    attachments?: string[];
}
