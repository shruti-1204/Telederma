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

module.exports = {
  searchMedicines,
  getAlternatives,
};
