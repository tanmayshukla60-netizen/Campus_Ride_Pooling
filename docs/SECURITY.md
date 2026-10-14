# Security Architecture and Threat Mitigation Matrix

## 1. Threat -> Mitigation Table

| Threat Vector | Severity | Attack Scenario | Implemented Mitigation |
| :--- | :--- | :--- | :--- |
| **SQL Injection (SQLi)** | Critical | Attacker injects `' OR '1'='1` or `; DROP TABLE users;` via search or booking input | **100% Parameterized Raw SQL** using `pg` query placeholders (`$1, $2, ...`). Zero string concatenation. Input is validated with Zod before touching the database adapter. |
| **Race Conditions / Overbooking** | Critical | Multiple riders race simultaneously to book the final available seat | **Database-level pessimistic row locking** (`SELECT ... FOR UPDATE`) in stored function `book_seat()`. Enforces strict serial isolation under `READ COMMITTED`. |
| **Double Booking / Duplicate Billing** | High | User double-clicks 'Book' or network retry resends payload | **Idempotency-Key Header** enforced by a `UNIQUE` column on `bookings`. Identical keys replay existing booking with zero side effects. |
| **Unauthenticated / Forged Access** | High | Unauthorized user invokes booking or admin routes | **Stateless JWT Tokens** signed with HS256 secret, validated by `authenticateJwt` middleware. Expiration enforced. |
| **Privilege Escalation** | High | Normal student accesses audit log or admin tables | **Role-Based Access Control (RBAC)**: `requireAdmin` checks `user.role === 'ADMIN'` from verified token payload. |
| **Unauthorized Modification** | High | Rider cancels someone else's booking or driver completes other rides | **Ownership Verification**: Database functions and service layer verify `booking.rider_id === req.user.userId` and `ride.driver_id === req.user.userId`. |
| **Credential Theft & Leakage** | High | Database compromise exposes plain text passwords | **Bcrypt Hashing**: Passwords salted and hashed with 10 rounds of bcrypt. Plain text passwords are never logged or stored. |
| **Spoofed Non-Campus Users** | Medium | Public external users registering accounts | **College Email Domain Filter**: Signup strictly enforces `@vitstudent.ac.in` domain before registration. |
| **XSS & Clickjacking** | Medium | Malicious scripts injected via comments or iframes | **Helmet Middleware**: Configures HTTP security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options). |
| **CORS Misconfiguration** | Medium | Malicious origin requests API on student's behalf | **Strict CORS Allowlist**: Restricted to configured frontend origins (`localhost:5173`). |

---

## 2. SQL Injection Immunity Demonstration

Our architecture eliminates SQL concatenation. The verification script tests injection attempts against search endpoints:

```typescript
// Test: Injected SQL in parameter
const payload = "' OR '1'='1";
const res = await fetch(`/rides/search?from=1&to=2&time=${encodeURIComponent(payload)}`);
// Evaluated safely as literal text parameter $3 in PostgreSQL, raising validation or zero matches, never executing SQL syntax!
```
