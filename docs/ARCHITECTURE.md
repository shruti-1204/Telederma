# TeleDerma System Architecture

## Overview
TeleDerma is an enterprise AI-powered dermatology telemedicine platform with **ONE unified backend** serving three client roles:
1. **Patient App** (iOS / Android / Web)
2. **Doctor App** (iOS / Android / Web)
3. **Admin Dashboard** (Web)

```
                            ┌───────────────────────────────────┐
                            │    Patient App  /  Doctor App     │
                            │        /  Admin Dashboard         │
                            └─────────────────┬─────────────────┘
                                              │ (HTTPS REST / JWT)
                                              ▼
                            ┌───────────────────────────────────┐
                            │      Node.js / Express Gateway    │
                            │   Helmet, CORS, RateLimit, RBAC   │
                            └─┬──────────────┬───────────────┬──┘
                              │              │               │
            ┌─────────────────┘              │               └─────────────────┐
            ▼                                ▼                                 ▼
┌───────────────────────┐        ┌───────────────────────┐         ┌───────────────────────┐
│  PostgreSQL (Prisma)  │        │   Redis Cache / OTP   │         │  S3 Object Storage    │
│  Single Source of     │        │   In-memory fallback  │         │  Encrypted skin/prog  │
│  Truth relational DB  │        │   Session management  │         │  images via signed URL│
└───────────────────────┘        └───────────────────────┘         └───────────────────────┘
            │                                │                                 │
            ▼                                ▼                                 ▼
┌───────────────────────┐        ┌───────────────────────┐         ┌───────────────────────┐
│   Python/FastAPI AI   │        │    Payment Gateway    │         │  WebRTC Video Engine  │
│   Image Quality,      │        │    Razorpay / Stripe  │         │  Peer token auth,     │
│   Lesion Assessment,  │        │    Order verification │         │  Signaling, STUN/TURN │
│   GREEN/YELLOW/RED    │        │    Transaction sync   │         │  Room management      │
└───────────────────────┘        └───────────────────────┘         └───────────────────────┘
```

## Core Architectural Principles
1. **Unified Identity**: Centralized `User` table determines roles (`PATIENT`, `DOCTOR`, `ADMIN`). Clients never self-authorize.
2. **Zero Direct AI Access**: Mobile applications never communicate with Python AI models directly. All requests pass through the Node backend for validation, rate limiting, and persistence.
3. **No Direct Image Binary in Database**: PostgreSQL stores object keys and metadata only. Files are stored in S3/Object storage with signed URLs.
4. **Concurrency Safety**: Booking operations use database transactions to prevent double-booking.
5. **Decoupled Provider Architecture**: Payment gateways, medicine search engines, SMS providers, notification dispatchers, and Redis instances operate behind adapter interfaces allowing instant replacement or mock operation in development.
