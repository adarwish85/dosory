"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function EmailTemplatesPage() {
    const { t } = useTranslation();
    const templateSections = [
        {
            title: "Tickets",
            templates: [
                "New Ticket Opened (Opened by Staff, Sent to Customer)",
                "Ticket Reply (Sent to Customer)",
                "New Ticket Opened - Autoresponse",
                "New Ticket Created (Opened by Customer, Sent to Staff Members)",
                "Ticket Reply (Sent to Staff)",
                "Auto Close Ticket",
                "New Ticket Assigned (Sent to Staff)",
            ],
        },
        {
            title: "Estimates",
            templates: [
                "Send Estimate to Customer",
                "Estimate Already Sent to Customer",
                "Estimate Declined (Sent to Staff)",
                "Estimate Accepted (Sent to Staff)",
                "Thank You Email (Sent to Customer After Accept)",
                "Estimate Expiration Reminder",
            ],
        },
        {
            title: "Contracts",
            templates: [
                "Contract Expiration Reminder (Sent to Customer Contacts)",
                "Send Contract to Customer",
                "New Comment Â (Sent to Customer Contacts)",
                "New Comment (Sent to Staff)",
                "Contract Expiration Reminder (Sent to Staff)",
                "Contract Signed (Sent to Staff)",
                "Contract Sign Reminder (Sent to Customer)",
            ],
        },
        {
            title: "Invoices",
            templates: [
                "Send Invoice to Customer",
                "Invoice Payment Recorded (Sent to Customer)",
                "Invoice Overdue Notice",
                "Invoice Already Sent to Customer",
                "Invoice Payment Recorded (Sent to Staff)",
                "Invoice Due Notice",
                "Invoices Payments Recorded in Batch (Sent to Customer)",
            ],
        },
        {
            title: "Subscriptions",
            templates: [
                "Send Subscription to Customer",
                "Subscription Payment Failed",
                "Subscription Canceled (Sent to customer primary contact)",
                "Subscription Payment Succeeded (Sent to customer primary contact)",
                "Customer Subscribed to a Subscription (Sent to administrators and subscription creator)",
                "Credit Card Authorization Required - SCA",
            ],
        },
        {
            title: "Credit Note",
            templates: ["Send Credit Note To Email"],
        },
        {
            title: "Tasks",
            templates: [
                "New Task Assigned (Sent to Staff)",
                "Staff Member Added as Follower on Task (Sent to Staff)",
                "New Comment on Task (Sent to Staff)",
                "New Attachment(s) on Task (Sent to Staff)",
                "Task Deadline Reminder - Sent to Assigned Members",
                "New Attachment(s) on Task (Sent to Customer Contacts)",
                "New Comment on Task (Sent to Customer Contacts)",
                "Task Status Changed (Sent to Staff)",
                "Task Status Changed (Sent to Customer Contacts)",
            ],
        },
        {
            title: "Customers",
            templates: [
                "New Contact Added/Registered (Welcome Email)",
                "Forgot Password",
                "Password Reset - Confirmation",
                "Set New Password",
                "Statement - Account Summary",
                "New Customer Registration (Sent to admins)",
                "Customer Registration Confirmed",
                "Email Verification (Sent to Contact After Registration)",
                "New Customer Profile File(s) Uploaded (Sent to Staff)",
            ],
        },
        {
            title: "Projects",
            templates: [
                "New Project Discussion (Sent to Project Members)",
                "New Project Discussion (Sent to Customer Contacts)",
                "New Project File(s) Uploaded (Sent to Customer Contacts)",
                "New Project File(s) Uploaded (Sent to Project Members)",
                "New Discussion Comment (Sent to Customer Contacts)",
                "New Discussion Comment (Sent to Project Members)",
                "Staff Added as Project Member",
                "New Project Created (Sent to Customer Contacts)",
                "Project Marked as Finished (Sent to Customer Contacts)",
            ],
        },
        {
            title: "Staff Members",
            templates: [
                "New Staff Created (Welcome Email)",
                "Forgot Password",
                "Password Reset - Confirmation",
                "Two Factor Authentication",
                "Staff Reminder Email",
                "Event Notification (Calendar)",
            ],
        },
        {
            title: "Leads",
            templates: ["New Lead Assigned to Staff Member", "Web-to-lead form submitted - Sent to lead"],
        },
        {
            title: "Estimate Request",
            templates: [
                "Estimate Request Submitted (Sent to Staff)",
                "Estimate Request Assigned (Sent to Staff)",
                "Estimate Request Received (Sent to User)",
            ],
        },
        {
            title: "Notifications",
            templates: ["Non-billed tasks reminder (sent to selected staff members)"],
        },
    ];

    const sectionTitleMap: Record<string, string> = {
        Tickets: t("setup.emailTemplates.sectionTickets"),
        Estimates: t("setup.emailTemplates.sectionEstimates"),
        Contracts: t("setup.emailTemplates.sectionContracts"),
        Invoices: t("setup.emailTemplates.sectionInvoices"),
        Subscriptions: t("setup.emailTemplates.sectionSubscriptions"),
        "Credit Note": t("setup.emailTemplates.sectionCreditNote"),
        Tasks: t("setup.emailTemplates.sectionTasks"),
        Customers: t("setup.emailTemplates.sectionCustomers"),
        Projects: t("setup.emailTemplates.sectionProjects"),
        "Staff Members": t("setup.emailTemplates.sectionStaffMembers"),
        Leads: t("setup.emailTemplates.sectionLeads"),
        "Estimate Request": t("setup.emailTemplates.sectionEstimateRequest"),
        Notifications: t("setup.emailTemplates.sectionNotifications"),
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">{t("setup.emailTemplates.title")}</h1>

            <div className="space-y-8">
                {templateSections.map((section) => (
                    <div key={section.title} className="bg-white rounded-lg border">
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h2 className="text-lg font-medium">{sectionTitleMap[section.title] || section.title}</h2>
                            <div className="flex gap-2 text-sm">
                                <button className="text-blue-600 hover:underline">{t("setup.emailTemplates.enableAll")}</button>
                                <span className="text-gray-400">|</span>
                                <button className="text-blue-600 hover:underline">{t("setup.emailTemplates.disableAll")}</button>
                            </div>
                        </div>
                        <div className="divide-y">
                            {section.templates.map((template, idx) => (
                                <div key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-500 min-w-[120px]">{t("setup.emailTemplates.templateName")}</span>
                                            <Link
                                                href={`/dashboard/setup/templates-docs/email-templates/edit?template=${encodeURIComponent(template)}&category=${encodeURIComponent(section.title)}`}
                                                className="text-blue-600 hover:underline text-left"
                                            >
                                                {template}
                                            </Link>
                                        </div>
                                    </div>
                                    <button className="text-blue-600 hover:underline text-sm">{t("setup.emailTemplates.disable")}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
