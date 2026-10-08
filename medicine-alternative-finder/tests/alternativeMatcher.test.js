/**
 * TeleDerma Medicine Alternative Finder
 * Automated Test Suite for Matching Engine & Search Service
 *
 * Covers required TEST 1 through TEST 10 and edge cases.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  isExactCompositionMatch,
  sortAlternativesByPrice,
  findExactCompositionMatches
} = require('../src/services/alternativeMatcher');

const {
  normalizeString,
  normalizeStrength,
  normalizeDosageForm,
  extractAndNormalizeIngredients,
  getCompositionFingerprint
} = require('../src/utils/normalize');

const {
  searchMedicines,
  getMedicineById,
  findAlternativesForMedicine
} = require('../src/services/medicineSearchService');

describe('Alternative Matcher Engine - Rule Verification', () => {

  // --------------------------------------------------------------------------
  // TEST 1: Same ingredient + same strength + same form -> MATCH
  // --------------------------------------------------------------------------
  it('TEST 1: Same ingredient + same strength + same form -> MATCH', () => {
    const medA = {
      id: 1,
      brand_name: 'DemoDerm',
      product_name: 'DemoDerm Face Wash',
      dosage_form: 'Face Wash',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] }
    };

    const medB = {
      id: 2,
      brand_name: 'SkinCare Plus',
      product_name: 'SkinCare Plus Face Wash',
      dosage_form: 'Face Wash',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] }
    };

    const match = isExactCompositionMatch(medA, medB);
    assert.equal(match, true, 'Medicines with identical ingredient, strength, and dosage form must match');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Same ingredient + different strength -> NO MATCH
  // --------------------------------------------------------------------------
  it('TEST 2: Same ingredient + different strength -> NO MATCH', () => {
    const medA = {
      id: 10,
      brand_name: 'DemoDerm',
      product_name: 'DemoDerm Cream 1%',
      dosage_form: 'Cream',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient B', strength: '1%' }] }
    };

    const medB = {
      id: 11,
      brand_name: 'SkinCare Plus',
      product_name: 'SkinCare Cream 2%',
      dosage_form: 'Cream',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient B', strength: '2%' }] }
    };

    const match = isExactCompositionMatch(medA, medB);
    assert.equal(match, false, 'Medicines with different strengths must not match');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Different ingredient + same strength + same form -> NO MATCH
  // --------------------------------------------------------------------------
  it('TEST 3: Different ingredient + same strength + same form -> NO MATCH', () => {
    const medA = {
      id: 20,
      brand_name: 'ClearSkin',
      product_name: 'ClearSkin Purifying Cream',
      dosage_form: 'Cream',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient D', strength: '10%' }] }
    };

    const medB = {
      id: 21,
      brand_name: 'SkinRelief',
      product_name: 'SkinRelief Soothing Cream',
      dosage_form: 'Cream',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient E', strength: '10%' }] }
    };

    const match = isExactCompositionMatch(medA, medB);
    assert.equal(match, false, 'Medicines with different active ingredients must not match');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Same ingredient + same strength + different form -> NO MATCH
  // --------------------------------------------------------------------------
  it('TEST 4: Same ingredient + same strength + different form -> NO MATCH', () => {
    const medCream = {
      id: 30,
      brand_name: 'DermaCare',
      product_name: 'DermaCare Cream',
      dosage_form: 'Cream',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient C', strength: '5%' }] }
    };

    const medGel = {
      id: 31,
      brand_name: 'DermaCare',
      product_name: 'DermaCare Gel',
      dosage_form: 'Gel',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient C', strength: '5%' }] }
    };

    const match = isExactCompositionMatch(medCream, medGel);
    assert.equal(match, false, 'Cream and Gel must not be considered exact composition matches');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Combination product with same ingredients and strengths -> MATCH
  // --------------------------------------------------------------------------
  it('TEST 5: Combination product with same ingredients and strengths -> MATCH (order-independent)', () => {
    const comboA = {
      id: 40,
      brand_name: 'DemoDerm',
      product_name: 'DemoDerm Dual Action Tablet',
      dosage_form: 'Tablet',
      route: 'Oral',
      active_ingredients: {
        ingredients: [
          { name: 'Ingredient X', strength: '10 mg' },
          { name: 'Ingredient Y', strength: '5 mg' }
        ]
      }
    };

    // Notice reversed ingredient list order in comboB to verify order-independence
    const comboB = {
      id: 41,
      brand_name: 'ClearSkin',
      product_name: 'ClearSkin Duo Tablet',
      dosage_form: 'Tablet',
      route: 'Oral',
      active_ingredients: {
        ingredients: [
          { name: 'Ingredient Y', strength: '5 mg' },
          { name: 'Ingredient X', strength: '10 mg' }
        ]
      }
    };

    const match = isExactCompositionMatch(comboA, comboB);
    assert.equal(match, true, 'Combination products with identical ingredients & strengths in any order must match');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Combination product with one different strength -> NO MATCH
  // --------------------------------------------------------------------------
  it('TEST 6: Combination product with one different strength -> NO MATCH', () => {
    const comboA = {
      id: 50,
      brand_name: 'DemoDerm',
      product_name: 'DemoDerm Dual Action Tablet',
      dosage_form: 'Tablet',
      route: 'Oral',
      active_ingredients: {
        ingredients: [
          { name: 'Ingredient X', strength: '10 mg' },
          { name: 'Ingredient Y', strength: '5 mg' }
        ]
      }
    };

    const comboForte = {
      id: 51,
      brand_name: 'DermAssist',
      product_name: 'DermAssist Combo Forte Tablet',
      dosage_form: 'Tablet',
      route: 'Oral',
      active_ingredients: {
        ingredients: [
          { name: 'Ingredient X', strength: '10 mg' },
          { name: 'Ingredient Y', strength: '10 mg' } // 10 mg vs 5 mg!
        ]
      }
    };

    const match = isExactCompositionMatch(comboA, comboForte);
    assert.equal(match, false, 'Combination products with even one mismatched strength must not match');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Selected medicine -> MUST NOT appear in alternatives
  // --------------------------------------------------------------------------
  it('TEST 7: Selected medicine -> MUST NOT appear in its own alternatives', () => {
    const targetMedicine = {
      id: 1,
      brand_name: 'DemoDerm',
      product_name: 'DemoDerm Face Wash',
      dosage_form: 'Face Wash',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
      price: 180.00
    };

    const candidates = [
      targetMedicine, // The target medicine itself
      {
        id: 2,
        brand_name: 'SkinCare Plus',
        product_name: 'SkinCare Plus Face Wash',
        dosage_form: 'Face Wash',
        route: 'Topical',
        active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
        price: 150.00
      }
    ];

    const alternatives = findExactCompositionMatches(targetMedicine, candidates);
    assert.equal(alternatives.length, 1, 'Target medicine must be excluded');
    assert.equal(alternatives[0].id, 2, 'Only alternative product must remain');
    assert.ok(alternatives.every((alt) => alt.id !== targetMedicine.id));
  });

  // --------------------------------------------------------------------------
  // TEST 8: Different pack size but same composition -> MATCH
  // --------------------------------------------------------------------------
  it('TEST 8: Different pack size but same composition -> MATCH', () => {
    const targetMedicine = {
      id: 1,
      brand_name: 'DemoDerm',
      product_name: 'DemoDerm Face Wash 100ml',
      dosage_form: 'Face Wash',
      route: 'Topical',
      pack_size: '100 ml',
      active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
      price: 180.00
    };

    const largePack = {
      id: 5,
      brand_name: 'DemoDerm',
      product_name: 'DemoDerm Face Wash Large',
      dosage_form: 'Face Wash',
      route: 'Topical',
      pack_size: '200 ml',
      active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
      price: 320.00
    };

    const match = isExactCompositionMatch(targetMedicine, largePack);
    assert.equal(match, true, 'Products with differing pack sizes must match if composition is identical');
    assert.equal(largePack.pack_size, '200 ml');
  });

  // --------------------------------------------------------------------------
  // TEST 9: No matching product -> Empty alternatives array
  // --------------------------------------------------------------------------
  it('TEST 9: No matching product -> Empty alternatives array', () => {
    const uniqueMedicine = {
      id: 99,
      brand_name: 'Specialist Bio',
      product_name: 'Unique Bio Solution',
      dosage_form: 'Solution',
      route: 'Topical',
      active_ingredients: { ingredients: [{ name: 'Rare Ingredient Q', strength: '0.05%' }] }
    };

    const catalog = [
      {
        id: 1,
        brand_name: 'DemoDerm',
        product_name: 'DemoDerm Face Wash',
        dosage_form: 'Face Wash',
        active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] }
      },
      {
        id: 7,
        brand_name: 'ClearSkin',
        product_name: 'ClearSkin Gel',
        dosage_form: 'Gel',
        active_ingredients: { ingredients: [{ name: 'Adapalene Synthetic', strength: '0.1%' }] }
      }
    ];

    const alternatives = findExactCompositionMatches(uniqueMedicine, catalog);
    assert.deepEqual(alternatives, [], 'When no product matches composition, return empty array');
  });

  // --------------------------------------------------------------------------
  // TEST 10: Search is case-insensitive
  // --------------------------------------------------------------------------
  it('TEST 10: Search and normalization is case-insensitive', async () => {
    // 10a. Normalization string case insensitivity
    assert.equal(normalizeString('DERMADEW'), 'dermadew');
    assert.equal(normalizeString('  DemoDerm  Face Wash  '), 'demoderm face wash');
    assert.equal(normalizeDosageForm('FACE WASH'), 'face wash');
    assert.equal(normalizeStrength('  5 % '), '5%');
    assert.equal(normalizeStrength('10MG'), '10 mg');

    // 10b. Search service test with varied casings
    const lowerResults = await searchMedicines('demoderm');
    const upperResults = await searchMedicines('DEMODERM');
    const mixedResults = await searchMedicines('DeMoDeRm');

    assert.ok(lowerResults.length > 0, 'Lower-case search should return results');
    assert.equal(
      lowerResults.length,
      upperResults.length,
      'Uppercase query must return same count as lowercase'
    );
    assert.equal(
      lowerResults.length,
      mixedResults.length,
      'Mixed-case query must return same count as lowercase'
    );
  });
});

describe('Price Sorting & Missing Price Handling', () => {
  it('Sorts alternatives by lowest price first, unpriced (null) items at the bottom', () => {
    const alts = [
      { id: 1, productName: 'Product High', price: 300.00 },
      { id: 2, productName: 'Product Null Price', price: null },
      { id: 3, productName: 'Product Low', price: 100.00 },
      { id: 4, productName: 'Product Mid', price: 200.00 }
    ];

    const sorted = sortAlternativesByPrice(alts);

    assert.equal(sorted[0].id, 3, 'Lowest price (100) must be first');
    assert.equal(sorted[1].id, 4, 'Mid price (200) must be second');
    assert.equal(sorted[2].id, 1, 'High price (300) must be third');
    assert.equal(sorted[3].id, 2, 'Null price must be sorted last');
    assert.equal(sorted[3].price, null);
  });
});

describe('Normalization Edge Cases', () => {
  it('Extracts and normalizes ingredients from various JSON formats', () => {
    const parsed = extractAndNormalizeIngredients({
      ingredients: [
        { name: '  Ingredient A  ', strength: ' 5 % ' }
      ]
    });

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, 'ingredient a');
    assert.equal(parsed[0].strength, '5%');
  });

  it('Normalizes decimal concentrations (e.g., 0.10% vs 0.1%)', () => {
    const s1 = normalizeStrength('0.1%');
    const s2 = normalizeStrength('0.10%');
    assert.equal(s1, '0.1%');
    assert.equal(s2, '0.1%');
  });

  it('Generates identical composition fingerprint regardless of input order', () => {
    const ings1 = extractAndNormalizeIngredients([
      { name: 'Zinc Oxide', strength: '10%' },
      { name: 'Octinoxate', strength: '7.5%' }
    ]);

    const ings2 = extractAndNormalizeIngredients([
      { name: 'Octinoxate', strength: '7.5%' },
      { name: 'Zinc Oxide', strength: '10%' }
    ]);

    const fp1 = getCompositionFingerprint(ings1, 'Gel', 'Topical');
    const fp2 = getCompositionFingerprint(ings2, 'Gel', 'Topical');

    assert.equal(fp1, fp2);
  });
});

describe('End-to-End Service Flow', () => {
  it('Flow: Search "DemoDerm" -> Select Face Wash -> Find lowest-price alternatives', async () => {
    // Step 1: Search
    const searchRes = await searchMedicines('DemoDerm');
    assert.ok(searchRes.length > 0);

    const faceWash = searchRes.find((m) => m.productName === 'DemoDerm Face Wash');
    assert.ok(faceWash, 'DemoDerm Face Wash should be present in search results');

    // Step 2: Get Details
    const details = await getMedicineById(faceWash.id);
    assert.ok(details);
    assert.equal(details.brandName, 'DemoDerm');
    assert.ok(details.disclaimer.includes('Consult your dermatologist'));

    // Step 3: Find Alternatives
    const altResponse = await findAlternativesForMedicine(faceWash.id);
    assert.ok(altResponse);
    assert.ok(altResponse.alternatives.length >= 2, 'Should have multiple alternatives');

    // Verify original product is excluded
    assert.ok(altResponse.alternatives.every((a) => a.id !== faceWash.id));

    // Verify all alternatives have exact matching composition
    for (const alt of altResponse.alternatives) {
      assert.equal(alt.dosageForm, 'Face Wash');
      assert.equal(alt.matchType, 'EXACT_COMPOSITION');
      assert.equal(alt.activeIngredients[0].name, 'Ingredient A');
      assert.equal(alt.activeIngredients[0].strength, '5%');
    }

    // Verify sorted by price ascending
    const prices = altResponse.alternatives
      .map((a) => a.price)
      .filter((p) => p !== null);
    for (let i = 0; i < prices.length - 1; i++) {
      assert.ok(prices[i] <= prices[i + 1], `Price at ${i} (${prices[i]}) must be <= price at ${i+1} (${prices[i+1]})`);
    }
  });

  it('Returns empty alternatives for unique product with no match in catalog', async () => {
    // DermAssist Unique Bio Serum (ID 35)
    const result = await findAlternativesForMedicine(35);
    assert.ok(result);
    assert.equal(result.alternatives.length, 0);
  });
});
