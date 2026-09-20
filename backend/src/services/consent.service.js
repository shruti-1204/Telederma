const prisma = require("../config/prisma");
const { createAuditLog } = require("./audit.service");

const submitConsent = async ({ patientId, consentType, version = "1.0", accepted, userId }) => {
  // Upsert or create consent record
  const consent = await prisma.consent.create({
    data: {
      patientId,
      consentType,
      version,
      accepted,
      acceptedAt: accepted ? new Date() : null,
    },
  });

  await createAuditLog({
    userId,
    action: "CONSENT_RECORDED",
    resourceType: "CONSENT",
    resourceId: consent.id,
    metadata: { consentType, version, accepted },
  });

  return consent;
};

const getPatientConsents = async (patientId) => {
  return prisma.consent.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  submitConsent,
  getPatientConsents,
};
