# Test Plan: CRM/ERP SaaS Platform

## Overview
Comprehensive test suite covering all 14 modules with 25+ use cases.

---

## Priority Definitions
| Priority | Description | SLA |
|----------|-------------|-----|
| **Critical** | Core business functions, data integrity | Must fix immediately |
| **High** | Major features, security | Fix within 24 hours |
| **Medium** | Secondary features | Fix within 1 week |
| **Low** | Nice-to-have, cosmetic | Backlog |

---

## Test Coverage by Module

### 1. Customers Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| CUS-001 | Create customer | Critical | Data loss |
| CUS-002 | Search customers | High | UX degradation |
| CUS-003 | Update status | Medium | Status inconsistency |

### 2. Leads Module  
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| LEAD-001 | Create lead | Critical | Lost sales opportunities |
| LEAD-002 | Update status | High | Pipeline inaccuracy |
| LEAD-003 | Convert to customer | Critical | Data transfer failure |

### 3. Invoices Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| INV-001 | Create invoice | Critical | Revenue tracking |
| INV-002 | Record payment | Critical | Financial accuracy |
| INV-003 | Send invoice | High | Customer communication |

### 4. Estimates Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| EST-001 | Create estimate | High | Sales process |
| EST-002 | Convert to invoice | Critical | Double conversion |

### 5. Proposals Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| PROP-001 | Create proposal | High | Sales pipeline |
| PROP-002 | Client acceptance | Critical | Contract enforcement |

### 6. Projects Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| PROJ-001 | Create project | High | Project tracking |
| PROJ-002 | Update progress | Medium | Status sync |

### 7. Tasks Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| TASK-001 | Create task | Medium | Work tracking |
| TASK-002 | Change status | Medium | Workflow integrity |

### 8. Support Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| TKT-001 | Create ticket | High | Customer support SLA |
| TKT-002 | Reply to ticket | High | Response time |

### 9. Staff Module
| Test ID | Scenario | Priority | Risk |
|---------|----------|----------|------|
| STF-001 | Add staff | High | Access control |
| STF-002 | Toggle status | Critical | Security breach |

---

## Risk Assessment Matrix

| Module | Business Impact | Likelihood | Risk Level |
|--------|-----------------|------------|------------|
| Invoices | High | Medium | Critical |
| Leads | High | Medium | Critical |
| Staff | High | Low | High |
| Customers | Medium | Medium | High |
| Projects | Medium | Low | Medium |
| Tasks | Low | Low | Low |

---

## Recommended Fix Actions

### Critical Fixes (Implement Immediately)
1. **Invoice Status Validation** - ✅ Implemented
2. **Payment Overpayment Check** - ✅ Implemented  
3. **Estimate Expiry Enforcement** - ✅ Implemented
4. **Lead Conversion Data Transfer** - ✅ Implemented

### High Priority Fixes
1. **Client Proposal Portal** - TODO
2. **Subscription Auto-billing Cloud Function** - TODO
3. **Contract Auto-expiry** - TODO

### Medium Priority Fixes
1. Refund handling mechanism
2. Staff deactivation guard

---

## Test Execution Schedule

| Phase | Tests | Duration |
|-------|-------|----------|
| Smoke | 10 critical tests | 5 min |
| Regression | All tests | 30 min |
| E2E | User flows | 15 min |

---

## Environments
- **Development**: localhost:3000
- **Staging**: TBD
- **Production**: TBD
