// Zod validation schemas for form inputs and API payloads
// These are used for runtime validation of user input

import { z } from "zod";

// ============================================
// Base Schemas
// ============================================

export const addressSchema = z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
});

export const entityStatusSchema = z.enum(["active", "inactive", "archived"]);

// ============================================
// Line Item Schema (shared)
// ============================================

export const lineItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Description is required"),
    longDescription: z.string().optional(),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    rate: z.number().min(0, "Rate must be non-negative"),
    taxId: z.string().optional(),
    taxRate: z.number().optional(),
    amount: z.number(),
    unit: z.string().optional(),
});

export const discountSchema = z.object({
    type: z.enum(["percentage", "fixed"]),
    value: z.number().min(0),
});

// ============================================
// Customer & Contact Schemas
// ============================================

export const customerFormSchema = z.object({
    company: z.string().min(1, "Company name is required"),
    vatNumber: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    address: addressSchema.optional(),
    billingAddress: addressSchema.optional(),
    shippingAddress: addressSchema.optional(),
    currency: z.string().optional(),
    defaultLanguage: z.string().optional(),
    status: entityStatusSchema.default("active"),
    groups: z.array(z.string()).optional(),
    notes: z.string().optional(),
});

export const contactFormSchema = z.object({
    customerId: z.string().min(1, "Customer is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().optional(),
    position: z.string().optional(),
    isPrimary: z.boolean().default(false),
    portalAccess: z.boolean().default(false),
    permissions: z.array(z.enum(["invoices", "estimates", "contracts", "proposals", "support", "projects"])).optional(),
    status: entityStatusSchema.default("active"),
});

// ============================================
// Lead Schema
// ============================================

export const leadStatusSchema = z.enum([
    "new",
    "contacted",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
    "junk",
]);

// ============================================
// Activity Schema
// ============================================

export const activityTypeSchema = z.enum(["meeting", "call", "follow_up", "email"]);
export const activityOutcomeSchema = z.enum(["completed", "pending", "cancelled"]);

export const activityFormSchema = z.object({
    type: activityTypeSchema,
    subject: z.string().min(1, "Subject is required"),
    dateTime: z.date(),
    duration: z.number().min(0).optional(),
    notes: z.string().optional(),
    outcome: activityOutcomeSchema,
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;

export const dealSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    value: z.number().min(0, "Value must be non-negative"),
    description: z.string().optional(),
    expectedCloseDate: z.date().optional(),
    products: z.array(lineItemSchema).optional(),
});

export const leadFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    company: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    address: addressSchema.optional(),
    source: z.string().optional(),
    status: leadStatusSchema.default("new"),
    assignedTo: z.string().optional(),
    value: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    position: z.string().optional(),
    defaultLanguage: z.string().optional(),
    isPublic: z.boolean().default(false),
    lastContactedAt: z.date().optional(),
    deal: dealSchema.optional(),
});

// ============================================
// Invoice Schema
// ============================================

export const invoiceStatusSchema = z.enum(["draft", "sent", "viewed", "partial", "paid", "overdue", "cancelled"]);

export const invoiceFormSchema = z.object({
    customerId: z.string().min(1, "Customer is required"),
    projectId: z.string().optional(),
    date: z.date(),
    dueDate: z.date(),
    currency: z.string().min(1, "Currency is required"),
    items: z.array(lineItemSchema).min(1, "At least one item is required"),
    discount: discountSchema.optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

// ============================================
// Estimate Schema
// ============================================

export const estimateStatusSchema = z.enum(["draft", "sent", "viewed", "accepted", "declined", "expired"]);

export const estimateFormSchema = z
    .object({
        customerId: z.string().optional(),
        leadId: z.string().optional(),
        date: z.date(),
        expiryDate: z.date(),
        currency: z.string().min(1, "Currency is required"),
        items: z.array(lineItemSchema).min(1, "At least one item is required"),
        discount: discountSchema.optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        tags: z.array(z.string()).optional(),
    })
    .refine((data) => data.customerId || data.leadId, {
        message: "Either Customer or Lead is required",
        path: ["customerId"],
    });

// ============================================
// Proposal Schema
// ============================================

export const proposalStatusSchema = z.enum(["draft", "sent", "open", "revised", "declined", "accepted"]);

export const proposalFormSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    customerId: z.string().optional(),
    leadId: z.string().optional(),
    date: z.date(),
    openTill: z.date(),
    currency: z.string().min(1, "Currency is required"),
    items: z.array(lineItemSchema).optional(),
    content: z.string().optional(),
    allowComments: z.boolean().default(true),
    assignedTo: z.string().optional(),
});

// ============================================
// Credit Note Schema
// ============================================

export const creditNoteStatusSchema = z.enum(["open", "closed", "void"]);

export const creditNoteFormSchema = z.object({
    customerId: z.string().min(1, "Customer is required"),
    invoiceId: z.string().optional(),
    date: z.date(),
    currency: z.string().min(1, "Currency is required"),
    items: z.array(lineItemSchema).min(1, "At least one item is required"),
    notes: z.string().optional(),
});

// ============================================
// Payment Schema
// ============================================

export const paymentFormSchema = z.object({
    invoiceId: z.string().min(1, "Invoice is required"),
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    paymentMode: z.string().min(1, "Payment mode is required"),
    date: z.date(),
    transactionId: z.string().optional(),
    note: z.string().optional(),
});

// ============================================
// Product Schema
// ============================================

export const productFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    longDescription: z.string().optional(),
    rate: z.number().min(0, "Rate must be non-negative"),
    taxId: z.string().optional(),
    unit: z.string().optional(),
    groupId: z.string().optional(),
});

// ============================================
// Project Schema
// ============================================

export const projectStatusSchema = z.enum(["not_started", "in_progress", "on_hold", "cancelled", "finished"]);

export const projectBillingTypeSchema = z.enum(["fixed", "hourly", "task_hours"]);

export const projectMemberSchema = z.object({
    staffId: z.string(),
    hourlyRate: z.number().optional(),
});

export const projectFormSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    customerId: z.string().min(1, "Customer is required"),
    description: z.string().optional(),
    status: projectStatusSchema,
    startDate: z.date().optional(),
    deadline: z.date().optional(),
    billingType: projectBillingTypeSchema,
    projectRate: z.number().optional(),
    estimatedHours: z.number().optional(),
    currency: z.string().optional(),
    members: z.array(projectMemberSchema).optional(),
    tags: z.array(z.string()).optional(),
    pinned: z.boolean().optional(),
});

// ============================================
// Task Schema
// ============================================

export const taskStatusSchema = z.enum(["not_started", "in_progress", "testing", "awaiting_feedback", "completed"]);

export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const taskFormSchema = z.object({
    name: z.string().min(1, "Task name is required"),
    description: z.string().optional(),
    projectId: z.string().optional(),
    customerId: z.string().optional(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    startDate: z.date().optional(),
    dueDate: z.date().optional(),
    assignees: z.array(z.string()).default([]),
    followers: z.array(z.string()).default([]),
    milestoneId: z.string().optional(),
    taskListId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().default(false),
    billable: z.boolean().default(true),
    hourlyRate: z.number().optional(),
    relatedTo: z
        .object({
            type: z.enum(["customer", "lead", "invoice", "estimate", "proposal", "contract"]),
            id: z.string(),
        })
        .optional(),
    repeat: z
        .object({
            frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
            interval: z.number().optional(),
            endDate: z.any().optional(), // Timestamp or Date
            days: z.array(z.number()).optional(),
        })
        .optional(),
    checklist: z
        .array(
            z.object({
                id: z.string(),
                text: z.string(),
                completed: z.boolean(),
                assignee: z.string().optional(),
            })
        )
        .optional(),
});

// ============================================
// Expense Schema
// ============================================

export const expenseFormSchema = z.object({
    categoryId: z.string().min(1, "Category is required"),
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    currency: z.string().min(1, "Currency is required"),
    taxId: z.string().optional(),
    date: z.date(),
    customerId: z.string().optional(),
    projectId: z.string().optional(),
    paymentMode: z.string().optional(),
    reference: z.string().optional(),
    note: z.string().optional(),
    billable: z.boolean(),
});

export const expenseCategoryFormSchema = z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
});

// ============================================
// Subscription Schema
// ============================================

export const billingCycleSchema = z.enum(["monthly", "quarterly", "semi_annual", "annual"]);

export const subscriptionStatusSchema = z.enum(["active", "past_due", "cancelled", "paused", "future"]);

export const subscriptionFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    customerId: z.string().min(1, "Customer is required"),
    description: z.string().optional(),
    currency: z.string().min(1, "Currency is required"),
    billingCycle: billingCycleSchema.default("monthly"),
    startDate: z.date(),
    items: z.array(lineItemSchema).min(1, "At least one item is required"),
});

// ============================================
// Contract Schema
// ============================================

export const contractStatusSchema = z.enum(["draft", "sent", "signed", "expired", "trash"]);

export const contractFormSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    customerId: z.string().min(1, "Customer is required"),
    contractValue: z.number().optional(),
    contractType: z.string().optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
});

// ============================================
// Ticket Schema
// ============================================

export const ticketPrioritySchema = z.enum(["low", "medium", "high"]);

export const ticketStatusSchema = z.enum(["open", "in_progress", "answered", "on_hold", "closed"]);

export const ticketFormSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    customerId: z.string().optional(),
    contactId: z.string().optional(),
    departmentId: z.string().min(1, "Department is required"),
    priority: ticketPrioritySchema,
    assignedTo: z.string().optional(),
    serviceId: z.string().optional(),
    projectId: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

export const ticketReplyFormSchema = z.object({
    ticketId: z.string().min(1),
    message: z.string().min(1, "Message is required"),
    attachments: z.array(z.string()).optional(),
});

export const departmentFormSchema = z.object({
    name: z.string().min(1, "Department name is required"),
    email: z.string().email().optional().or(z.literal("")),
    hideFromClient: z.boolean().default(false),
});

// ============================================
// Knowledge Base Schema
// ============================================

export const knowledgeArticleFormSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    groupId: z.string().min(1, "Group is required"),
    description: z.string().optional(),
    content: z.string().min(1, "Content is required"),
    isActive: z.boolean().default(true),
    internalOnly: z.boolean().default(false),
});

export const knowledgeGroupFormSchema = z.object({
    name: z.string().min(1, "Group name is required"),
    description: z.string().optional(),
    color: z.string().optional(),
    isActive: z.boolean().default(true),
});

// ============================================
// Staff & Role Schema
// ============================================

export const staffFormSchema = z.object({
    email: z.string().email("Valid email is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().optional(),
    hourlyRate: z.number().optional(),
    roleId: z.string().min(1, "Role is required"),
    departmentIds: z.array(z.string()).optional(),
    isAdmin: z.boolean().default(false),
    status: entityStatusSchema.default("active"),
});

export const roleFormSchema = z.object({
    name: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
    permissions: z.array(z.string()).default([]),
});

// ============================================
// Settings Schemas
// ============================================

export const taxFormSchema = z.object({
    name: z.string().min(1, "Tax name is required"),
    rate: z.number().min(0).max(100, "Rate must be between 0 and 100"),
    isDefault: z.boolean().default(false),
});

export const currencyFormSchema = z.object({
    code: z.string().min(1, "Currency code is required").max(3),
    name: z.string().min(1, "Currency name is required"),
    symbol: z.string().min(1, "Symbol is required"),
    placement: z.enum(["before", "after"]).default("before"),
    decimalSeparator: z.string().default("."),
    thousandsSeparator: z.string().default(","),
    isDefault: z.boolean().default(false),
});

export const paymentModeFormSchema = z.object({
    name: z.string().min(1, "Payment mode name is required"),
    description: z.string().optional(),
    showOnInvoice: z.boolean().default(true),
    isActive: z.boolean().default(true),
});

export const customFieldFormSchema = z.object({
    fieldTo: z.enum([
        "customers",
        "contacts",
        "leads",
        "invoices",
        "estimates",
        "proposals",
        "projects",
        "tasks",
        "expenses",
        "contracts",
        "tickets",
    ]),
    name: z.string().min(1, "Field name is required"),
    type: z.enum([
        "text",
        "textarea",
        "number",
        "date",
        "datetime",
        "select",
        "multiselect",
        "checkbox",
        "link",
        "color",
    ]),
    options: z.array(z.string()).optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().default(false),
    showOnTable: z.boolean().default(false),
    showOnPdf: z.boolean().default(false),
    gridWidth: z.number().optional(),
});

// ============================================
// Email Template Schema
// ============================================

export const emailTemplateFormSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    type: z.enum(["invoice", "estimate", "proposal", "contract", "ticket", "lead", "project", "task", "custom"]),
    subject: z.string().min(1, "Subject is required"),
    content: z.string().min(1, "Content is required"),
    isActive: z.boolean().default(true),
});

export const scheduledEmailFormSchema = z.object({
    templateId: z.string().optional(),
    to: z.array(z.string().email()).min(1, "At least one recipient is required"),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    subject: z.string().min(1, "Subject is required"),
    content: z.string().min(1, "Content is required"),
    scheduledFor: z.date(),
});

// ============================================
// SMTP Settings Schema
// ============================================

export const smtpSettingsFormSchema = z.object({
    host: z.string().min(1, "SMTP host is required"),
    port: z.number().min(1).max(65535),
    encryption: z.enum(["ssl", "tls", "none"]).default("tls"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    fromName: z.string().min(1, "From name is required"),
    fromEmail: z.string().email("Valid from email is required"),
});

// ============================================
// Organization Settings Schema
// ============================================

export const organizationSettingsFormSchema = z.object({
    name: z.string().min(1, "Organization name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    address: addressSchema.optional(),
    timezone: z.string().default("UTC"),
    dateFormat: z.string().default("MM/DD/YYYY"),
    currency: z.string().default("USD"),
    fiscalYearStart: z.number().min(1).max(12).default(1),
    invoicePrefix: z.string().optional(),
    estimatePrefix: z.string().optional(),
    proposalPrefix: z.string().optional(),
    creditNotePrefix: z.string().optional(),
    contractPrefix: z.string().optional(),
});

// ============================================
// Reminder Schema
// ============================================

export const reminderFormSchema = z.object({
    date: z.date(),
    assignedTo: z.string().min(1, "Assignee is required"),
    description: z.string().optional(),
    sendEmail: z.boolean(),
    relatedTo: z
        .object({
            type: z.enum(["customer", "lead", "invoice", "estimate", "proposal", "contract"]),
            id: z.string(),
        })
        .optional(),
});

// ============================================
// Type Exports (inferred from schemas)
// ============================================

export type CustomerFormData = z.infer<typeof customerFormSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type LeadFormData = z.infer<typeof leadFormSchema>;
export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type EstimateFormData = z.infer<typeof estimateFormSchema>;
export type ProposalFormData = z.infer<typeof proposalFormSchema>;
export type CreditNoteFormData = z.infer<typeof creditNoteFormSchema>;
export type PaymentFormData = z.infer<typeof paymentFormSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type ProjectFormData = z.infer<typeof projectFormSchema>;
export type TaskFormData = z.infer<typeof taskFormSchema>;
export type ExpenseFormData = z.infer<typeof expenseFormSchema>;
export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;
export type ContractFormData = z.infer<typeof contractFormSchema>;
export type TicketFormData = z.infer<typeof ticketFormSchema>;
export type TicketReplyFormData = z.infer<typeof ticketReplyFormSchema>;
export type StaffFormData = z.infer<typeof staffFormSchema>;
export type RoleFormData = z.infer<typeof roleFormSchema>;
export type ReminderFormData = z.infer<typeof reminderFormSchema>;

// ============================================
// Milestone Schema
// ============================================

export const milestoneFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    dueDate: z.date(),
    color: z.string().optional(),
    projectId: z.string(),
    order: z.number().default(0),
    status: z.enum(["incomplete", "complete"]).optional(),
});

// ============================================
// Time Log Schema
// ============================================

export const timeLogSchema = z.object({
    projectId: z.string(),
    taskId: z.string().optional(),
    startTime: z.date(),
    endTime: z.date().optional(),
    note: z.string().optional(),
    billable: z.boolean().optional(),
});

// ============================================
// Discussion Schema
// ============================================

export const discussionFormSchema = z.object({
    projectId: z.string(),
    subject: z.string().min(1, "Subject is required"),
    description: z.string().min(1, "Description is required"),
    participants: z.array(z.string()).optional(),
});

// ============================================
// Additional Types
// ============================================

export type MilestoneFormData = z.infer<typeof milestoneFormSchema>;
export type TimeLogFormData = z.infer<typeof timeLogSchema>;
export type DiscussionFormData = z.infer<typeof discussionFormSchema>;
