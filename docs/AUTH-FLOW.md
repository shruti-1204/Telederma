# TeleDerma Authentication & RBAC Flow

## 1. Authentication Lifecycle

```
Client App                       Node.js Backend                    Redis Store / DB
    │                                  │                                   │
    ├───── POST /auth/send-otp ───────>│                                   │
    │      { phone: "9876543210" }     ├────── Save OTP with 5min TTL ────>│
    │                                  │                                   │
    │<──── { success: true } ──────────┤                                   │
    │                                  │                                   │
    │                                  │                                   │
    ├───── POST /auth/verify-otp ─────>│                                   │
    │      { phone, otp, role }        ├────── Fetch and verify OTP ──────>│
    │                                  ├────── Find / Create User in DB ──>│
    │                                  ├────── Issue JWT Access (1h) ──────┤
    │                                  ├────── Issue JWT Refresh (7d) ─────┤
    │                                  ├────── Store Refresh Session ─────>│
    │<──── { accessToken, ... } ───────┤                                   │
```

## 2. Token Standards
- **Access Token**: HMAC SHA256 JWT, signed with `JWT_ACCESS_SECRET`, expiry 1 hour. Payload: `{ userId, role }`.
- **Refresh Token**: Signed with `JWT_REFRESH_SECRET`, expiry 7 days. Tracked in Redis/memory store for instant revocation upon logout.

## 3. RBAC Enforcement
Every authenticated request is passed through `requireAuth` followed by `requireRole`:
- `requireRole("PATIENT")`: Grants access exclusively to self-profile, own appointments, own prescriptions, own images.
- `requireRole("DOCTOR")`: Grants access to doctor profile, schedules, and clinical data of patients having booked consultations with the doctor.
- `requireRole("ADMIN")`: Full management access, doctor verification/rejection, audit log inspection, user management.
