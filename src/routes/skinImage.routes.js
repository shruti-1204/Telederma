const express = require("express");
const router = express.Router();
const skinImageController = require("../controllers/skinImage.controller");
const upload = require("../middleware/upload");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { imageIdParamSchema } = require("../validators/image.validator");

router.post(
  "/upload",
  requireAuth,
  requireRole("PATIENT"),
  upload.single("image"),
  skinImageController.uploadSkinImage
);

router.get(
  "/:imageId",
  requireAuth,
  validate(imageIdParamSchema),
  skinImageController.getSkinImageById
);

router.delete(
  "/:imageId",
  requireAuth,
  requireRole("PATIENT"),
  validate(imageIdParamSchema),
  skinImageController.deleteSkinImage
);

module.exports = router;
