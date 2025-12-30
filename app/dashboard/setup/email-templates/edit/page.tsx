"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function TemplateEditorContent() {
    const searchParams = useSearchParams();
    const templateName = searchParams.get("template") || "";
    const category = searchParams.get("category") || "";

    // Comprehensive merge fields for all categories
    const allMergeFields = {
        staff: [
            { label: "Staff Firstname", value: "{staff_firstname}" },
            { label: "Staff Lastname", value: "{staff_lastname}" },
            { label: "Staff Email", value: "{staff_email}" },
        ],
        client: [
            { label: "Contact Firstname", value: "{contact_firstname}" },
            { label: "Contact Lastname", value: "{contact_lastname}" },
            { label: "Contact Phone Number", value: "{contact_phonenumber}" },
            { label: "Contact Title", value: "{contact_title}" },
            { label: "Contact Email", value: "{contact_email}" },
            { label: "Client Company", value: "{client_company}" },
            { label: "Client Phone Number", value: "{client_phonenumber}" },
            { label: "Client Country", value: "{client_country}" },
            { label: "Client City", value: "{client_city}" },
            { label: "Client Zip", value: "{client_zip}" },
            { label: "Client State", value: "{client_state}" },
            { label: "Client Address", value: "{client_address}" },
            { label: "Client Vat Number", value: "{client_vat_number}" },
            { label: "Client ID", value: "{client_id}" },
            { label: "Client Website", value: "{client_website}" },
        ],
        ticket: [
            { label: "Ticket ID", value: "{ticket_id}" },
            { label: "Ticket URL", value: "{ticket_url}" },
            { label: "Ticket Public URL", value: "{ticket_public_url}" },
            { label: "Department", value: "{ticket_department}" },
            { label: "Department Email", value: "{ticket_department_email}" },
            { label: "Date Opened", value: "{ticket_date}" },
            { label: "Ticket Subject", value: "{ticket_subject}" },
            { label: "Ticket Message", value: "{ticket_message}" },
            { label: "Ticket Status", value: "{ticket_status}" },
            { label: "Ticket Priority", value: "{ticket_priority}" },
            { label: "Ticket Service", value: "{ticket_service}" },
        ],
        invoice: [
            { label: "Invoice ID", value: "{invoice_id}" },
            { label: "Invoice Number", value: "{invoice_number}" },
            { label: "Invoice URL", value: "{invoice_url}" },
            { label: "Invoice Date", value: "{invoice_date}" },
            { label: "Invoice Due Date", value: "{invoice_duedate}" },
            { label: "Invoice Subtotal", value: "{invoice_subtotal}" },
            { label: "Invoice Total", value: "{invoice_total}" },
            { label: "Invoice Amount Due", value: "{invoice_amount_due}" },
            { label: "Invoice Status", value: "{invoice_status}" },
            { label: "Payment Link", value: "{payment_link}" },
        ],
        estimate: [
            { label: "Estimate ID", value: "{estimate_id}" },
            { label: "Estimate Number", value: "{estimate_number}" },
            { label: "Estimate URL", value: "{estimate_url}" },
            { label: "Estimate Date", value: "{estimate_date}" },
            { label: "Estimate Expiry Date", value: "{estimate_expirydate}" },
            { label: "Estimate Subtotal", value: "{estimate_subtotal}" },
            { label: "Estimate Total", value: "{estimate_total}" },
            { label: "Estimate Status", value: "{estimate_status}" },
            { label: "Estimate Reference", value: "{estimate_reference}" },
        ],
        contract: [
            { label: "Contract ID", value: "{contract_id}" },
            { label: "Contract Subject", value: "{contract_subject}" },
            { label: "Contract Value", value: "{contract_value}" },
            { label: "Contract Start Date", value: "{contract_start_date}" },
            { label: "Contract End Date", value: "{contract_end_date}" },
            { label: "Contract Type", value: "{contract_type}" },
            { label: "Contract Description", value: "{contract_description}" },
            { label: "Contract Link", value: "{contract_link}" },
        ],
        project: [
            { label: "Project Name", value: "{project_name}" },
            { label: "Project Description", value: "{project_description}" },
            { label: "Project Start Date", value: "{project_start_date}" },
            { label: "Project Deadline", value: "{project_deadline}" },
            { label: "Project Status", value: "{project_status}" },
            { label: "Project Link", value: "{project_link}" },
        ],
        task: [
            { label: "Task Name", value: "{task_name}" },
            { label: "Task Description", value: "{task_description}" },
            { label: "Task Status", value: "{task_status}" },
            { label: "Task Priority", value: "{task_priority}" },
            { label: "Task Start Date", value: "{task_startdate}" },
            { label: "Task Due Date", value: "{task_duedate}" },
            { label: "Task Link", value: "{task_link}" },
        ],
        subscription: [
            { label: "Subscription ID", value: "{subscription_id}" },
            { label: "Subscription Name", value: "{subscription_name}" },
            { label: "Subscription Description", value: "{subscription_description}" },
            { label: "Subscription Date", value: "{subscription_date}" },
            { label: "Subscription Amount", value: "{subscription_amount}" },
            { label: "Subscription Status", value: "{subscription_status}" },
        ],
        proposal: [
            { label: "Proposal ID", value: "{proposal_id}" },
            { label: "Proposal Number", value: "{proposal_number}" },
            { label: "Proposal Subject", value: "{proposal_subject}" },
            { label: "Proposal Total", value: "{proposal_total}" },
            { label: "Proposal Date", value: "{proposal_date}" },
            { label: "Proposal Open Till", value: "{proposal_open_till}" },
            { label: "Proposal Link", value: "{proposal_link}" },
        ],
        lead: [
            { label: "Lead Name", value: "{lead_name}" },
            { label: "Lead Email", value: "{lead_email}" },
            { label: "Lead Phone", value: "{lead_phonenumber}" },
            { label: "Lead Company", value: "{lead_company}" },
            { label: "Lead Source", value: "{lead_source}" },
            { label: "Lead Status", value: "{lead_status}" },
            { label: "Lead Link", value: "{lead_link}" },
        ],
        creditNote: [
            { label: "Credit Note ID", value: "{credit_note_id}" },
            { label: "Credit Note Number", value: "{credit_note_number}" },
            { label: "Credit Note Date", value: "{credit_note_date}" },
            { label: "Credit Note Total", value: "{credit_note_total}" },
            { label: "Credit Note Status", value: "{credit_note_status}" },
            { label: "Credit Note Link", value: "{credit_note_link}" },
        ],
        estimateRequest: [
            { label: "Estimate Request ID", value: "{estimate_request_id}" },
            { label: "Request Email", value: "{estimate_request_email}" },
            { label: "Request Submitted", value: "{estimate_request_submitted}" },
            { label: "Request Status", value: "{estimate_request_status}" },
            { label: "Request Link", value: "{estimate_request_link}" },
        ],
        other: [
            { label: "Logo URL", value: "{logo_url}" },
            { label: "Logo image with URL", value: "{logo_image_with_url}" },
            { label: "Dark logo image with URL", value: "{dark_logo_image_with_url}" },
            { label: "CRM URL", value: "{crm_url}" },
            { label: "Company Name", value: "{companyname}" },
        ],
    };

    // Define which merge fields to show for each category
    const categoryMergeFieldsMap: Record<string, string[]> = {
        Tickets: ["staff", "client", "ticket", "other"],
        Estimates: ["staff", "client", "estimate", "other"],
        Contracts: ["staff", "client", "contract", "other"],
        Invoices: ["staff", "client", "invoice", "other"],
        Subscriptions: ["staff", "client", "subscription", "other"],
        "Credit Note": ["staff", "client", "creditNote", "other"],
        Tasks: ["staff", "client", "task", "project", "other"],
        Customers: ["client", "other"],
        Proposals: ["staff", "client", "proposal", "other"],
        Projects: ["staff", "client", "project", "other"],
        "Staff Members": ["staff", "other"],
        Leads: ["staff", "lead", "other"],
        "Estimate Request": ["staff", "estimateRequest", "other"],
        Notifications: ["staff", "task", "other"],
    };

    // Get the relevant merge fields for the current category
    const relevantFieldKeys = categoryMergeFieldsMap[category] || ["client", "other"];
    const mergeFields: Record<string, Array<{ label: string; value: string }>> = {};

    relevantFieldKeys.forEach((key) => {
        if (allMergeFields[key as keyof typeof allMergeFields]) {
            mergeFields[key] = allMergeFields[key as keyof typeof allMergeFields];
        }
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                {/* Main Editor Area */}
                <div className="flex-1 p-6">
                    <div className="bg-white rounded-lg border p-6 mb-6">
                        <h1 className="text-xl font-semibold mb-6">{templateName}</h1>

                        <div className="space-y-4">
                            {/* Template Title */}
                            <div className="space-y-2">
                                <Label className="text-red-500">* Template Title</Label>
                                <Input defaultValue={templateName} className="bg-gray-50" />
                            </div>

                            {/* Subject */}
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input defaultValue="New Support Ticket Opened" placeholder="Subject" />
                            </div>

                            {/* From Name */}
                            <div className="space-y-2">
                                <Label className="text-red-500">* From Name</Label>
                                <Input defaultValue="{companyname} | Technical Support" placeholder="From Name" />
                            </div>

                            {/* Checkboxes */}
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="plaintext" />
                                    <label
                                        htmlFor="plaintext"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Send as Plaintext
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="disabled" />
                                    <label
                                        htmlFor="disabled"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Disabled
                                    </label>
                                </div>
                            </div>

                            {/* Rich Text Editor */}
                            <div className="space-y-2">
                                <Label>English</Label>
                                <div className="border rounded-md bg-white">
                                    {/* Toolbar */}
                                    <div className="border-b p-2 flex items-center gap-2 bg-gray-50">
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>File</option>
                                        </select>
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>Edit</option>
                                        </select>
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>View</option>
                                        </select>
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>Insert</option>
                                        </select>
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>Format</option>
                                        </select>
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>Tools</option>
                                        </select>
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>Table</option>
                                        </select>
                                    </div>

                                    {/* Format Bar */}
                                    <div className="border-b p-2 flex items-center gap-2 bg-gray-50">
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>System Font</option>
                                        </select>
                                        <select className="border rounded px-2 py-1 text-sm">
                                            <option>12pt</option>
                                        </select>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <span className="font-bold">A</span>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <span>✏️</span>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <span>•••</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Editor Content */}
                                    <div className="p-4 min-h-[300px] font-mono text-sm leading-relaxed">
                                        <p>
                                            Hi {"{contact_firstname}"} {"{contact_lastname}"}
                                        </p>
                                        <br />
                                        <p>New support ticket has been opened.</p>
                                        <br />
                                        <p>
                                            <strong>Subject:</strong> {"{ticket_subject}"}
                                        </p>
                                        <p>
                                            <strong>Department:</strong> {"{ticket_department}"}
                                        </p>
                                        <p>
                                            <strong>Priority:</strong> {"{ticket_priority}"}
                                        </p>
                                        <br />
                                        <p>
                                            <strong>Ticket message:</strong>
                                        </p>
                                        <p>{"{ticket_message}"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">Save</Button>
                    </div>
                </div>

                {/* Merge Fields Sidebar */}
                <div className="w-96 bg-white border-l p-6">
                    <h2 className="text-lg font-semibold mb-4">Available merge fields</h2>

                    {category === "Tickets" && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-6 text-sm">
                            If ticket is imported with email piping and the contact does not exists in the CRM the
                            fields won't be replaced.
                        </div>
                    )}

                    <div className="space-y-6">
                        {Object.entries(mergeFields).map(([sectionKey, fields]) => {
                            // Create readable section titles
                            const sectionTitles: Record<string, string> = {
                                staff: "Staff",
                                client: "Client",
                                ticket: "Ticket",
                                invoice: "Invoice",
                                estimate: "Estimate",
                                contract: "Contract",
                                project: "Projects",
                                task: "Task",
                                subscription: "Subscription",
                                proposal: "Proposal",
                                lead: "Lead",
                                creditNote: "Credit Note",
                                estimateRequest: "Estimate Request",
                                other: "Other",
                            };

                            return (
                                <div key={sectionKey}>
                                    <h3 className="font-semibold mb-3">{sectionTitles[sectionKey] || sectionKey}</h3>
                                    <div className="space-y-2">
                                        {fields.map((field, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-700">{field.label}</span>
                                                <code className="text-blue-600 text-xs">{field.value}</code>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function EditTemplatePage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <TemplateEditorContent />
        </Suspense>
    );
}
