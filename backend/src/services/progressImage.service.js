const prisma = require("../config/prisma");
const storageService = require("./storage.service");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const uploadProgressImage = async ({ file, patientId, consultationId, notes, userId }) => {
  if (!file) {
    throw new BadRequestError("Progress image file is required");
  }

  const uploadResult = await storageService.uploadFile({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    folder: "progress-images",
  });

  const progressImage = await prisma.progressImage.create({
    data: {
      patientId,
      consultationId: consultationId || null,
      storageKey: uploadResult.storageKey,
      notes: notes || null,
    },
  });

  await createAuditLog({
    userId,
    action: "PROGRESS_IMAGE_UPLOADED",
    resourceType: "PROGRESS_IMAGE",
    resourceId: progressImage.id,
    metadata: { patientId, storageKey: uploadResult.storageKey },
  });

  const accessUrl = await storageService.getAccessUrl(progressImage.storageKey);

  return {
    ...progressImage,
    url: accessUrl,
  };
};

const getProgressImagesByPatient = async (patientId, user) => {
  // Authorization check
  if (user.role === "PATIENT" && user.patientId !== patientId) {
    throw new ForbiddenError("You cannot view another patient's progress photos");
  }

  if (user.role === "DOCTOR") {
    const hasRelation = await prisma.appointment.findFirst({
      where: {
        doctorId: user.doctorId,
        patientId,
      },
    });

    if (!hasRelation && user.role !== "ADMIN") {
      throw new ForbiddenError("Access denied: You are not assigned to this patient");
    }
  }

  const images = await prisma.progressImage.findMany({
    where: { patientId },
    orderBy: { uploadedAt: "desc" },
  });

  const formatted = await Promise.all(
    images.map(async (img) => ({
      ...img,
      url: await storageService.getAccessUrl(img.storageKey),
    }))
  );

  return formatted;
};

const getProgressImageById = async (id, user) => {
  const image = await prisma.progressImage.findUnique({
    where: { id },
  });

  if (!image) {
    throw new NotFoundError("Progress image not found");
  }

  if (user.role === "PATIENT" && image.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied");
  }

  if (user.role === "DOCTOR") {
    const hasRelation = await prisma.appointment.findFirst({
      where: {
        doctorId: user.doctorId,
        patientId: image.patientId,
      },
    });

    if (!hasRelation && user.role !== "ADMIN") {
      throw new ForbiddenError("Access denied");
    }
  }

  const url = await storageService.getAccessUrl(image.storageKey);

  return {
    ...image,
    url,
  };
};

module.exports = {
  uploadProgressImage,
  getProgressImagesByPatient,
  getProgressImageById,
};
