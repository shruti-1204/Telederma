const doctorService = require("../services/doctor.service");
const { sendSuccess } = require("../utils/response");

// Doctor Self APIs
const getMyProfile = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.userId);
    return sendSuccess(res, "Doctor profile retrieved", doctor);
  } catch (err) {
    return next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const updated = await doctorService.updateDoctorProfile(req.user.userId, req.body);
    return sendSuccess(res, "Doctor profile updated successfully", updated);
  } catch (err) {
    return next(err);
  }
};

const getMyAvailability = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.userId);
    const availability = await doctorService.getDoctorAvailability(doctor.id);
    return sendSuccess(res, "Availability schedules retrieved", availability);
  } catch (err) {
    return next(err);
  }
};

const createMyAvailability = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.userId);
    const availability = await doctorService.createAvailability(
      doctor.id,
      req.user.userId,
      req.body
    );
    return sendSuccess(res, "Availability schedule created", availability, 201);
  } catch (err) {
    return next(err);
  }
};

const updateMyAvailability = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.userId);
    const updated = await doctorService.updateAvailability(
      req.params.id,
      doctor.id,
      req.user.userId,
      req.body
    );
    return sendSuccess(res, "Availability schedule updated", updated);
  } catch (err) {
    return next(err);
  }
};

const deleteMyAvailability = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorByUserId(req.user.userId);
    await doctorService.deleteAvailability(req.params.id, doctor.id, req.user.userId);
    return sendSuccess(res, "Availability schedule deleted");
  } catch (err) {
    return next(err);
  }
};

// Public / Patient APIs
const listDoctors = async (req, res, next) => {
  try {
    const doctors = await doctorService.getVerifiedDoctors({
      specialization: req.query.specialization,
      search: req.query.search,
    });
    return sendSuccess(res, "Verified doctors list retrieved", doctors);
  } catch (err) {
    return next(err);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.doctorId);
    return sendSuccess(res, "Doctor profile retrieved", doctor);
  } catch (err) {
    return next(err);
  }
};

const getDoctorAvailability = async (req, res, next) => {
  try {
    const availability = await doctorService.getDoctorAvailability(req.params.doctorId);
    return sendSuccess(res, "Doctor availability retrieved", availability);
  } catch (err) {
    return next(err);
  }
};

const getDoctorSlots = async (req, res, next) => {
  try {
    const slots = await doctorService.getDoctorSlots(req.params.doctorId, req.query.date);
    return sendSuccess(res, "Doctor slots retrieved", slots);
  } catch (err) {
    return next(err);
  }
};

// Admin APIs
const getPendingDoctors = async (req, res, next) => {
  try {
    const pending = await doctorService.getPendingDoctors();
    return sendSuccess(res, "Pending doctors list retrieved", pending);
  } catch (err) {
    return next(err);
  }
};

const verifyDoctor = async (req, res, next) => {
  try {
    const verified = await doctorService.verifyDoctor(req.params.id, req.user.userId);
    return sendSuccess(res, "Doctor verified successfully", verified);
  } catch (err) {
    return next(err);
  }
};

const rejectDoctor = async (req, res, next) => {
  try {
    const rejected = await doctorService.rejectDoctor(req.params.id, req.user.userId);
    return sendSuccess(res, "Doctor verification rejected/revoked", rejected);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getMyAvailability,
  createMyAvailability,
  updateMyAvailability,
  deleteMyAvailability,
  listDoctors,
  getDoctorById,
  getDoctorAvailability,
  getDoctorSlots,
  getPendingDoctors,
  verifyDoctor,
  rejectDoctor,
};
