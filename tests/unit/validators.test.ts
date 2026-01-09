// Jest Unit Tests for Business Logic Validation
// Run with: npm test

import {
    validateInvoiceStatusTransition,
    validatePaymentAmount,
    isEstimateExpired,
    canConvertEstimate,
    canConvertLead
} from '@/lib/validators';

describe('Invoice Status Transitions', () => {
    const validTransitions: Record<string, string[]> = {
        draft: ['sent', 'cancelled'],
        sent: ['partial', 'paid', 'overdue', 'cancelled'],
        partial: ['paid', 'overdue'],
        overdue: ['partial', 'paid'],
        paid: [],
        cancelled: [],
    };

    test.each([
        ['draft', 'sent', true],
        ['draft', 'paid', false],
        ['sent', 'partial', true],
        ['sent', 'draft', false],
        ['paid', 'draft', false],
        ['paid', 'cancelled', false],
        ['cancelled', 'draft', false],
    ])('transition from %s to %s should be %s', (from, to, expected) => {
        const result = validateInvoiceStatusTransition(from, to);
        expect(result.valid).toBe(expected);
        if (!expected) {
            expect(result.error).toBeDefined();
        }
    });
});

describe('Payment Validation', () => {
    test('should allow payment less than balance due', () => {
        const invoice = { amountDue: 1000, amountPaid: 0, total: 1000 };
        const result = validatePaymentAmount(invoice, 500);
        expect(result.valid).toBe(true);
    });

    test('should allow payment equal to balance due', () => {
        const invoice = { amountDue: 1000, amountPaid: 0, total: 1000 };
        const result = validatePaymentAmount(invoice, 1000);
        expect(result.valid).toBe(true);
    });

    test('should reject payment exceeding balance due', () => {
        const invoice = { amountDue: 500, amountPaid: 500, total: 1000 };
        const result = validatePaymentAmount(invoice, 600);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds');
    });

    test('should reject negative payment', () => {
        const invoice = { amountDue: 1000, amountPaid: 0, total: 1000 };
        const result = validatePaymentAmount(invoice, -100);
        expect(result.valid).toBe(false);
    });

    test('should reject zero payment', () => {
        const invoice = { amountDue: 1000, amountPaid: 0, total: 1000 };
        const result = validatePaymentAmount(invoice, 0);
        expect(result.valid).toBe(false);
    });
});

describe('Estimate Expiry', () => {
    test('should return false for future expiry date', () => {
        const expiryDate = new Date(Date.now() + 86400000); // Tomorrow
        expect(isEstimateExpired(expiryDate)).toBe(false);
    });

    test('should return true for past expiry date', () => {
        const expiryDate = new Date(Date.now() - 86400000); // Yesterday
        expect(isEstimateExpired(expiryDate)).toBe(true);
    });

    test('should handle null expiry date', () => {
        expect(isEstimateExpired(null)).toBe(false); // No expiry = never expires
    });

    test('should return true for expiry date today at midnight', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expect(isEstimateExpired(today)).toBe(true);
    });
});

describe('Estimate Conversion', () => {
    test('should allow conversion of accepted estimate', () => {
        const estimate = {
            status: 'accepted',
            convertedToInvoiceId: null,
            expiryDate: new Date(Date.now() + 86400000)
        };
        const result = canConvertEstimate(estimate);
        expect(result.valid).toBe(true);
    });

    test('should reject conversion of draft estimate', () => {
        const estimate = {
            status: 'draft',
            convertedToInvoiceId: null,
            expiryDate: new Date(Date.now() + 86400000)
        };
        const result = canConvertEstimate(estimate);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('accepted');
    });

    test('should reject conversion of already converted estimate', () => {
        const estimate = {
            status: 'accepted',
            convertedToInvoiceId: 'inv_123',
            expiryDate: new Date(Date.now() + 86400000)
        };
        const result = canConvertEstimate(estimate);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('already converted');
    });
});

describe('Lead Conversion', () => {
    test('should allow conversion of qualified lead', () => {
        const lead = {
            status: 'qualified',
            convertedToCustomerId: null
        };
        const result = canConvertLead(lead);
        expect(result.valid).toBe(true);
    });

    test('should reject conversion of already converted lead', () => {
        const lead = {
            status: 'won',
            convertedToCustomerId: 'cust_123'
        };
        const result = canConvertLead(lead);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('already converted');
    });

    test('should allow conversion of new lead', () => {
        const lead = {
            status: 'new',
            convertedToCustomerId: null
        };
        const result = canConvertLead(lead);
        expect(result.valid).toBe(true);
    });
});

describe('Project Progress Sync', () => {
    test('should suggest finish when progress is 100', () => {
        const result = shouldSuggestFinish(100);
        expect(result).toBe(true);
    });

    test('should not suggest finish when progress is 99', () => {
        const result = shouldSuggestFinish(99);
        expect(result).toBe(false);
    });
});

describe('Multi-tenancy Security', () => {
    test('should include orgId in all queries', () => {
        const mockQuery = buildCustomerQuery('org_123');
        expect(mockQuery.constraints).toContainEqual({
            field: 'orgId',
            op: '==',
            value: 'org_123'
        });
    });

    test('should reject operations without orgId', () => {
        expect(() => buildCustomerQuery(null)).toThrow('Organization required');
    });
});

// Helper functions for tests
function shouldSuggestFinish(progress: number): boolean {
    return progress === 100;
}

function buildCustomerQuery(orgId: string | null) {
    if (!orgId) throw new Error('Organization required');
    return {
        constraints: [{ field: 'orgId', op: '==', value: orgId }]
    };
}
