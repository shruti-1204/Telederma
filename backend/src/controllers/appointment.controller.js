const appointmentService = require("../services/appointment.service");
const { sendSuccess } = require("../utils/response");

const createAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.createAppointment({
      patientId: req.user.patientId,
      doctorId: req.body.doctorId,
      slotStart: req.body.slotStart,
      slotEnd: req.body.slotEnd,
      userId: req.user.userId,
    });
    return sendSuccess(res, "Appointment booked successfully", appointment, 201);
  } catch (err) {
    return next(err);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const appointments = await appointmentService.getAppointments(req.user);
    return sendSuccess(res, "Appointments retrieved", appointments);
  } catch (err) {
    return next(err);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.params.appointmentId,
      req.user
    );
    return sendSuccess(res, "Appointment retrieved", appointment);
  } catch (err) {
    return next(err);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const cancelled = await appointmentService.updateAppointmentStatus(
      req.params.appointmentId,
      "CANCELLED",
      req.user
    );
    return sendSuccess(res, "Appointment cancelled", cancelled);
  } catch (err) {
    return next(err);
  }
};

const confirmAppointment = async (req, res, next) => {
  try {
    const confirmed = await appointmentService.updateAppointmentStatus(
      req.params.appointmentId,
      "CONFIRMED",
      req.user
    );
    return sendSuccess(res, "Appointment confirmed", confirmed);
  } catch (err) {
    return next(err);
  }
};

const rejectAppointment = async (req, res, next) => {
  try {
    const rejected = await appointmentService.updateAppointmentStatus(
      req.params.appointmentId,
      "CANCELLED",
      req.user
    );
    return sendSuccess(res, "Appointment rejected", rejected);
  } catch (err) {
    return next(err);
  }
};

const completeAppointment = async (req, res, next) => {
  try {
    const completed = await appointmentService.updateAppointmentStatus(
      req.params.appointmentId,
      "COMPLETED",
      req.user
    );
    return sendSuccess(res, "Appointment completed", completed);
  } catch (err) {
    return next(err);
  }
};

const noShowAppointment = async (req, res, next) => {
  try {
    const noShow = await appointmentService.updateAppointmentStatus(
      req.params.appointmentId,
      "NO_SHOW",
      req.user
    );
    return sendSuccess(res, "Appointment marked as no-show", noShow);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
  confirmAppointment,
  rejectAppointment,
  completeAppointment,
  noShowAppointment,
};
