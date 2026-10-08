/**
 * TeleDerma Medicine Alternative Finder
 * Medicine Controller
 */

const {
  searchMedicines,
  getMedicineById,
  findAlternativesForMedicine
} = require('../services/medicineSearchService');

/**
 * GET /api/medicines/search?q=
 * Searches medicines by brand name, product name, or active ingredients.
 */
async function search(req, res) {
  try {
    const rawQuery = req.query.q;

    if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required for medicine search."
      });
    }

    const queryTerm = rawQuery.trim();
    const results = await searchMedicines(queryTerm);

    return res.status(200).json({
      success: true,
      query: queryTerm,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('[MedicineController.search] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while searching medicines.'
    });
  }
}

/**
 * GET /api/medicines/:id
 * Retrieves detailed information for a single medicine.
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid medicine ID. Must be a positive integer.'
      });
    }

    const medicine = await getMedicineById(parsedId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: `Medicine with ID ${parsedId} was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      medicine
    });
  } catch (error) {
    console.error('[MedicineController.getById] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while retrieving medicine details.'
    });
  }
}

/**
 * GET /api/medicines/:id/alternatives
 * Retrieves exact composition alternatives for the selected medicine, sorted by lowest price.
 */
async function getAlternatives(req, res) {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);

    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid medicine ID. Must be a positive integer.'
      });
    }

    const result = await findAlternativesForMedicine(parsedId);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Medicine with ID ${parsedId} was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      targetMedicine: result.targetMedicine,
      matchingCriteria: result.matchingCriteria,
      count: result.count,
      alternatives: result.alternatives,
      disclaimer: result.disclaimer
    });
  } catch (error) {
    console.error('[MedicineController.getAlternatives] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while computing medicine alternatives.'
    });
  }
}

module.exports = {
  search,
  getById,
  getAlternatives
};
