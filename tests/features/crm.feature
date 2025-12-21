# CRM Use Cases - Gherkin Feature Files

## Feature: Customer Management

Feature: Customer Management
  As a staff member
  I want to manage customers
  So that I can track business relationships

  @critical @CUS-001
  Scenario: Create new customer
    Given I am logged in as a staff user
    And I have customers_create permission
    When I click "New Customer" button
    And I fill in company name "Acme Corp"
    And I fill in contact email "contact@acme.com"
    And I fill in phone "+1234567890"
    And I click "Save"
    Then I should see success message "Customer created"
    And the customer should appear in the customers list
    And the customer should have orgId matching my organization

  @high @CUS-002
  Scenario: Search and filter customers
    Given I am logged in as a staff user
    And there are customers in the system
    When I type "Acme" in the search field
    Then I should see only customers matching "Acme"
    And the results should update in real-time

  @medium @CUS-003
  Scenario: Update customer status
    Given I am logged in as a staff user
    And a customer "Acme Corp" exists with status "active"
    When I navigate to customer detail
    And I change status to "inactive"
    Then the customer status should be "inactive"
    And the customer list should reflect the status change

  @edge-case
  Scenario: Archive customer with outstanding invoices
    Given a customer has unpaid invoices totaling $5000
    When I try to archive the customer
    Then I should see warning "Customer has outstanding balance"
    And I should be prompted to confirm or cancel

---

## Feature: Lead Management

Feature: Lead Management
  As a sales representative
  I want to manage leads
  So that I can track and convert prospects

  @critical @LEAD-001
  Scenario: Create new lead
    Given I am logged in as a sales rep
    And I have leads_create permission
    When I click "New Lead"
    And I fill in name "John Doe"
    And I fill in email "john@example.com"
    And I fill in company "Example Inc"
    And I select source "Website"
    And I click "Save"
    Then the lead should be created with status "new"
    And the lead should appear in the leads list
    And leadStats should be updated

  @high @LEAD-002
  Scenario: Update lead status through pipeline
    Given a lead exists with status "new"
    When I change status to "contacted"
    Then the status should update to "contacted"
    And stats cards should reflect the change

  @critical @LEAD-003
  Scenario: Convert lead to customer
    Given a lead exists with status "qualified"
    And the lead has proposals linked to it
    When I click "Convert to Customer"
    Then a new customer should be created
    And the customer should have lead data transferred
    And linked proposals should be transferred to the customer
    And the lead status should be "won"
    And dateConverted should be set

  @edge-case
  Scenario: Attempt to re-convert already converted lead
    Given a lead has already been converted
    When I try to convert again
    Then I should see error "Lead already converted"
    And no duplicate customer should be created

---

## Feature: Invoice Management

Feature: Invoice Management
  As a staff member
  I want to manage invoices
  So that I can track revenue

  @critical @INV-001
  Scenario: Create invoice with line items
    Given I am logged in as a staff user
    And a customer "Acme Corp" exists
    When I click "New Invoice"
    And I select customer "Acme Corp"
    And I add line item "Consulting" with quantity 10 and rate 100
    And I set due date to 30 days from now
    And I click "Save"
    Then the invoice should be created with status "draft"
    And the invoice number should be generated
    And total should be 1000
    And amountDue should equal total

  @critical @INV-002
  Scenario: Record partial payment
    Given an invoice exists with total $1000 and amountPaid $0
    When I record payment of $400
    Then amountPaid should be $400
    And amountDue should be $600
    And status should be "partial"

  @critical @INV-002-edge
  Scenario: Prevent overpayment
    Given an invoice has amountDue of $500
    When I try to record payment of $600
    Then I should see error "Payment exceeds balance due"
    And the payment should not be recorded

  @high @INV-003
  Scenario: Send invoice to customer
    Given an invoice in "draft" status
    And the customer has email "customer@example.com"
    When I click "Send"
    Then the invoice status should change to "sent"
    And sentAt timestamp should be recorded

  @critical @status-transition
  Scenario Outline: Invoice status transition validation
    Given an invoice with status "<current>"
    When I try to change status to "<target>"
    Then the result should be "<result>"

    Examples:
      | current | target   | result  |
      | draft   | sent     | success |
      | draft   | paid     | error   |
      | sent    | partial  | success |
      | paid    | draft    | error   |

---

## Feature: Estimate Management

Feature: Estimate Management
  As a sales rep
  I want to create and manage estimates
  So customers can approve pricing

  @high @EST-001
  Scenario: Create estimate with expiry date
    Given I am logged in
    And a customer exists
    When I create an estimate with expiry in 30 days
    Then the estimate should be saved as "draft"
    And expiryDate should be set

  @critical @EST-002
  Scenario: Accept estimate before expiry
    Given an estimate with expiryDate tomorrow
    And status is "sent"
    When I mark as accepted
    Then status should change to "accepted"
    And acceptedAt should be recorded

  @critical @EST-002-edge
  Scenario: Reject acceptance of expired estimate
    Given an estimate with expiryDate yesterday
    When I try to mark as accepted
    Then I should see error containing "expired"
    And status should remain unchanged

  @critical @EST-003
  Scenario: Convert estimate to invoice
    Given an estimate with status "accepted"
    When I click "Convert to Invoice"
    Then a new invoice should be created
    And the invoice should have the same line items
    And convertedToInvoiceId should be set on estimate

  @edge-case
  Scenario: Prevent duplicate conversion
    Given an estimate has already been converted
    When I try to convert again
    Then I should see error "already converted"

---

## Feature: Project Management

Feature: Project Management
  As a project manager
  I want to track project progress
  So I can deliver on time

  @high @PROJ-001
  Scenario: Create project for customer
    Given a customer exists
    When I create project "Website Redesign"
    And I link to customer
    And I set deadline
    Then project should be created with status "not_started"
    And progress should be 0

  @medium @PROJ-002
  Scenario: Progress auto-syncs with status
    Given a project with progress 50%
    When I update progress to 100%
    Then I should be prompted to mark as "finished"
    
  Scenario: Status auto-syncs with progress
    Given a project in progress
    When I change status to "finished"
    Then progress should automatically be set to 100%
    And finishedAt should be recorded

---

## Feature: Support Tickets

Feature: Support Ticket Management
  As support staff
  I want to manage tickets
  So I can resolve customer issues

  @high @TKT-001
  Scenario: Create support ticket
    Given I am logged in
    When I submit ticket with subject "Login issue"
    And I select department "Technical"
    And I set priority "high"
    Then ticket should be created with status "open"
    And ticket should appear in department queue

  @high @TKT-002
  Scenario: Staff reply updates ticket
    Given a ticket with status "open"
    When staff adds reply
    Then status should change to "answered"
    And lastReply should be updated
    And lastReplyByStaff should be true
