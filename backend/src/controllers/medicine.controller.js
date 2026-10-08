const medicineService = require("../services/medicine.service");
const { sendSuccess } = require("../utils/response");

const searchMedicines = async (req, res, next) => {
  try {
    const results = await medicineService.search(req.query.q || "");
    return sendSuccess(res, "Medicines search results", results);
  } catch (err) {
    return next(err);
  }
};

const getAlternatives = async (req, res, next) => {
  try {
    const alternatives = await medicineService.getAlternatives(req.params.medicineId);
    return sendSuccess(res, "Medicine alternatives retrieved", alternatives);
  } catch (err) {
    return next(err);
  }
};

const getMolecules = async (req, res, next) => {
  try {
    const molecules = await medicineService.getMolecules();
    return sendSuccess(res, "Suggested medicine molecules retrieved", molecules);
  } catch (err) {
    return next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const medicine = await medicineService.getById(req.params.medicineId);
    return sendSuccess(res, "Medicine retrieved successfully", medicine);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMolecules,
  getById,
  searchMedicines,
  getAlternatives,
};
