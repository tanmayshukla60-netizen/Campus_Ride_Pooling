# Campus Ride-Pooling (University Cab & Ride Sharing)
**DBMS Course Final Project**

A complete, production-grade university ride-pooling platform designed with a primary grading focus on **DATABASE DESIGN**, **RELATIONAL INTEGRITY (3NF)**, and **TRANSACTION HANDLING & CONCURRENCY CONTROL**.

---

## Key Highlights & Grading Features
- **Database Architecture**: PostgreSQL 16+, 100% Raw SQL (NO ORM).
- **Concurrency & Transaction Isolation**: Pessimistic row locking (`SELECT ... FOR UPDATE`) in PostgreSQL stored functions under `READ COMMITTED`.
- **Zero Overbooking Guarantee**: Stress tested with 50 simultaneous booking requests racing for 3 seats — yields **EXACTLY 3 successes and 0 seats remaining**.
- **Append-Only Financial Ledger**: `payments` ledger records immutable `CHARGE` and `REFUND` transactions; balances are never mutably overwritten.
- **Seat Hold Expiry Worker**: 5-minute seat holds with automatic background release every 30s.
- **Automated Triggers**:
  1. Trigger A: Real-time driver rating average and count recalculation.
  2. Trigger B: Immutable JSONB audit logging of booking status transitions.
  3. Trigger C: Strict state machine enforcement blocking illegal transitions.
- **Security**: 100% Parameterized queries (SQLi immune), Bcrypt password hashing, Stateless JWT with RBAC, Helmet headers, Strict CORS, and College Email Domain enforcement (`@vitstudent.ac.in`).

---

## Project Structure
```text
DBMS/
  ├── db/
  │   ├── migrations/             # 001_init_schema.sql, 002_triggers_and_audit.sql, 003_functions_and_views.sql
  │   ├── seed.sql                # 11 users, 9 stops, 22 rides, bookings in all 6 states
  │   └── scripts/                # Database management and verification tools
  ├── backend/
  │   ├── src/                    # TypeScript Express API (Services, Controllers, Routes, DB Pool)
  │   ├── package.json
  │   └── tsconfig.json
  ├── frontend/
  │   ├── src/                    # React + Vite + Tailwind CSS (Components, Pages, AuthContext)
  │   ├── package.json
  │   └── vite.config.ts
  └── docs/                       # Comprehensive documentation
      ├── ERD.md                  # Mermaid ER diagram & relational constraints
      ├── NORMALIZATION.md        # 1NF -> 3NF walkthrough & FDs
      ├── TRANSACTIONS_AND_CONCURRENCY.md # Row locking theory & deadlock avoidance
      ├── EXPLAIN_ANALYZE.md      # Before/After query plans with composite index
      ├── SECURITY.md             # Threat -> Mitigation matrix
      ├── DEMO_SCRIPT.md          # 1-Page course evaluation walkthrough
      └── concurrency_test_results.txt # Live 50-request stress test output
```

---

## Quick Start & Running Locally

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 15+ (Running locally on port 5432)

### 2. Database Setup & Migrations
```bash
# Run versioned migrations
npm run db:migrate

# Seed database with sample students, hubs, and rides
npm run db:seed

# Verify database constraints, triggers, and state machine
npm run db:verify
```

### 3. Run Concurrency Stress Test (3 out of 50 Success)
```bash
npm run test:concurrency
```

### 4. Start Development Servers
```bash
# Start backend (port 5000) and frontend (port 5173) concurrently:
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 1-Click Demo Credentials
All pre-seeded accounts share the password: `Password123!`
- **Driver**: `arun.kumar2023@vitstudent.ac.in`
- **Rider**: `sneha.patel2023@vitstudent.ac.in`
- **Administrator**: `admin@vitstudent.ac.in`
*(Available directly in the UI as 1-Click Demo buttons on the Sign In modal)*
