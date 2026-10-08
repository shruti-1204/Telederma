/**
 * TeleDerma Medicine Alternative Finder
 * Alternative Matcher Service
 *
 * Implements deterministic matching rules based on:
 * - Active ingredients (all must match)
 * - Strengths (all must match)
 * - Dosage form (must match)
 * - Administration route (must match if present)
 * - Excludes target medicine
 * - Sorts by listed price ascending (null prices sorted last)
 *
 * NO LLM / Machine Learning used. Pure auditable business logic.
 */

const {
  normalizeDosageForm,
  normalizeRoute,
  extractAndNormalizeIngredients
} = require('../utils/normalize');

/**
 * Checks whether candidateMedicine is an EXACT COMPOSITION MATCH for targetMedicine.
 *
 * @param {object} targetMedicine - The medicine selected by the user
 * @param {object} candidateMedicine - Candidate medicine from the database
 * @returns {boolean}
 */
function isExactCompositionMatch(targetMedicine, candidateMedicine) {
  if (!targetMedicine || !candidateMedicine) return false;

  // RULE 5: Selected product itself must be excluded
  const targetId = targetMedicine.id;
  const candidateId = candidateMedicine.id;
  if (targetId !== undefined && candidateId !== undefined && targetId === candidateId) {
    return false;
  }

  // RULE 3 & 8: Dosage form must match exactly
  const targetForm = normalizeDosageForm(targetMedicine.dosage_form || targetMedicine.dosageForm);
  const candidateForm = normalizeDosageForm(candidateMedicine.dosage_form || candidateMedicine.dosageForm);
  if (!targetForm || !candidateForm || targetForm !== candidateForm) {
    return false;
  }

  // RULE 4: Route should match when route information is available on both
  const targetRoute = normalizeRoute(targetMedicine.route);
  const candidateRoute = normalizeRoute(candidateMedicine.route);
  if (targetRoute && candidateRoute && targetRoute !== candidateRoute) {
    return false;
  }

  // RULE 1, 2, 7 & 9: Active ingredients and strengths must match exactly
  const targetIngredients = extractAndNormalizeIngredients(
    targetMedicine.active_ingredients || targetMedicine.activeIngredients
  );
  const candidateIngredients = extractAndNormalizeIngredients(
    candidateMedicine.active_ingredients || candidateMedicine.activeIngredients
  );

  // Must have ingredients and length must be identical
  if (targetIngredients.length === 0 || candidateIngredients.length === 0) {
    return false;
  }

  if (targetIngredients.length !== candidateIngredients.length) {
    return false;
  }

  // Since extractAndNormalizeIngredients deterministically sorts by name & strength,
  // pairwise comparison guarantees exact multi-ingredient matching.
  for (let i = 0; i < targetIngredients.length; i++) {
    const targetItem = targetIngredients[i];
    const candidateItem = candidateIngredients[i];

    if (targetItem.name !== candidateItem.name) {
      return false;
    }

    if (targetItem.strength !== candidateItem.strength) {
      return false;
    }
  }

  return true;
}

/**
 * Sorts alternatives by listed price in ascending order.
 * If price is missing (null/undefined), it is placed after priced products.
 *
 * @param {Array<object>} alternatives
 * @returns {Array<object>}
 */
function sortAlternativesByPrice(alternatives) {
  return [...alternatives].sort((a, b) => {
    const priceA = a.price !== null && a.price !== undefined ? Number(a.price) : null;
    const priceB = b.price !== null && b.price !== undefined ? Number(b.price) : null;

    if (priceA !== null && priceB !== null) {
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      // Tie breaker by product name
      return (a.productName || '').localeCompare(b.productName || '');
    }

    // Unpriced items sorted to the bottom
    if (priceA !== null && priceB === null) return -1;
    if (priceA === null && priceB !== null) return 1;

    return 0;
  });
}

/**
 * Formats a raw database record to a clean, consistent API output structure.
 *
 * @param {object} med
 * @param {string|null} [matchType]
 * @returns {object}
 */
function formatMedicineOutput(med, matchType = null) {
  const activeIngredients =
    med.active_ingredients?.ingredients ||
    med.activeIngredients?.ingredients ||
    (Array.isArray(med.active_ingredients) ? med.active_ingredients : med.activeIngredients) ||
    [];

  const formatted = {
    id: med.id,
    brandName: med.brand_name || med.brandName,
    productName: med.product_name || med.productName,
    activeIngredients,
    strength: med.strength,
    dosageForm: med.dosage_form || med.dosageForm,
    route: med.route,
    manufacturer: med.manufacturer,
    packSize: med.pack_size || med.packSize,
    price: med.price !== null && med.price !== undefined ? parseFloat(med.price) : null,
    currency: med.currency || 'INR',
    source: med.source || 'Synthetic Catalog',
    isDemo: med.is_demo !== undefined ? med.is_demo : Boolean(med.isDemo)
  };

  if (matchType) {
    formatted.matchType = matchType;
  }

  return formatted;
}

/**
 * Finds all exact composition matches for a target medicine within a candidates list,
 * formats them, and returns them sorted by listed price.
 *
 * @param {object} targetMedicine
 * @param {Array<object>} candidateMedicines
 * @returns {Array<object>}
 */
function findExactCompositionMatches(targetMedicine, candidateMedicines) {
  if (!targetMedicine || !Array.isArray(candidateMedicines)) {
    return [];
  }

  const matchingMedicines = candidateMedicines
    .filter((candidate) => isExactCompositionMatch(targetMedicine, candidate))
    .map((candidate) => formatMedicineOutput(candidate, 'EXACT_COMPOSITION'));

  return sortAlternativesByPrice(matchingMedicines);
}

module.exports = {
  isExactCompositionMatch,
  sortAlternativesByPrice,
  formatMedicineOutput,
  findExactCompositionMatches
};
