const consentService = require("../services/consent.service");
const { sendSuccess } = require("../utils/response");

const submitConsent = async (req, res, next) => {
  try {
    const consent = await consentService.submitConsent({
      patientId: req.user.patientId,
      consentType: req.body.consentType,
      version: req.body.version,
      accepted: req.body.accepted,
      userId: req.user.userId,
    });
    return sendSuccess(res, "Consent recorded successfully", consent, 201);
  } catch (err) {
    return next(err);
  }
};

const getMyConsents = async (req, res, next) => {
  try {
    const consents = await consentService.getPatientConsents(req.user.patientId);
    return sendSuccess(res, "Consents retrieved", consents);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  submitConsent,
  getMyConsents,
};
