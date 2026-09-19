const express = require("express");
const router = express.Router();
const progressImageController = require("../controllers/progressImage.controller");
const upload = require("../middleware/upload");
const { requireAuth, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  progressImageIdParamSchema,
  patientProgressParamSchema,
} = require("../validators/image.validator");

// Patient upload & view
router.post(
  "/",
  requireAuth,
  requireRole("PATIENT"),
  upload.single("image"),
  progressImageController.uploadProgressImage
);

router.get("/", requireAuth, requireRole("PATIENT"), progressImageController.getMyProgressImages);

router.get(
  "/:id",
  requireAuth,
  validate(progressImageIdParamSchema),
  progressImageController.getProgressImageById
);

module.exports = router;
