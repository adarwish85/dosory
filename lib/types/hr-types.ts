// HR Management Module Types
// All entities include orgId for multi-tenancy

import { Timestamp } from "firebase/firestore";
import type { BaseEntity, EntityStatus } from "../types";

// ============================================
// Employee
// ============================================

export type EmploymentType = "full_time" | "part_time" | "contractor";
export type WorkLocation = "office" | "remote" | "hybrid";
export type EmployeeStatus = "active" | "on_leave" | "terminated";

export interface Employee extends BaseEntity {
    // Link to system user
    userId: string;

    // Personal Information
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;

    // Employment Details
    employmentType: EmploymentType;
    departmentId: string;
    departmentName?: string; // Denormalized for display
    jobTitleId: string;
    jobTitleName?: string; // Denormalized for display
    reportingManagerId?: string;
    reportingManagerName?: string; // Denormalized for display

    // Dates
    hireDate: Timestamp;
    terminationDate?: Timestamp;

    // Status & Location
    status: EmployeeStatus;
    workLocation: WorkLocation;

    // HR Role for RBAC
    hrRole: "hr_admin" | "manager" | "employee";

    // Payroll Reference
    payrollInputId?: string;
}

// ============================================
// HR Department (renamed to avoid conflict with support module)
// ============================================

export interface HRDepartment extends BaseEntity {
    name: string;
    description?: string;
    managerId?: string;
    managerName?: string;
    parentDepartmentId?: string; // For simple hierarchy
    employeeCount?: number;
    status: EntityStatus;
}

// ============================================
// Job Title
// ============================================

export interface JobTitle extends BaseEntity {
    name: string;
    description?: string;
    departmentId?: string; // Optional department association
    level?: number; // Hierarchy level (1=Entry, 2=Mid, 3=Senior, 4=Lead, 5=Director)
    status: EntityStatus;
}

// ============================================
// Work Schedule
// ============================================

export interface WorkDay {
    enabled: boolean;
    startTime: string; // "09:00"
    endTime: string; // "17:00"
    breakMinutes: number;
}

export interface WorkSchedule extends BaseEntity {
    employeeId: string;
    name: string; // e.g., "Standard 9-5", "Part-time Morning"
    effectiveFrom: Timestamp;
    effectiveTo?: Timestamp;
    timezone: string;
    weeklySchedule: {
        sunday: WorkDay;
        monday: WorkDay;
        tuesday: WorkDay;
        wednesday: WorkDay;
        thursday: WorkDay;
        friday: WorkDay;
        saturday: WorkDay;
    };
    isDefault?: boolean;
}

// ============================================
// Attendance
// ============================================

export type AttendanceStatus = "present" | "absent" | "late" | "early_leave" | "on_leave" | "holiday";

export interface AttendanceLog extends BaseEntity {
    employeeId: string;
    employeeName: string; // Denormalized
    date: Timestamp; // Date only (start of day)

    // Clock times
    clockIn?: Timestamp;
    clockOut?: Timestamp;

    // Calculated values
    scheduledStart?: string; // From work schedule
    scheduledEnd?: string;
    workedMinutes?: number;
    overtimeMinutes?: number;

    // Flags
    status: AttendanceStatus;
    isLate?: boolean;
    isEarlyLeave?: boolean;
    hasOvertime?: boolean;

    // Manual entry
    isManualEntry?: boolean;
    manualEntryBy?: string;
    manualEntryReason?: string;

    // Leave reference
    leaveRequestId?: string;

    // Notes
    notes?: string;
}

// ============================================
// Leave Types
// ============================================

export interface LeaveType extends BaseEntity {
    name: string; // "Annual", "Sick", "Unpaid"
    code: string; // "annual", "sick", "unpaid"
    description?: string;
    color: string; // For calendar display
    defaultDaysPerYear: number;
    isPaid: boolean;
    requiresApproval: boolean;
    allowsHalfDay: boolean;
    allowsCarryOver?: boolean;
    maxCarryOverDays?: number;
    status: EntityStatus;
}

// ============================================
// Leave Balance
// ============================================

export interface LeaveBalance extends BaseEntity {
    employeeId: string;
    leaveTypeId: string;
    leaveTypeName: string; // Denormalized
    year: number;

    // Balance tracking
    entitled: number; // Days entitled for the year
    used: number; // Days used
    pending: number; // Days in pending requests
    remaining: number; // entitled - used - pending

    // Carry over from previous year
    carriedOver?: number;
}

// ============================================
// Leave Request
// ============================================

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest extends BaseEntity {
    employeeId: string;
    employeeName: string; // Denormalized
    departmentId: string;

    leaveTypeId: string;
    leaveTypeName: string; // Denormalized

    // Request details
    startDate: Timestamp;
    endDate: Timestamp;
    totalDays: number;
    isHalfDay?: boolean;
    halfDayType?: "morning" | "afternoon";

    reason?: string;

    // Approval workflow
    status: LeaveRequestStatus;
    approverId?: string;
    approverName?: string;
    approvedAt?: Timestamp;
    rejectedAt?: Timestamp;
    rejectionReason?: string;

    // Audit
    submittedAt: Timestamp;
}

// ============================================
// Payroll Inputs
// ============================================

export type PayFrequency = "monthly" | "bi_weekly" | "weekly";
export type AllowanceType = "housing" | "transport" | "meal" | "phone" | "other";
export type DeductionType = "tax" | "insurance" | "loan" | "other";

export interface PayrollAllowance {
    id: string;
    type: AllowanceType;
    name: string;
    amount: number;
    isRecurring: boolean;
}

export interface PayrollDeduction {
    id: string;
    type: DeductionType;
    name: string;
    amount: number;
    isRecurring: boolean;
}

export interface PayrollInput extends BaseEntity {
    employeeId: string;
    employeeName: string; // Denormalized

    // Base salary
    baseSalary: number;
    currency: string;
    payFrequency: PayFrequency;

    // Allowances & Deductions
    allowances: PayrollAllowance[];
    deductions: PayrollDeduction[];

    // Calculated totals
    totalAllowances: number;
    totalDeductions: number;
    grossSalary: number; // baseSalary + totalAllowances
    netSalary: number; // grossSalary - totalDeductions

    // Overtime (from attendance)
    overtimeHours?: number;
    overtimeRate?: number; // Multiplier, e.g., 1.5
    overtimeAmount?: number;

    // Effective dates
    effectiveFrom: Timestamp;
    effectiveTo?: Timestamp;

    // Status
    isActive: boolean;
}

// ============================================
// Payroll Summary (for Accounting integration)
// ============================================

export interface PayrollSummary {
    id: string;
    orgId: string;
    period: string; // "2026-01"
    generatedAt: Timestamp;
    generatedBy: string;

    // Totals
    totalEmployees: number;
    totalBaseSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    totalOvertime: number;
    totalGross: number;
    totalNet: number;

    // Status
    status: "draft" | "approved" | "exported";
    exportedToAccounting?: boolean;
    exportedAt?: Timestamp;

    // Details
    items: PayrollSummaryItem[];
}

export interface PayrollSummaryItem {
    employeeId: string;
    employeeName: string;
    departmentName: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    overtime: number;
    gross: number;
    net: number;
}

// ============================================
// Performance Notes
// ============================================

export type PerformanceRating = 1 | 2 | 3 | 4 | 5;
export type PerformanceFlag = "promotion_candidate" | "performance_concern" | "none";

export interface PerformanceNote extends BaseEntity {
    employeeId: string;
    employeeName: string; // Denormalized

    // Note details
    month: number; // 1-12
    year: number;
    rating?: PerformanceRating;
    flag?: PerformanceFlag;
    notes: string;

    // Author (Manager or HR)
    authorId: string;
    authorName: string;

    // Optional links
    projectId?: string;
    projectName?: string;
    taskId?: string;
    taskName?: string;
    incidentDescription?: string;

    // Visibility
    isConfidential: boolean;
}

// ============================================
// Employee Documents
// ============================================

export type DocumentType = "contract" | "id_proof" | "resume" | "certification" | "tax_form" | "review" | "other";
export type DocumentCategory = "contract" | "id_document" | "certificate" | "other";

export interface EmployeeDocument extends BaseEntity {
    employeeId: string;
    employeeName: string; // Denormalized

    // Document details
    name: string;
    documentType: DocumentType;
    category?: DocumentCategory; // Legacy
    description?: string;

    // File info
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;

    // Expiry
    expiryDate?: Timestamp;
    expiryReminderSent?: boolean;

    // Access
    uploadedBy: string;
    uploadedByName: string;
}

// ============================================
// HR Audit Log
// ============================================

export type HRAuditAction =
    | "employee_created"
    | "employee_updated"
    | "employee_terminated"
    | "attendance_edited"
    | "attendance_manual_entry"
    | "leave_requested"
    | "leave_approved"
    | "leave_rejected"
    | "leave_cancelled"
    | "payroll_updated"
    | "salary_changed"
    | "document_uploaded"
    | "document_deleted"
    | "performance_note_added";

export interface HRAuditLog extends BaseEntity {
    action: HRAuditAction;

    // Actor
    userId: string;
    userName: string;

    // Target
    targetType: "employee" | "attendance" | "leave" | "payroll" | "document" | "performance";
    targetId: string;
    targetName?: string;

    // Change details
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    description: string;

    // Metadata
    ipAddress?: string;
    userAgent?: string;
}

// ============================================
// Cross-Module Integration Types
// ============================================

export interface EmployeeWorkload {
    employeeId: string;
    employeeName: string;
    activeProjects: number;
    activeTasks: number;
    openTickets: number;
    totalHoursThisWeek: number;
}

export interface SalesTeamMember {
    employeeId: string;
    employeeName: string;
    departmentName: string;
    activeLeads: number;
    closedDeals: number;
    totalRevenue: number;
}
