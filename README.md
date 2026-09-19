# TeleDerma - AI-Powered Dermatology Telemedicine Platform

Unified backend service for **TeleDerma**, providing high-performance, secure, and resilient APIs for Patients, Doctors, and Administrators.

## Core Features
- **Unified Identity & RBAC**: One central User model with `PATIENT`, `DOCTOR`, and `ADMIN` authorization.
- **Passwordless OTP Authentication**: Phone-based OTP with JWT Access and Refresh tokens.
- **Patient Management**: Full medical history, profiles, allergies, and consents.
- **Doctor Management & Scheduling**: Dynamic 30-minute slot generator, weekly schedules, admin verification workflow.
- **Appointments & Concurrency Safety**: Transaction-safe booking preventing double bookings.
- **Payment Processing**: Multi-provider architecture supporting Razorpay/Stripe with signature verification.
- **Encrypted Object Storage**: Skin lesion and progress image tracking with presigned URLs.
- **AI Triage & Decision Support**: Direct integration with Python/FastAPI AI models for image quality analysis and strict `GREEN`/`YELLOW`/`RED` risk classification with doctor override capabilities.
- **WebRTC Video Consultations**: Session tokens and signaling room orchestration.
- **E-Prescriptions & Medicines Catalog**: Integrated dermatological pharmacy and alternative finder.
- **Notifications, Reminders & Follow-ups**: Automated scheduling and alert pipelines.
- **Audit Trails & Security**: Helmet, CORS, Rate Limiting, Zod validation, sanitized audit logging.
- **Interactive Swagger**: Fully documented OpenAPI 3.0 specs at `/api/docs`.

## Technology Stack
- **Runtime**: Node.js v24 + Express 5
- **ORM**: Prisma 7.10.0 with PostgreSQL adapter (`@prisma/adapter-pg`)
- **Database**: PostgreSQL
- **Caching**: Redis (with memory fallback)
- **Validation**: Zod 4
- **Documentation**: Swagger UI & Markdown contracts

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Run Migrations & Generate Prisma
```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start Server
```bash
npm run dev
```

### 5. Run Test Suite
```bash
npm test
```

## Documentation Links
- [API Contract (docs/API-CONTRACT.md)](docs/API-CONTRACT.md)
- [System Architecture (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Authentication Flow (docs/AUTH-FLOW.md)](docs/AUTH-FLOW.md)
- [Database Schema (docs/DATABASE.md)](docs/DATABASE.md)
- [AI Service Integration (docs/AI-INTEGRATION.md)](docs/AI-INTEGRATION.md)
- [Deployment Guide (docs/DEPLOYMENT.md)](docs/DEPLOYMENT.md)
