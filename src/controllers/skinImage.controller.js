const skinImageService = require("../services/skinImage.service");
const { sendSuccess } = require("../utils/response");

const uploadSkinImage = async (req, res, next) => {
  try {
    const result = await skinImageService.uploadSkinImage({
      file: req.file,
      patientId: req.user.patientId,
      consultationId: req.body.consultationId,
      imageType: req.body.imageType,
      userId: req.user.userId,
    });
    return sendSuccess(res, "Skin image uploaded successfully", result, 201);
  } catch (err) {
    return next(err);
  }
};

const getSkinImageById = async (req, res, next) => {
  try {
    const image = await skinImageService.getSkinImageById(req.params.imageId, req.user);
    return sendSuccess(res, "Skin image retrieved", image);
  } catch (err) {
    return next(err);
  }
};

const deleteSkinImage = async (req, res, next) => {
  try {
    await skinImageService.deleteSkinImage(req.params.imageId, req.user);
    return sendSuccess(res, "Skin image deleted successfully");
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  uploadSkinImage,
  getSkinImageById,
  deleteSkinImage,
};
