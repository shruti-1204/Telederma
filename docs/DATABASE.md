# TeleDerma Database Schema & Relational Map

The database uses PostgreSQL managed via Prisma 7.10.0 (`@prisma/adapter-pg`).

## 1. Entity Relationship Overview

```
User (id, role, phone, email, name, status)
 ├── Patient (id, userId, dob, gender, bloodGroup, allergies, existingConditions, skinHistory)
 │    ├── MedicalHistory (id, patientId, condition, diagnosisDate, notes)
 │    ├── SkinImage (id, patientId, consultationId, storageKey, imageType, status)
 │    ├── AiAssessment (id, consultationId, patientId, imageId, imageQuality, assessment, riskLevel, modelVersion)
 │    ├── ProgressImage (id, patientId, consultationId, storageKey, notes)
 │    ├── Appointment (id, patientId, doctorId, slotStart, slotEnd, status, paymentStatus)
 │    ├── Consultation (id, appointmentId, patientId, doctorId, roomId, status)
 │    ├── Prescription (id, consultationId, patientId, doctorId, notes)
 │    │    └── PrescriptionItem (id, prescriptionId, medicineName, dosage, frequency, duration, instructions)
 │    ├── FollowUp (id, patientId, doctorId, consultationId, followUpDate, status, notes)
 │    ├── Payment (id, appointmentId, patientId, amount, currency, provider, status)
 │    └── Consent (id, patientId, consentType, version, accepted, acceptedAt)
 │
 ├── Doctor (id, userId, specialization, qualification, licenseNumber, bio, isVerified)
 │    ├── DoctorAvailability (id, doctorId, dayOfWeek, startTime, endTime, isActive)
 │    ├── Appointment
 │    ├── Consultation
 │    ├── Prescription
 │    └── FollowUp
 │
 ├── Notification (id, userId, type, title, message, isRead, readAt, metadata)
 ├── Reminder (id, userId, type, title, description, remindAt, isSent, sentAt)
 └── AuditLog (id, userId, action, resourceType, resourceId, timestamp, metadata)
```

## 2. Enums
- **UserRole**: `PATIENT`, `DOCTOR`, `ADMIN`
- **UserStatus**: `ACTIVE`, `INACTIVE`, `SUSPENDED`
- **AppointmentStatus**: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`
- **PaymentStatus**: `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`
- **ConsultationStatus**: `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`
- **RiskLevel**: `GREEN`, `YELLOW`, `RED`
- **ImageStatus**: `UPLOADED`, `PROCESSING`, `PROCESSED`, `FAILED`
