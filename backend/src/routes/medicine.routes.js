const express = require("express");
const router = express.Router();
const medicineController = require("../controllers/medicine.controller");
const validate = require("../middleware/validate");
const {
  searchMedicineSchema,
  medicineIdParamSchema,
} = require("../validators/medicine.validator");

router.get("/molecules", medicineController.getMolecules);
router.get("/search", validate(searchMedicineSchema), medicineController.searchMedicines);
router.get("/:medicineId/alternatives", validate(medicineIdParamSchema), medicineController.getAlternatives);
router.get("/:medicineId", validate(medicineIdParamSchema), medicineController.getById);

module.exports = router;
