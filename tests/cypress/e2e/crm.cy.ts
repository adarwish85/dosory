// Cypress E2E Tests for CRM Platform
// Run with: npx cypress run

describe('Customer Management', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123');
        cy.visit('/dashboard/customers');
    });

    it('[CUS-001] should create new customer', () => {
        cy.get('[data-testid="new-customer-btn"]').click();

        cy.get('[name="company"]').type('Acme Corporation');
        cy.get('[name="email"]').type('contact@acme.com');
        cy.get('[name="phone"]').type('+1234567890');
        cy.get('[name="website"]').type('https://acme.com');

        cy.get('[data-testid="submit-btn"]').click();

        cy.contains('Customer created').should('be.visible');
        cy.contains('Acme Corporation').should('be.visible');
    });

    it('[CUS-002] should search customers', () => {
        cy.get('[data-testid="search-input"]').type('Acme');

        cy.get('[data-testid="customer-row"]').should('have.length.at.least', 1);
        cy.get('[data-testid="customer-row"]').each(($row) => {
            cy.wrap($row).should('contain.text', 'Acme');
        });
    });

    it('[CUS-003] should update customer status', () => {
        cy.get('[data-testid="customer-row"]').first().click();
        cy.get('[data-testid="status-select"]').click();
        cy.get('[data-value="inactive"]').click();

        cy.contains('Status updated').should('be.visible');
    });
});

describe('Lead Management', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123');
        cy.visit('/dashboard/leads');
    });

    it('[LEAD-001] should create new lead', () => {
        cy.get('[data-testid="new-lead-btn"]').click();

        cy.get('[name="name"]').type('John Doe');
        cy.get('[name="email"]').type('john@example.com');
        cy.get('[name="company"]').type('Example Inc');
        cy.get('[name="source"]').select('Website');
        cy.get('[name="value"]').type('10000');

        cy.get('[data-testid="submit-btn"]').click();

        cy.contains('Lead created').should('be.visible');
        cy.contains('John Doe').should('be.visible');
    });

    it('[LEAD-003] should convert lead to customer', () => {
        cy.get('[data-testid="lead-row"]').first().click();
        cy.get('[data-testid="convert-btn"]').click();
        cy.get('[data-testid="confirm-convert"]').click();

        cy.contains('Converted to customer').should('be.visible');
        cy.visit('/dashboard/customers');
        // Verify customer was created
    });
});

describe('Invoice Management', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123');
        cy.visit('/dashboard/invoices');
    });

    it('[INV-001] should create invoice with line items', () => {
        cy.get('[data-testid="new-invoice-btn"]').click();

        cy.get('[data-testid="customer-select"]').click();
        cy.get('[data-value]').first().click();

        // Add line item
        cy.get('[data-testid="add-item-btn"]').click();
        cy.get('[name="items.0.description"]').type('Consulting Services');
        cy.get('[name="items.0.quantity"]').type('10');
        cy.get('[name="items.0.rate"]').type('100');

        cy.get('[data-testid="submit-btn"]').click();

        cy.contains('Invoice created').should('be.visible');
        cy.get('[data-testid="total"]').should('contain', '1000');
    });

    it('[INV-002] should record partial payment', () => {
        cy.get('[data-testid="invoice-row"]').first().click();
        cy.get('[data-testid="record-payment-btn"]').click();

        cy.get('[name="amount"]').type('400');
        cy.get('[name="paymentMode"]').select('Bank Transfer');

        cy.get('[data-testid="submit-payment"]').click();

        cy.contains('Payment recorded').should('be.visible');
        cy.get('[data-testid="status"]').should('contain', 'Partial');
    });

    it('[INV-002-edge] should prevent overpayment', () => {
        // Assuming invoice has amountDue of $500
        cy.get('[data-testid="invoice-row"]').first().click();
        cy.get('[data-testid="record-payment-btn"]').click();

        cy.get('[name="amount"]').type('999999');
        cy.get('[data-testid="submit-payment"]').click();

        cy.contains('Payment exceeds balance due').should('be.visible');
    });

    it('[INV-STATUS] should validate status transitions', () => {
        // Draft -> Sent is valid
        cy.get('[data-testid="invoice-row"][data-status="draft"]').first().click();
        cy.get('[data-testid="send-btn"]').click();
        cy.contains('Invoice sent').should('be.visible');

        // Can't go back to draft from sent
        cy.get('[data-testid="status-select"]').should('not.have.option', 'draft');
    });
});

describe('Estimate Management', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123');
        cy.visit('/dashboard/sales/estimates');
    });

    it('[EST-002-edge] should reject expired estimate acceptance', () => {
        // Find an expired estimate
        cy.get('[data-testid="estimate-row"][data-expired="true"]').first().click();
        cy.get('[data-testid="accept-btn"]').click();

        cy.contains('expired').should('be.visible');
    });

    it('[EST-003] should convert estimate to invoice', () => {
        cy.get('[data-testid="estimate-row"][data-status="accepted"]').first().click();
        cy.get('[data-testid="convert-invoice-btn"]').click();

        cy.contains('Invoice created').should('be.visible');
        cy.url().should('include', '/invoices');
    });

    it('[EST-003-edge] should prevent duplicate conversion', () => {
        // Find already converted estimate
        cy.get('[data-testid="estimate-row"][data-converted="true"]').first().click();
        cy.get('[data-testid="convert-invoice-btn"]').should('be.disabled');
    });
});

describe('Project Management', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123');
        cy.visit('/dashboard/projects');
    });

    it('[PROJ-002] should sync progress with status', () => {
        cy.get('[data-testid="project-row"]').first().click();

        // Update progress to 100%
        cy.get('[data-testid="progress-slider"]').invoke('val', 100).trigger('change');

        // Should prompt to finish
        cy.contains('Mark as finished?').should('be.visible');
        cy.get('[data-testid="confirm-finish"]').click();

        cy.get('[data-testid="status"]').should('contain', 'Finished');
    });

    it('[PROJ-002-reverse] should set progress when marking finished', () => {
        cy.get('[data-testid="project-row"]').first().click();
        cy.get('[data-testid="status-select"]').click();
        cy.get('[data-value="finished"]').click();

        cy.get('[data-testid="progress"]').should('have.value', '100');
    });
});

describe('Support Tickets', () => {
    beforeEach(() => {
        cy.login('test@example.com', 'password123');
        cy.visit('/dashboard/support');
    });

    it('[TKT-001] should create support ticket', () => {
        cy.get('[data-testid="new-ticket-btn"]').click();

        cy.get('[name="subject"]').type('Cannot access my account');
        cy.get('[name="department"]').select('Technical Support');
        cy.get('[name="priority"]').select('high');
        cy.get('[name="message"]').type('I am getting an error when trying to login.');

        cy.get('[data-testid="submit-btn"]').click();

        cy.contains('Ticket created').should('be.visible');
    });

    it('[TKT-002] should update status on staff reply', () => {
        cy.get('[data-testid="ticket-row"][data-status="open"]').first().click();

        cy.get('[data-testid="reply-input"]').type('We are looking into this issue.');
        cy.get('[data-testid="send-reply-btn"]').click();

        cy.get('[data-testid="status"]').should('contain', 'Answered');
    });
});

// Custom Commands
Cypress.Commands.add('login', (email, password) => {
    cy.visit('/login');
    cy.get('[name="email"]').type(email);
    cy.get('[name="password"]').type(password);
    cy.get('[type="submit"]').click();
    cy.url().should('include', '/dashboard');
});
