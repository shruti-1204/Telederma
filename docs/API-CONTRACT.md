# TeleDerma Unified API Contract

This document provides the definitive REST API contract for the **TeleDerma** unified backend. Both the **Patient Mobile/Web App** and the **Doctor Mobile/Web App** must strictly adhere to this contract.

---

## 1. Response Standard

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation or business failure details"
    }
  ]
}
```

---

## 2. API Endpoints Matrix

| Domain | Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|---|
| **Health** | `GET` | `/api/v1/health` | None | Public | Platform health check |
| **Health** | `GET` | `/api/v1/health/db` | None | Public | PostgreSQL connection health |
| **Documentation** | `GET` | `/api/docs` | None | Public | Interactive Swagger UI |
| **Auth** | `POST` | `/api/v1/auth/send-otp` | None | Public | Sends OTP to phone |
| **Auth** | `POST` | `/api/v1/auth/verify-otp` | None | Public | Verifies OTP and returns JWT tokens |
| **Auth** | `POST` | `/api/v1/auth/refresh` | None | Public | Obtains fresh Access Token using Refresh Token |
| **Auth** | `POST` | `/api/v1/auth/logout` | Bearer | All | Revokes session/refresh token |
| **Auth** | `GET` | `/api/v1/auth/me` | Bearer | All | Retrieves authenticated user profile |
| **Patient Profile** | `GET` | `/api/v1/patients/me` | Bearer | `PATIENT` | Retrieves own patient profile |
| **Patient Profile** | `PUT` | `/api/v1/patients/me` | Bearer | `PATIENT` | Updates own medical and contact profile |
| **Medical History** | `GET` | `/api/v1/patients/me/medical-history` | Bearer | `PATIENT` | Lists patient's medical history |
| **Medical History** | `POST` | `/api/v1/patients/me/medical-history` | Bearer | `PATIENT` | Adds new medical history record |
| **Medical History** | `PUT` | `/api/v1/patients/me/medical-history/:id` | Bearer | `PATIENT` | Updates medical history record |
| **Medical History** | `DELETE` | `/api/v1/patients/me/medical-history/:id` | Bearer | `PATIENT` | Deletes medical history record |
| **Medical History** | `GET` | `/api/v1/patients/:patientId/medical-history` | Bearer | `DOCTOR`, `ADMIN` | Doctor views authorized patient history |
| **Doctors** | `GET` | `/api/v1/doctors` | None | Public | Search verified doctors directory |
| **Doctors** | `GET` | `/api/v1/doctors/:doctorId` | None | Public | Get public doctor profile |
| **Doctors** | `GET` | `/api/v1/doctors/:doctorId/availability` | None | Public | Get weekly availability schedules |
| **Doctors** | `GET` | `/api/v1/doctors/:doctorId/slots?date=YYYY-MM-DD` | None | Public | Generate 30-min booking slots |
| **Doctor Profile** | `GET` | `/api/v1/doctors/me` | Bearer | `DOCTOR` | Doctor views own profile |
| **Doctor Profile** | `PUT` | `/api/v1/doctors/me` | Bearer | `DOCTOR` | Doctor updates qualification and bio |
| **Doctor Availability**| `GET` | `/api/v1/doctors/me/availability` | Bearer | `DOCTOR` | Doctor views own schedules |
| **Doctor Availability**| `POST` | `/api/v1/doctors/me/availability` | Bearer | `DOCTOR` | Doctor adds schedule block |
| **Doctor Availability**| `PUT` | `/api/v1/doctors/me/availability/:id` | Bearer | `DOCTOR` | Doctor edits schedule block |
| **Doctor Availability**| `DELETE` | `/api/v1/doctors/me/availability/:id` | Bearer | `DOCTOR` | Doctor removes schedule block |
| **Appointments** | `POST` | `/api/v1/appointments` | Bearer | `PATIENT` | Book appointment (concurrency-safe) |
| **Appointments** | `GET` | `/api/v1/appointments` | Bearer | `PATIENT`, `DOCTOR` | List user's appointments |
| **Appointments** | `GET` | `/api/v1/appointments/:appointmentId` | Bearer | All | View appointment details |
| **Appointments** | `PATCH` | `/api/v1/appointments/:appointmentId/cancel` | Bearer | All | Cancel appointment |
| **Appointments** | `PATCH` | `/api/v1/appointments/:appointmentId/confirm` | Bearer | `DOCTOR`, `ADMIN` | Doctor confirms appointment |
| **Appointments** | `PATCH` | `/api/v1/appointments/:appointmentId/complete`| Bearer | `DOCTOR`, `ADMIN` | Mark appointment completed |
| **Appointments** | `PATCH` | `/api/v1/appointments/:appointmentId/no-show` | Bearer | `DOCTOR`, `ADMIN` | Mark appointment as no-show |
| **Payments** | `POST` | `/api/v1/payments/create-order` | Bearer | `PATIENT` | Initiate payment order |
| **Payments** | `POST` | `/api/v1/payments/verify` | Bearer | `PATIENT` | Verify payment and confirm appointment |
| **Payments** | `GET` | `/api/v1/payments/:paymentId` | Bearer | All | Check payment details |
| **Skin Images** | `POST` | `/api/v1/skin-images/upload` | Bearer | `PATIENT` | Upload lesion/skin image (Multipart) |
| **Skin Images** | `GET` | `/api/v1/skin-images/:imageId` | Bearer | All | Get image metadata and signed URL |
| **Skin Images** | `DELETE` | `/api/v1/skin-images/:imageId` | Bearer | `PATIENT` | Delete image |
| **Progress Images**| `POST` | `/api/v1/progress-images` | Bearer | `PATIENT` | Upload progress photo |
| **Progress Images**| `GET` | `/api/v1/progress-images` | Bearer | `PATIENT` | Patient views progress photos |
| **Progress Images**| `GET` | `/api/v1/patients/:patientId/progress` | Bearer | `DOCTOR`, `ADMIN` | Doctor views patient progress timeline |
| **AI Assessment** | `POST` | `/api/v1/ai/assessments` | Bearer | `PATIENT` | Trigger AI quality & condition triage |
| **AI Assessment** | `GET` | `/api/v1/ai/assessments/:id` | Bearer | All | View AI assessment details |
| **AI Assessment** | `GET` | `/api/v1/patients/me/ai-assessments` | Bearer | `PATIENT` | View patient AI assessments history |
| **AI Override** | `POST` | `/api/v1/ai/assessments/:id/override` | Bearer | `DOCTOR`, `ADMIN` | Doctor overrides AI triage result |
| **Consultations** | `POST` | `/api/v1/consultations` | Bearer | All | Create WebRTC consultation room |
| **Consultations** | `GET` | `/api/v1/consultations/:consultationId` | Bearer | All | Get consultation status & summary |
| **Consultations** | `POST` | `/api/v1/consultations/:consultationId/join` | Bearer | All | Join room & receive peer token/ICE servers |
| **Consultations** | `POST` | `/api/v1/consultations/:consultationId/end` | Bearer | `DOCTOR`, `ADMIN` | End consultation session |
| **Prescriptions** | `POST` | `/api/v1/prescriptions` | Bearer | `DOCTOR`, `ADMIN` | Doctor creates e-prescription |
| **Prescriptions** | `GET` | `/api/v1/prescriptions/:prescriptionId` | Bearer | All | View prescription details |
| **Prescriptions** | `GET` | `/api/v1/patients/me/prescriptions` | Bearer | `PATIENT` | Patient views all prescriptions |
| **Medicines** | `GET` | `/api/v1/medicines/search?q=` | None | Public | Search medicine directory |
| **Medicines** | `GET` | `/api/v1/medicines/:medicineId/alternatives`| None | Public | Find generic/brand alternatives |
| **Follow-ups** | `POST` | `/api/v1/follow-ups` | Bearer | `DOCTOR`, `ADMIN` | Doctor schedules follow-up |
| **Follow-ups** | `GET` | `/api/v1/follow-ups` | Bearer | `PATIENT`, `DOCTOR` | List follow-up schedules |
| **Follow-ups** | `PUT` | `/api/v1/follow-ups/:id` | Bearer | `DOCTOR`, `ADMIN` | Update follow-up status |
| **Notifications** | `GET` | `/api/v1/notifications` | Bearer | All | Get user notifications |
| **Notifications** | `PATCH`| `/api/v1/notifications/:id/read` | Bearer | All | Mark notification as read |
| **Reminders** | `POST` | `/api/v1/reminders` | Bearer | All | Create scheduled reminder |
| **Reminders** | `GET` | `/api/v1/reminders` | Bearer | All | List user reminders |
| **Reminders** | `DELETE`| `/api/v1/reminders/:id` | Bearer | All | Delete reminder |
| **Consents** | `POST` | `/api/v1/consents` | Bearer | `PATIENT` | Submit teleconsult / AI consent |
| **Consents** | `GET` | `/api/v1/consents/me` | Bearer | `PATIENT` | View recorded consents |
| **Admin** | `GET` | `/api/v1/admin/doctors/pending` | Bearer | `ADMIN` | List pending doctor verifications |
| **Admin** | `PATCH`| `/api/v1/admin/doctors/:id/verify` | Bearer | `ADMIN` | Approve doctor credentials |
| **Admin** | `PATCH`| `/api/v1/admin/doctors/:id/reject` | Bearer | `ADMIN` | Reject doctor credentials |
| **Admin** | `GET` | `/api/v1/admin/audit-logs` | Bearer | `ADMIN` | View platform audit trail |
| **Admin** | `GET` | `/api/v1/admin/users` | Bearer | `ADMIN` | List all system users |
