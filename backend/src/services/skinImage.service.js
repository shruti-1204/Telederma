const prisma = require("../config/prisma");
const storageService = require("./storage.service");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../utils/errors");
const { createAuditLog } = require("./audit.service");

const uploadSkinImage = async ({ file, patientId, consultationId, imageType, userId }) => {
  if (!file) {
    throw new BadRequestError("Image file is required");
  }

  // Upload to S3/Storage abstraction
  const uploadResult = await storageService.uploadFile({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    folder: "skin-images",
  });

  const skinImage = await prisma.skinImage.create({
    data: {
      patientId,
      consultationId: consultationId || null,
      storageKey: uploadResult.storageKey,
      imageType: imageType || "LESION",
      status: "UPLOADED",
    },
  });

  await createAuditLog({
    userId,
    action: "SKIN_IMAGE_UPLOADED",
    resourceType: "SKIN_IMAGE",
    resourceId: skinImage.id,
    metadata: { patientId, consultationId, storageKey: uploadResult.storageKey },
  });

  const accessUrl = await storageService.getAccessUrl(skinImage.storageKey);

  return {
    ...skinImage,
    url: accessUrl,
  };
};

const getSkinImageById = async (imageId, user) => {
  const image = await prisma.skinImage.findUnique({
    where: { id: imageId },
    include: {
      patient: { select: { id: true, userId: true } },
      consultation: true,
      aiAssessment: true,
    },
  });

  if (!image) {
    throw new NotFoundError("Skin image not found");
  }

  // Authorization check
  if (user.role === "PATIENT" && image.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied: You cannot view another patient's image");
  }

  if (user.role === "DOCTOR") {
    // Verify doctor has consultation or appointment relation with this patient
    const hasAccess = await prisma.appointment.findFirst({
      where: {
        doctorId: user.doctorId,
        patientId: image.patientId,
      },
    });

    if (!hasAccess && user.role !== "ADMIN") {
      throw new ForbiddenError("Access denied: You are not authorized to view this patient's images");
    }
  }

  const accessUrl = await storageService.getAccessUrl(image.storageKey);

  await createAuditLog({
    userId: user.userId,
    action: "SKIN_IMAGE_ACCESSED",
    resourceType: "SKIN_IMAGE",
    resourceId: imageId,
  });

  return {
    ...image,
    url: accessUrl,
  };
};

const deleteSkinImage = async (imageId, user) => {
  const image = await prisma.skinImage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new NotFoundError("Skin image not found");
  }

  if (user.role === "PATIENT" && image.patientId !== user.patientId) {
    throw new ForbiddenError("Access denied");
  }

  await storageService.deleteFile(image.storageKey);
  await prisma.skinImage.delete({ where: { id: imageId } });

  await createAuditLog({
    userId: user.userId,
    action: "SKIN_IMAGE_DELETED",
    resourceType: "SKIN_IMAGE",
    resourceId: imageId,
  });

  return true;
};

module.exports = {
  uploadSkinImage,
  getSkinImageById,
  deleteSkinImage,
};
