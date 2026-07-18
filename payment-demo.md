# Payment API Demo

## Objective

Build a minimal payment integration demo.

This project demonstrates how to integrate multiple payment gateways.

The project is NOT an ecommerce website.

Keep UI and business logic as simple as possible.

The architecture must support future payment providers with minimal code changes.

---

# Current Providers

- VNPay Sandbox

Future:

- MoMo
- PayPal
- Stripe

---

# Tech Stack

Frontend

- React
- Vite
- TypeScript

Backend

- Express
- TypeScript

Database

- PostgreSQL

Deployment

- Vercel
- Render
- Supabase

---

# UI

One demo product only.

```
Demo Product

100,000 VND

Select payment method

○ VNPay

○ MoMo

[ Pay ]
```

No login.

No shopping cart.

No admin.

No user management.

No product CRUD.

---

# Backend Architecture

Use Strategy Pattern.

```
PaymentController

↓

PaymentService

↓

PaymentProvider

↓

VNPayProvider

MoMoProvider
```

PaymentController must never know provider-specific implementation.

Providers encapsulate all gateway-specific logic.

---

# Database

Only two tables.

orders

- id
- amount
- payment_status
- created_at

payments

- id
- order_id
- provider
- transaction_id
- amount
- status
- raw_response(JSONB)
- created_at

---

# Coding Principles

- Thin controllers.
- Business logic belongs in services.
- Database access belongs in repositories.
- One responsibility per file.
- Use dependency injection where appropriate.
- Avoid duplicate code.

---

# Extensibility

Adding a new payment provider should require:

1. Create a new Provider class.
2. Register it in PaymentService.

Controllers, routes, frontend, and database schema should remain unchanged.

---

# Scope

Focus on demonstrating payment integration, callback verification, and payment status updates.

Do not implement unnecessary ecommerce features.