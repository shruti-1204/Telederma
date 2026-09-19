const { z } = require("zod");

const createAppointmentSchema = {
  body: z.object({
    doctorId: z.string().min(1, "Doctor ID is required"),
    slotStart: z.string().min(10, "slotStart is required"),
    slotEnd: z.string().min(10, "slotEnd is required"),
  }).refine((data) => {
    const start = new Date(data.slotStart).getTime();
    const end = new Date(data.slotEnd).getTime();
    return !isNaN(start) && !isNaN(end) && start < end;
  }, {
    message: "Valid slotStart must be earlier than slotEnd",
    path: ["slotEnd"],
  }),
};

const appointmentIdParamSchema = {
  params: z.object({
    appointmentId: z.string().min(1, "Appointment ID is required"),
  }),
};

module.exports = {
  createAppointmentSchema,
  appointmentIdParamSchema,
};
