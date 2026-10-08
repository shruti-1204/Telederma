/**
 * TeleDerma Medicine Alternative Finder
 * Normalization Utility
 *
 * Provides deterministic string and composition normalization
 * WITHOUT aggressive chemical equivalence assumptions.
 */

/**
 * Normalizes generic text strings:
 * - Converts to lowercase
 * - Trims leading and trailing whitespace
 * - Replaces consecutive whitespace with a single space
 * - Strips unnecessary wrapping quotes and terminal punctuation
 *
 * @param {string|any} str
 * @returns {string}
 */
function normalizeString(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '');
}

/**
 * Normalizes an active ingredient name.
 * Strictly preserves the chemical entity name without guessing equivalence.
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeIngredientName(name) {
  return normalizeString(name);
}

/**
 * Normalizes strength / concentration strings:
 * Examples:
 * - " 5 % " -> "5%"
 * - "5%" -> "5%"
 * - "10   mg" -> "10 mg"
 * - "10mg" -> "10 mg"
 * - "0.10%" -> "0.1%"
 * - "0.1%" -> "0.1%"
 *
 * @param {string} strength
 * @returns {string}
 */
function normalizeStrength(strength) {
  const cleaned = normalizeString(strength);
  if (!cleaned) return '';

  // Match pattern: numeric value + optional space + unit (e.g., 5%, 10 mg, 0.1 %, 2.5 ml, 5 mg/ml)
  const pattern = /^(\d+(?:\.\d+)?)\s*([%a-zA-Z]+(?:\/[%a-zA-Z]+)?)$/;
  const match = cleaned.match(pattern);

  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    // Standardize % without space, other units with single space
    if (unit === '%') {
      return `${num}%`;
    }
    return `${num} ${unit}`;
  }

  // Fallback: standard whitespace collapse
  return cleaned;
}

/**
 * Normalizes dosage form (e.g., "Face Wash", "Cream", "Gel", "Tablet").
 *
 * @param {string} form
 * @returns {string}
 */
function normalizeDosageForm(form) {
  return normalizeString(form);
}

/**
 * Normalizes administration route (e.g., "Topical", "Oral").
 *
 * @param {string} route
 * @returns {string}
 */
function normalizeRoute(route) {
  return normalizeString(route);
}

/**
 * Normalizes a single ingredient object { name, strength }.
 *
 * @param {object} item
 * @returns {{name: string, strength: string}}
 */
function normalizeIngredientItem(item) {
  if (!item) return { name: '', strength: '' };
  return {
    name: normalizeIngredientName(item.name || ''),
    strength: normalizeStrength(item.strength || '')
  };
}

/**
 * Extracts and normalizes active ingredients from JSONB or array representation.
 * Sorts ingredients alphabetically by name (and then strength) to ensure
 * combination products match regardless of the order ingredients were entered.
 *
 * @param {object|array} activeIngredients
 * @returns {Array<{name: string, strength: string}>}
 */
function extractAndNormalizeIngredients(activeIngredients) {
  let list = [];

  if (Array.isArray(activeIngredients)) {
    list = activeIngredients;
  } else if (activeIngredients && Array.isArray(activeIngredients.ingredients)) {
    list = activeIngredients.ingredients;
  } else if (typeof activeIngredients === 'string') {
    try {
      const parsed = JSON.parse(activeIngredients);
      list = Array.isArray(parsed) ? parsed : (parsed.ingredients || []);
    } catch {
      list = [];
    }
  }

  const normalized = list
    .map(normalizeIngredientItem)
    .filter((item) => item.name.length > 0);

  // Deterministic order-independent sort
  normalized.sort((a, b) => {
    const nameDiff = a.name.localeCompare(b.name);
    if (nameDiff !== 0) return nameDiff;
    return a.strength.localeCompare(b.strength);
  });

  return normalized;
}

/**
 * Generates an exact composition fingerprint for rapid deterministic matching.
 * Format: form:<dosageForm>|route:<route>|ingredients:<ing1>@<str1>,<ing2>@<str2>
 *
 * @param {Array<{name: string, strength: string}>} ingredients
 * @param {string} dosageForm
 * @param {string} [route]
 * @returns {string}
 */
function getCompositionFingerprint(ingredients, dosageForm, route = '') {
  const normForm = normalizeDosageForm(dosageForm);
  const normRoute = normalizeRoute(route);
  const normIngs = ingredients
    .map((item) => `${item.name}@${item.strength}`)
    .join(';');

  return `form:${normForm}|route:${normRoute}|ings:${normIngs}`;
}

module.exports = {
  normalizeString,
  normalizeIngredientName,
  normalizeStrength,
  normalizeDosageForm,
  normalizeRoute,
  normalizeIngredientItem,
  extractAndNormalizeIngredients,
  getCompositionFingerprint
};
