const http = require("http");
const app = require("../src/app");
const prisma = require("../src/config/prisma");

const startTestServer = () => {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, baseUrl: `http://localhost:${port}` });
    });
  });
};

const request = async (baseUrl, path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const status = response.status;
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = await response.text();
  }

  return { status, data };
};

const runTests = async () => {
  console.log("==================================================");
  console.log("TELEDERMA BACKEND COMPREHENSIVE TEST SUITE");
  console.log("==================================================\n");

  // Clean up any previous test runs cleanly
  await prisma.user.deleteMany({
    where: { phone: { in: ["9800000001", "9800000002", "9800000003"] } },
  });

  const { server, baseUrl } = await startTestServer();
  let passed = 0;
  let failed = 0;

  const assert = (condition, name, responseObj = null) => {
    if (condition) {
      console.log(`✔ PASS: ${name}`);
      passed++;
    } else {
      console.error(`✖ FAIL: ${name}`);
      if (responseObj) {
        console.error("   Status:", responseObj.status);
        console.error("   Data:", JSON.stringify(responseObj.data));
      }
      failed++;
    }
  };

  try {
    // 1. Health Checks
    const resHealth = await request(baseUrl, "/api/v1/health");
    assert(resHealth.status === 200 && resHealth.data.success === true, "GET /api/v1/health", resHealth);

    const resHealthDb = await request(baseUrl, "/api/v1/health/db");
    assert(resHealthDb.status === 200 && resHealthDb.data.success === true, "GET /api/v1/health/db", resHealthDb);

    // 2. Auth Flow - Patient
    const patientPhone = `9800000001`;
    const resSendOtpPatient = await request(baseUrl, "/api/v1/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone: patientPhone }),
    });
    assert(resSendOtpPatient.status === 200, "POST /api/v1/auth/send-otp (Patient)");

    const devOtp = resSendOtpPatient.data.data.devOtp || "123456";
    const resVerifyPatient = await request(baseUrl, "/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        phone: patientPhone,
        otp: devOtp,
        role: "PATIENT",
        name: "Test Patient",
        email: "patient.test@telederma.org",
      }),
    });
    assert(resVerifyPatient.status === 200 && resVerifyPatient.data.data.accessToken, "POST /api/v1/auth/verify-otp (Patient login)");
    const patientToken = resVerifyPatient.data.data.accessToken;
    const patientRefreshToken = resVerifyPatient.data.data.refreshToken;
    const patientId = resVerifyPatient.data.data.user.patientId;

    // 3. Auth Flow - Doctor
    const doctorPhone = `9800000002`;
    await request(baseUrl, "/api/v1/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone: doctorPhone }),
    });
    const resVerifyDoctor = await request(baseUrl, "/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        phone: doctorPhone,
        otp: devOtp,
        role: "DOCTOR",
        name: "Dr. Sarah Jenkins",
        email: "dr.sarah@telederma.org",
      }),
    });
    assert(resVerifyDoctor.status === 200 && resVerifyDoctor.data.data.accessToken, "POST /api/v1/auth/verify-otp (Doctor login)");
    const doctorToken = resVerifyDoctor.data.data.accessToken;
    const doctorId = resVerifyDoctor.data.data.user.doctorId;

    // 4. Auth Flow - Admin
    const adminPhone = `9800000003`;
    await request(baseUrl, "/api/v1/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone: adminPhone }),
    });
    const resVerifyAdmin = await request(baseUrl, "/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        phone: adminPhone,
        otp: devOtp,
        role: "ADMIN",
        name: "Platform Administrator",
        email: "admin@telederma.org",
      }),
    });
    assert(resVerifyAdmin.status === 200, "POST /api/v1/auth/verify-otp (Admin login)");
    const adminToken = resVerifyAdmin.data.data.accessToken;

    // 5. Token Refresh & Get Me
    const resRefresh = await request(baseUrl, "/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: patientRefreshToken }),
    });
    assert(resRefresh.status === 200 && resRefresh.data.data.accessToken, "POST /api/v1/auth/refresh");

    const resMe = await request(baseUrl, "/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(resMe.status === 200 && resMe.data.data.role === "PATIENT", "GET /api/v1/auth/me");

    // 6. Patient Profile & Medical History
    const resUpdateProfile = await request(baseUrl, "/api/v1/patients/me", {
      method: "PUT",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        gender: "Female",
        bloodGroup: "A+",
        allergies: "Sulfonamides",
        skinHistory: "Dry skin flareups",
      }),
    });
    assert(resUpdateProfile.status === 200 && resUpdateProfile.data.data.bloodGroup === "A+", "PUT /api/v1/patients/me");

    const resAddHistory = await request(baseUrl, "/api/v1/patients/me/medical-history", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        condition: "Contact Dermatitis",
        notes: "Reaction to synthetic soaps",
      }),
    });
    assert(resAddHistory.status === 201 && resAddHistory.data.data.id, "POST /api/v1/patients/me/medical-history");
    const historyId = resAddHistory.data.data.id;

    const resGetHistory = await request(baseUrl, "/api/v1/patients/me/medical-history", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(resGetHistory.status === 200 && resGetHistory.data.data.length > 0, "GET /api/v1/patients/me/medical-history");

    // 7. Doctor Profile, Verification & Availability
    const resUpdateDoc = await request(baseUrl, "/api/v1/doctors/me", {
      method: "PUT",
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        specialization: "Clinical Dermatology",
        qualification: "MD, Board Certified Dermatologist",
        licenseNumber: `LIC-${Date.now()}`,
        bio: "Specialist in inflammatory dermatoses and skin oncology",
      }),
    });
    assert(resUpdateDoc.status === 200, "PUT /api/v1/doctors/me");

    // Admin verifies doctor
    const resVerifyDocAdmin = await request(baseUrl, `/api/v1/admin/doctors/${doctorId}/verify`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resVerifyDocAdmin.status === 200 && resVerifyDocAdmin.data.data.isVerified === true, "PATCH /api/v1/admin/doctors/:id/verify");

    // Doctor creates availability (for day 5 - Friday)
    const resAvail = await request(baseUrl, "/api/v1/doctors/me/availability", {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        dayOfWeek: 5,
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      }),
    });
    assert(resAvail.status === 201, "POST /api/v1/doctors/me/availability");

    // Doctor Slots generation for a Friday (e.g., 2026-10-16)
    const testDate = "2026-10-16"; // 2026-10-16 is a Friday (day 5)
    const resSlots = await request(baseUrl, `/api/v1/doctors/${doctorId}/slots?date=${testDate}`);
    assert(resSlots.status === 200 && resSlots.data.data.length === 6, "GET /api/v1/doctors/:doctorId/slots (Generated 6x 30-min slots)");

    // 8. Appointments & Concurrency-Safe Booking
    const selectedSlot = resSlots.data.data[0];
    const resBookAppt = await request(baseUrl, "/api/v1/appointments", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctorId,
        slotStart: selectedSlot.slotStart,
        slotEnd: selectedSlot.slotEnd,
      }),
    });
    assert(resBookAppt.status === 201 && resBookAppt.data?.data?.id, "POST /api/v1/appointments (Booking slot)", resBookAppt);
    const appointmentId = resBookAppt.data?.data?.id;

    // Double-booking collision test
    const resDoubleBook = await request(baseUrl, "/api/v1/appointments", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctorId,
        slotStart: selectedSlot.slotStart,
        slotEnd: selectedSlot.slotEnd,
      }),
    });
    assert(resDoubleBook.status === 409, "Double Booking Prevention (409 Conflict)");

    // 9. Payment Order & Verification
    const resCreateOrder = await request(baseUrl, "/api/v1/payments/create-order", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        appointmentId,
        amount: 750.0,
      }),
    });
    assert(resCreateOrder.status === 201 && resCreateOrder.data.data.paymentId, "POST /api/v1/payments/create-order");
    const paymentId = resCreateOrder.data.data.paymentId;

    const resVerifyPayment = await request(baseUrl, "/api/v1/payments/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        paymentId,
        providerPaymentId: `pay_mock_${Date.now()}`,
      }),
    });
    assert(resVerifyPayment.status === 200 && resVerifyPayment.data.data.payment.status === "SUCCESS", "POST /api/v1/payments/verify");

    // 10. Consultation & WebRTC Room Token
    const resConsultation = await request(baseUrl, "/api/v1/consultations", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({ appointmentId }),
    });
    assert(resConsultation.status === 201 && resConsultation.data.data.roomId, "POST /api/v1/consultations (Create room)");
    const consultationId = resConsultation.data.data.id;

    const resJoinDoc = await request(baseUrl, `/api/v1/consultations/${consultationId}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(resJoinDoc.status === 200 && resJoinDoc.data.data.roomToken, "POST /api/v1/consultations/:id/join (Doctor WebRTC credentials)");

    const resJoinPatient = await request(baseUrl, `/api/v1/consultations/${consultationId}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(resJoinPatient.status === 200 && resJoinPatient.data.data.roomId === resJoinDoc.data.data.roomId, "POST /api/v1/consultations/:id/join (Patient matches room)");

    // 11. Skin Images & AI Assessment
    // Simulate image upload record directly for reliable unit testing
    const testSkinImage = await prisma.skinImage.create({
      data: {
        patientId,
        consultationId,
        storageKey: "skin-images/test_lesion.jpg",
        imageType: "LESION",
        status: "UPLOADED",
      },
    });

    const resAiAssess = await request(baseUrl, "/api/v1/ai/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        imageId: testSkinImage.id,
        consultationId,
      }),
    });
    assert(resAiAssess.status === 201 && ["GREEN", "YELLOW", "RED"].includes(resAiAssess.data.data.riskLevel), "POST /api/v1/ai/assessments (Triage categorization)");
    const assessmentId = resAiAssess.data.data.id;

    // Doctor override AI assessment
    const resOverride = await request(baseUrl, `/api/v1/ai/assessments/${assessmentId}/override`, {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        riskLevel: "GREEN",
        assessment: "Confirmed mild eczema. Prescribing topical corticosteroid for 5 days.",
      }),
    });
    assert(resOverride.status === 200 && resOverride.data.data.riskLevel === "GREEN", "POST /api/v1/ai/assessments/:id/override (Doctor override & audit)");

    // 12. Prescription & Medicines
    const resPrescription = await request(baseUrl, "/api/v1/prescriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        consultationId,
        patientId,
        notes: "Apply cream thinly twice daily after washing.",
        items: [
          {
            medicineName: "Hydrocortisone 1% Cream",
            dosage: "Pea-sized amount",
            frequency: "BID (Twice daily)",
            duration: "5 days",
            instructions: "Topical application on affected skin area",
          },
        ],
      }),
    });
    assert(resPrescription.status === 201 && resPrescription.data.data.items.length === 1, "POST /api/v1/prescriptions (Doctor creates e-prescription)");

    const resPatientPrescriptions = await request(baseUrl, "/api/v1/patients/me/prescriptions", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(resPatientPrescriptions.status === 200 && resPatientPrescriptions.data.data.length > 0, "GET /api/v1/patients/me/prescriptions");

    // Medicine search and alternatives
    const resMedSearch = await request(baseUrl, "/api/v1/medicines/search?q=Hydrocortisone");
    assert(resMedSearch.status === 200 && resMedSearch.data.data.length > 0, "GET /api/v1/medicines/search?q=Hydrocortisone");

    const resMedAlt = await request(baseUrl, "/api/v1/medicines/med_1/alternatives");
    assert(resMedAlt.status === 200 && resMedAlt.data.data.alternatives.length > 0, "GET /api/v1/medicines/:id/alternatives");

    // 13. Follow-up, Reminders, Consents, Notifications & Audit
    const resFollowUp = await request(baseUrl, "/api/v1/follow-ups", {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patientId,
        consultationId,
        followUpDate: "2026-10-23T10:00:00.000Z",
        notes: "Evaluate resolution of skin irritation",
      }),
    });
    assert(resFollowUp.status === 201, "POST /api/v1/follow-ups (Schedule follow-up)");

    const resReminder = await request(baseUrl, "/api/v1/reminders", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        type: "MEDICINE",
        title: "Apply Hydrocortisone Cream",
        remindAt: "2026-10-17T08:00:00.000Z",
      }),
    });
    assert(resReminder.status === 201, "POST /api/v1/reminders");

    const resConsent = await request(baseUrl, "/api/v1/consents", {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        consentType: "AI_ASSISTANCE",
        accepted: true,
      }),
    });
    assert(resConsent.status === 201 && resConsent.data.data.accepted === true, "POST /api/v1/consents (Record consent)");

    const resNotifications = await request(baseUrl, "/api/v1/notifications", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(resNotifications.status === 200, "GET /api/v1/notifications");

    const resAudit = await request(baseUrl, "/api/v1/admin/audit-logs", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resAudit.status === 200 && resAudit.data.data.length > 0, "GET /api/v1/admin/audit-logs");

    // End consultation
    const resEndCon = await request(baseUrl, `/api/v1/consultations/${consultationId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(resEndCon.status === 200 && resEndCon.data.data.status === "COMPLETED", "POST /api/v1/consultations/:id/end");

  } catch (error) {
    console.error("Test execution encountered an error:", error);
    failed++;
  } finally {
    server.close();
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();
