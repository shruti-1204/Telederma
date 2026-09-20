const followUpService = require("../services/followUp.service");
const { sendSuccess } = require("../utils/response");

const createFollowUp = async (req, res, next) => {
  try {
    const followUp = await followUpService.createFollowUp({
      patientId: req.body.patientId,
      consultationId: req.body.consultationId,
      followUpDate: req.body.followUpDate,
      notes: req.body.notes,
      doctorUser: req.user,
    });
    return sendSuccess(res, "Follow-up scheduled successfully", followUp, 201);
  } catch (err) {
    return next(err);
  }
};

const getFollowUps = async (req, res, next) => {
  try {
    const followUps = await followUpService.getFollowUps(req.user);
    return sendSuccess(res, "Follow-up schedules retrieved", followUps);
  } catch (err) {
    return next(err);
  }
};

const updateFollowUp = async (req, res, next) => {
  try {
    const updated = await followUpService.updateFollowUp(
      req.params.id,
      req.body,
      req.user
    );
    return sendSuccess(res, "Follow-up updated successfully", updated);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createFollowUp,
  getFollowUps,
  updateFollowUp,
};
