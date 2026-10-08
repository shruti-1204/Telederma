/**
 * TeleDerma Medicine Alternative Finder
 * Medicine Search & Data Retrieval Service
 */

const db = require('../db/database');
const { formatMedicineOutput, findExactCompositionMatches } = require('./alternativeMatcher');
const { normalizeString } = require('../utils/normalize');

const MEDICAL_SAFETY_DISCLAIMER =
  'Alternatives are shown based on matching active ingredient(s), strength and dosage form. Consult your dermatologist before changing a prescribed product.';

/**
 * Searches medicines by brand name, product name, or active ingredients.
 * Returns a concise projection of matching records.
 *
 * @param {string} rawQuery
 * @returns {Promise<Array<object>>}
 */
async function searchMedicines(rawQuery) {
  const term = normalizeString(rawQuery);
  if (!term || term.length === 0) {
    return [];
  }

  const likePattern = `%${term}%`;
  const sql = `
    SELECT id, brand_name, product_name, dosage_form, strength, pack_size, price, currency
    FROM medicines
    WHERE LOWER(brand_name) LIKE $1
       OR LOWER(product_name) LIKE $1
       OR active_ingredients::text ILIKE $1
    ORDER BY product_name ASC
    LIMIT 50
  `;

  const result = await db.query(sql, [likePattern]);

  return result.rows.map((row) => ({
    id: row.id,
    brandName: row.brand_name,
    productName: row.product_name,
    dosageForm: row.dosage_form,
    strength: row.strength,
    packSize: row.pack_size,
    price: row.price !== null && row.price !== undefined ? parseFloat(row.price) : null,
    currency: row.currency || 'INR'
  }));
}

/**
 * Retrieves full details for a single medicine by its ID.
 *
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
async function getMedicineById(id) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return null;
  }

  const sql = `
    SELECT id, brand_name, product_name, active_ingredients, strength, dosage_form,
           route, manufacturer, pack_size, price, currency, source, is_demo
    FROM medicines
    WHERE id = $1
    LIMIT 1
  `;

  const result = await db.query(sql, [parsedId]);
  if (!result.rows || result.rows.length === 0) {
    return null;
  }

  const medicine = formatMedicineOutput(result.rows[0]);
  return {
    ...medicine,
    disclaimer: MEDICAL_SAFETY_DISCLAIMER
  };
}

/**
 * Finds alternative products for a selected medicine.
 * Filters candidates by matching dosage form in DB, then applies exact composition matching.
 * Excludes the target medicine itself, and sorts alternatives by listed price ascending.
 *
 * @param {number|string} id
 * @returns {Promise<{targetMedicine: object, alternatives: Array<object>}|null>}
 */
async function findAlternativesForMedicine(id) {
  const targetMedicine = await getMedicineById(id);
  if (!targetMedicine) {
    return null;
  }

  // Candidate medicines query: exclude target medicine and narrow by dosage form
  const candidateSql = `
    SELECT id, brand_name, product_name, active_ingredients, strength, dosage_form,
           route, manufacturer, pack_size, price, currency, source, is_demo
    FROM medicines
    WHERE id != $1
      AND LOWER(dosage_form) = LOWER($2)
  `;

  const candidateResult = await db.query(candidateSql, [
    targetMedicine.id,
    targetMedicine.dosageForm
  ]);

  const candidates = candidateResult.rows;

  // Run deterministic exact composition matcher
  const alternatives = findExactCompositionMatches(targetMedicine, candidates);

  return {
    targetMedicine: {
      id: targetMedicine.id,
      brandName: targetMedicine.brandName,
      productName: targetMedicine.productName,
      activeIngredients: targetMedicine.activeIngredients,
      strength: targetMedicine.strength,
      dosageForm: targetMedicine.dosageForm,
      route: targetMedicine.route,
      manufacturer: targetMedicine.manufacturer,
      packSize: targetMedicine.packSize,
      price: targetMedicine.price,
      currency: targetMedicine.currency
    },
    matchingCriteria: {
      activeIngredients: true,
      strength: true,
      dosageForm: true,
      route: true
    },
    count: alternatives.length,
    alternatives,
    disclaimer: MEDICAL_SAFETY_DISCLAIMER
  };
}

module.exports = {
  searchMedicines,
  getMedicineById,
  findAlternativesForMedicine,
  MEDICAL_SAFETY_DISCLAIMER
};
