# API Documentation

This document describes the API routes available in the Goalo CRM platform.

---

## Overview

All API routes are located in `app/api/` and follow Next.js App Router conventions.

**Base URL:** `https://your-domain.com/api`

**Authentication:** Most endpoints require Firebase Authentication. Include the `Authorization` header with a valid Firebase ID token.

```
Authorization: Bearer <firebase_id_token>
```

---

## Email API

### POST /api/email/send

Send an email using the configured email provider.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<p>Email body content</p>",
  "from": "sender@example.com",
  "replyTo": "reply@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "message-id-123"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to send email"
}
```

---

## PayPal API

### POST /api/paypal/create-order

Create a PayPal order for invoice payment.

**Request Body:**
```json
{
  "invoiceId": "invoice_123",
  "amount": 150.00,
  "currency": "USD"
}
```

**Response:**
```json
{
  "orderId": "PAYPAL_ORDER_ID",
  "status": "CREATED"
}
```

---

### POST /api/paypal/capture-order

Capture a PayPal order after approval.

**Request Body:**
```json
{
  "orderId": "PAYPAL_ORDER_ID",
  "invoiceId": "invoice_123"
}
```

**Response:**
```json
{
  "success": true,
  "captureId": "CAPTURE_ID",
  "status": "COMPLETED"
}
```

---

## Admin API

> **Note:** These endpoints require super admin privileges.

### POST /api/admin/create-tenant

Create a new organization/tenant.

**Request Body:**
```json
{
  "name": "Acme Corp",
  "email": "admin@acme.com",
  "plan": "pro"
}
```

**Response:**
```json
{
  "success": true,
  "orgId": "org_123456",
  "userId": "user_123456"
}
```

---

### POST /api/admin/create-staff

Create a staff member for an organization.

**Request Body:**
```json
{
  "email": "staff@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "member",
  "orgId": "org_123456"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user_789",
  "tempPassword": "generated_password"
}
```

---

### POST /api/admin/broadcast-email

Send an email to all or selected organizations.

**Request Body:**
```json
{
  "subject": "Platform Update",
  "html": "<p>Important announcement...</p>",
  "targetOrgs": ["org_123", "org_456"]
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0
}
```

---

### POST /api/admin/logout-tenant

Force logout a tenant user.

**Request Body:**
```json
{
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### GET /api/admin/join-requests

Get pending join requests.

**Response:**
```json
{
  "requests": [
    {
      "id": "req_123",
      "email": "user@example.com",
      "orgId": "org_456",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### POST /api/admin/join-requests/[id]/approve

Approve a join request.

**Response:**
```json
{
  "success": true,
  "userId": "user_789"
}
```

---

### POST /api/admin/seed-data

Seed sample data for development/testing.

**Request Body:**
```json
{
  "orgId": "org_123",
  "modules": ["customers", "leads", "invoices"]
}
```

**Response:**
```json
{
  "success": true,
  "created": {
    "customers": 10,
    "leads": 15,
    "invoices": 5
  }
}
```

---

### POST /api/admin/test-email

Test email configuration.

**Request Body:**
```json
{
  "to": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "test-message-id"
}
```

---

## Portal API

### GET /api/portal/[id]

Get customer portal data for invoice viewing/payment.

**Parameters:**
- `id` - Invoice ID

**Response:**
```json
{
  "invoice": {
    "id": "inv_123",
    "number": "INV-2024-001",
    "total": 1500.00,
    "status": "unpaid",
    "dueDate": "2024-02-15"
  },
  "company": {
    "name": "Vendor Company",
    "logo": "https://..."
  }
}
```

---

## Error Handling

All endpoints follow a consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

API endpoints are subject to Firebase's default rate limits. For high-volume use cases, consider implementing request queuing or caching.

---

## CORS

API routes are configured to accept requests from the same origin only. For cross-origin requests, contact the system administrator.
