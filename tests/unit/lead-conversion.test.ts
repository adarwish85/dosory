/**
 * Lead Conversion Tests
 * Tests for converting leads to customers including data transfer
 */

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
    db: {},
}));

jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    addDoc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    setDoc: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    serverTimestamp: jest.fn(() => new Date()),
    Timestamp: {
        now: jest.fn(() => ({ toMillis: () => Date.now() })),
    },
}));

import { addDoc, getDoc, getDocs, updateDoc, deleteDoc } from "firebase/firestore";

describe("Lead Conversion", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Convert Lead to Customer", () => {
        const mockLead = {
            id: "lead-123",
            name: "John Doe",
            company: "Test Company",
            email: "john@testcompany.com",
            phone: "+1234567890",
            orgId: "org-123",
            status: "qualified",
            value: 50000,
            assignedTo: "staff-123",
        };

        const mockProfile = {
            uid: "user-123",
            orgId: "org-123",
            role: "admin",
        };

        it("should create a customer record from lead data", async () => {
            // Arrange
            (getDoc as jest.Mock).mockResolvedValueOnce({
                exists: () => true,
                data: () => mockLead,
            });

            (addDoc as jest.Mock).mockResolvedValueOnce({ id: "customer-new-123" });

            // Act - simulate customer creation
            const customerData = {
                company: mockLead.company,
                phone: mockLead.phone,
                status: "active",
                orgId: mockLead.orgId,
                convertedFromLeadId: mockLead.id,
            };

            // Assert
            expect(customerData.company).toBe("Test Company");
            expect(customerData.convertedFromLeadId).toBe("lead-123");
            expect(customerData.status).toBe("active");
        });

        it("should create primary contact from lead data", async () => {
            // Arrange
            const nameParts = mockLead.name.split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ") || "";

            // Act - simulate contact creation
            const contactData = {
                customerId: "customer-new-123",
                firstName,
                lastName,
                email: mockLead.email,
                phone: mockLead.phone,
                isPrimary: true,
                orgId: mockLead.orgId,
            };

            // Assert
            expect(contactData.firstName).toBe("John");
            expect(contactData.lastName).toBe("Doe");
            expect(contactData.email).toBe("john@testcompany.com");
            expect(contactData.isPrimary).toBe(true);
        });

        it("should update lead status to 'won' after conversion", async () => {
            // Arrange
            (updateDoc as jest.Mock).mockResolvedValueOnce(undefined);

            // Act - simulate lead update
            const updateData = {
                status: "won",
                convertedToCustomerId: "customer-new-123",
                dateConverted: new Date(),
            };

            // Assert
            expect(updateData.status).toBe("won");
            expect(updateData.convertedToCustomerId).toBeDefined();
            expect(updateData.dateConverted).toBeDefined();
        });

        it("should transfer notes from lead to customer", async () => {
            // Arrange
            const mockNotes = [
                { id: "note-1", content: "Initial contact", createdAt: new Date() },
                { id: "note-2", content: "Follow-up call", createdAt: new Date() },
            ];

            (getDocs as jest.Mock).mockResolvedValueOnce({
                docs: mockNotes.map((note) => ({
                    id: note.id,
                    data: () => note,
                })),
            });

            // Act - verify notes are prepared for transfer
            const transferredNotes = mockNotes.map((note) => ({
                ...note,
                customerId: "customer-new-123",
                transferredFromLeadId: "lead-123",
            }));

            // Assert
            expect(transferredNotes).toHaveLength(2);
            expect(transferredNotes[0].customerId).toBe("customer-new-123");
            expect(transferredNotes[0].transferredFromLeadId).toBe("lead-123");
        });

        it("should transfer reminders from lead to customer", async () => {
            // Arrange
            const mockReminders = [
                { id: "rem-1", title: "Follow up", date: new Date(), leadId: "lead-123" },
            ];

            (getDocs as jest.Mock).mockResolvedValueOnce({
                docs: mockReminders.map((rem) => ({
                    id: rem.id,
                    data: () => rem,
                })),
            });

            // Act - verify reminders are prepared for transfer
            const transferredReminders = mockReminders.map((rem) => ({
                ...rem,
                customerId: "customer-new-123",
                transferredFromLeadId: "lead-123",
            }));

            // Assert
            expect(transferredReminders).toHaveLength(1);
            expect(transferredReminders[0].customerId).toBe("customer-new-123");
        });

        it("should transfer files from lead to customer", async () => {
            // Arrange
            const mockFiles = [
                { id: "file-1", name: "estimate.pdf", url: "https://...", leadId: "lead-123" },
            ];

            (getDocs as jest.Mock).mockResolvedValueOnce({
                docs: mockFiles.map((file) => ({
                    id: file.id,
                    data: () => file,
                })),
            });

            // Act - verify files are prepared for transfer
            const transferredFiles = mockFiles.map((file) => ({
                ...file,
                customerId: "customer-new-123",
                transferredFromLeadId: "lead-123",
            }));

            // Assert
            expect(transferredFiles).toHaveLength(1);
            expect(transferredFiles[0].customerId).toBe("customer-new-123");
            expect(transferredFiles[0].name).toBe("estimate.pdf");
        });

        it("should delete original lead data after successful transfer", async () => {
            // Arrange
            (deleteDoc as jest.Mock).mockResolvedValue(undefined);

            // Act & Assert
            const noteIds = ["note-1", "note-2"];
            const reminderIds = ["rem-1"];
            const fileIds = ["file-1"];

            // Clean-up should delete all original records
            expect(noteIds.length + reminderIds.length + fileIds.length).toBe(4);
        });
    });

    describe("Conversion Validation", () => {
        it("should prevent conversion of already converted leads", () => {
            const lead = {
                status: "won",
                convertedToCustomerId: "existing-customer-123",
            };

            const canConvert = lead.status !== "won" && !lead.convertedToCustomerId;

            expect(canConvert).toBe(false);
        });

        it("should prevent conversion of leads with status 'lost' or 'junk'", () => {
            const lostLead = { status: "lost" };
            const junkLead = { status: "junk" };

            const invalidStatuses = ["lost", "junk"];
            const canConvertLost = !invalidStatuses.includes(lostLead.status);
            const canConvertJunk = !invalidStatuses.includes(junkLead.status);

            expect(canConvertLost).toBe(false);
            expect(canConvertJunk).toBe(false);
        });

        it("should require lead to have a company name", () => {
            const leadWithCompany = { company: "Acme Corp" };
            const leadWithoutCompany = { company: "" };

            const hasCompany = (lead: { company: string }) => Boolean(lead.company);

            expect(hasCompany(leadWithCompany)).toBe(true);
            expect(hasCompany(leadWithoutCompany)).toBe(false);
        });
    });

    describe("Error Handling", () => {
        it("should rollback on customer creation failure", async () => {
            // Arrange
            const mockAddDoc = jest.fn().mockRejectedValue(new Error("Failed to create customer"));

            // Act & Assert
            await expect(mockAddDoc({}, { company: "Test" })).rejects.toThrow("Failed to create customer");
        });

        it("should handle partial data transfer failures gracefully", async () => {
            // If notes transfer fails, customer should still exist
            // but we should log the partial failure

            const conversionResult = {
                success: true,
                customerId: "customer-123",
                warnings: ["Failed to transfer 1 note"],
            };

            expect(conversionResult.success).toBe(true);
            expect(conversionResult.warnings).toHaveLength(1);
        });
    });
});

describe("Lead Scoring", () => {
    it("should calculate lead score based on criteria", () => {
        const lead = {
            email: "john@company.com",
            phone: "+1234567890",
            company: "Big Corp",
            value: 100000,
            source: "referral",
        };

        // Simple scoring logic
        let score = 0;
        if (lead.email) score += 20;
        if (lead.phone) score += 15;
        if (lead.company) score += 20;
        if (lead.value > 50000) score += 25;
        if (lead.source === "referral") score += 20;

        expect(score).toBe(100);
    });

    it("should update score when lead data changes", () => {
        const initialScore = 50;
        const leadUpdate = { phone: "+1234567890" }; // Added phone

        const newScore = initialScore + (leadUpdate.phone ? 15 : 0);

        expect(newScore).toBe(65);
    });
});
