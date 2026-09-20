const prisma = require("../config/prisma");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const getPatientByUserId = async (userId) => {
  let patient = await prisma.patient.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, phone: true, email: true, name: true, role: true, status: true },
      },
    },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: { userId },
      include: {
        user: {
          select: { id: true, phone: true, email: true, name: true, role: true, status: true },
        },
      },
    });
  }

  return patient;
};

const updatePatientProfile = async (userId, updateData) => {
  const patient = await getPatientByUserId(userId);

  const { name, email, dateOfBirth, ...patientFields } = updateData;

  // Update user name/email if provided
  if (name || email) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
    });
  }

  const updatedPatient = await prisma.patient.update({
    where: { id: patient.id },
    data: {
      ...patientFields,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    },
    include: {
      user: {
        select: { id: true, phone: true, email: true, name: true, role: true, status: true },
      },
    },
  });

  await createAuditLog({
    userId,
    action: "PATIENT_PROFILE_UPDATED",
    resourceType: "PATIENT",
    resourceId: patient.id,
  });

  return updatedPatient;
};

const getMedicalHistory = async (patientId) => {
  return prisma.medicalHistory.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
};

const addMedicalHistory = async (patientId, userId, data) => {
  const record = await prisma.medicalHistory.create({
    data: {
      patientId,
      condition: data.condition,
      diagnosisDate: data.diagnosisDate ? new Date(data.diagnosisDate) : null,
      notes: data.notes || null,
    },
  });

  await createAuditLog({
    userId,
    action: "MEDICAL_HISTORY_CREATED",
    resourceType: "MEDICAL_HISTORY",
    resourceId: record.id,
    metadata: { condition: data.condition },
  });

  return record;
};

const updateMedicalHistory = async (recordId, patientId, userId, data) => {
  const existing = await prisma.medicalHistory.findUnique({
    where: { id: recordId },
  });

  if (!existing) {
    throw new NotFoundError("Medical history record not found");
  }

  if (existing.patientId !== patientId) {
    throw new ForbiddenError("You cannot modify another patient's medical history");
  }

  const updated = await prisma.medicalHistory.update({
    where: { id: recordId },
    data: {
      ...(data.condition && { condition: data.condition }),
      ...(data.diagnosisDate !== undefined && {
        diagnosisDate: data.diagnosisDate ? new Date(data.diagnosisDate) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  await createAuditLog({
    userId,
    action: "MEDICAL_HISTORY_UPDATED",
    resourceType: "MEDICAL_HISTORY",
    resourceId: recordId,
  });

  return updated;
};

const deleteMedicalHistory = async (recordId, patientId, userId) => {
  const existing = await prisma.medicalHistory.findUnique({
    where: { id: recordId },
  });

  if (!existing) {
    throw new NotFoundError("Medical history record not found");
  }

  if (existing.patientId !== patientId) {
    throw new ForbiddenError("You cannot delete another patient's medical history");
  }

  await prisma.medicalHistory.delete({
    where: { id: recordId },
  });

  await createAuditLog({
    userId,
    action: "MEDICAL_HISTORY_DELETED",
    resourceType: "MEDICAL_HISTORY",
    resourceId: recordId,
  });

  return true;
};

const getDoctorAuthorizedPatientHistory = async (doctorId, patientId, userRole, userId) => {
  if (userRole === "ADMIN") {
    return prisma.medicalHistory.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
  }

  // Doctor must have an existing or scheduled appointment/consultation with this patient
  const hasRelation = await prisma.appointment.findFirst({
    where: {
      doctorId,
      patientId,
    },
  });

  if (!hasRelation) {
    throw new ForbiddenError("Access denied: You do not have an active or past appointment with this patient");
  }

  await createAuditLog({
    userId,
    action: "PATIENT_RECORD_ACCESSED_BY_DOCTOR",
    resourceType: "PATIENT",
    resourceId: patientId,
    metadata: { doctorId },
  });

  return prisma.medicalHistory.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  getPatientByUserId,
  updatePatientProfile,
  getMedicalHistory,
  addMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
  getDoctorAuthorizedPatientHistory,
};
