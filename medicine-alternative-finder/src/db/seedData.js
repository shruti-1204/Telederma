/**
 * TeleDerma: Medicine Alternative Finder
 * Synthetic Seed Data for prototype demonstration & tests.
 * All records marked with is_demo = true.
 */

const SEED_MEDICINES = [
  // GROUP 1: Exact Match Group - Face Wash (Ingredient A 5%)
  {
    id: 1,
    brand_name: 'DemoDerm',
    product_name: 'DemoDerm Face Wash',
    active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'Demo Pharma Ltd',
    pack_size: '100 ml',
    price: 180.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 2,
    brand_name: 'SkinCare Plus',
    product_name: 'SkinCare Plus Face Wash',
    active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'SkinCare Laboratories',
    pack_size: '100 ml',
    price: 150.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 3,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Face Wash',
    active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '100 ml',
    price: 165.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 4,
    brand_name: 'PureDerma',
    product_name: 'PureDerma Gentle Wash',
    active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'PureDerma Wellness',
    pack_size: '100 ml',
    price: 195.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 1-B: Different Pack Sizes of Group 1
  {
    id: 5,
    brand_name: 'DemoDerm',
    product_name: 'DemoDerm Face Wash Large',
    active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'Demo Pharma Ltd',
    pack_size: '200 ml',
    price: 320.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 6,
    brand_name: 'SkinCare Plus',
    product_name: 'SkinCare Plus Travel Wash',
    active_ingredients: { ingredients: [{ name: 'Ingredient A', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'SkinCare Laboratories',
    pack_size: '50 ml',
    price: 85.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 2: Exact Match Group - Topical Gel (Adapalene Synthetic 0.1%)
  {
    id: 7,
    brand_name: 'ClearSkin',
    product_name: 'ClearSkin Gel',
    active_ingredients: { ingredients: [{ name: 'Adapalene Synthetic', strength: '0.1%' }] },
    strength: '0.1%',
    dosage_form: 'Gel',
    route: 'Topical',
    manufacturer: 'ClearSkin Biocare',
    pack_size: '15 g',
    price: 220.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 8,
    brand_name: 'AcneShield',
    product_name: 'AcneShield Gel',
    active_ingredients: { ingredients: [{ name: 'Adapalene Synthetic', strength: '0.1%' }] },
    strength: '0.1%',
    dosage_form: 'Gel',
    route: 'Topical',
    manufacturer: 'Shield Derma Labs',
    pack_size: '15 g',
    price: 185.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 9,
    brand_name: 'DermAssist',
    product_name: 'DermAssist Clear Gel',
    active_ingredients: { ingredients: [{ name: 'Adapalene Synthetic', strength: '0.1%' }] },
    strength: '0.1%',
    dosage_form: 'Gel',
    route: 'Topical',
    manufacturer: 'DermAssist Therapeutics',
    pack_size: '15 g',
    price: 200.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 10,
    brand_name: 'SkinCare Plus',
    product_name: 'SkinCare Plus Acne Gel',
    active_ingredients: { ingredients: [{ name: 'Adapalene Synthetic', strength: '0.1%' }] },
    strength: '0.1%',
    dosage_form: 'Gel',
    route: 'Topical',
    manufacturer: 'SkinCare Laboratories',
    pack_size: '15 g',
    price: 210.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 11,
    brand_name: 'GlowMed',
    product_name: 'GlowMed Clear Gel (Unpriced Demo)',
    active_ingredients: { ingredients: [{ name: 'Adapalene Synthetic', strength: '0.1%' }] },
    strength: '0.1%',
    dosage_form: 'Gel',
    route: 'Topical',
    manufacturer: 'GlowMed Pharmaceuticals',
    pack_size: '15 g',
    price: null,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 3: Exact Match Group - Barrier Cream (Ceramide Complex Alpha 1%)
  {
    id: 12,
    brand_name: 'SkinRelief',
    product_name: 'SkinRelief Hydro Cream',
    active_ingredients: { ingredients: [{ name: 'Ceramide Complex Alpha', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'SkinRelief Formulations',
    pack_size: '50 g',
    price: 310.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 13,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Moisture Cream',
    active_ingredients: { ingredients: [{ name: 'Ceramide Complex Alpha', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '50 g',
    price: 275.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 14,
    brand_name: 'GlowMed',
    product_name: 'GlowMed Barrier Cream',
    active_ingredients: { ingredients: [{ name: 'Ceramide Complex Alpha', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'GlowMed Pharmaceuticals',
    pack_size: '50 g',
    price: 340.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 15,
    brand_name: 'DemoDerm',
    product_name: 'DemoDerm Hydrating Cream',
    active_ingredients: { ingredients: [{ name: 'Ceramide Complex Alpha', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'Demo Pharma Ltd',
    pack_size: '50 g',
    price: 290.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 4: Non-Matching Strength Test (Ingredient B Cream with 1%, 2%, 5%)
  {
    id: 16,
    brand_name: 'DemoDerm',
    product_name: 'DemoDerm Cream 1%',
    active_ingredients: { ingredients: [{ name: 'Ingredient B', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'Demo Pharma Ltd',
    pack_size: '30 g',
    price: 140.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 17,
    brand_name: 'SkinCare Plus',
    product_name: 'SkinCare Cream 2%',
    active_ingredients: { ingredients: [{ name: 'Ingredient B', strength: '2%' }] },
    strength: '2%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'SkinCare Laboratories',
    pack_size: '30 g',
    price: 170.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 18,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Intensive Cream 5%',
    active_ingredients: { ingredients: [{ name: 'Ingredient B', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '30 g',
    price: 210.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 5: Non-Matching Dosage Form Test (Ingredient C 5% in Cream vs Gel vs Lotion)
  {
    id: 19,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Soothing Cream',
    active_ingredients: { ingredients: [{ name: 'Ingredient C', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '20 g',
    price: 130.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 20,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Soothing Gel',
    active_ingredients: { ingredients: [{ name: 'Ingredient C', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Gel',
    route: 'Topical',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '20 g',
    price: 135.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 21,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Soothing Lotion',
    active_ingredients: { ingredients: [{ name: 'Ingredient C', strength: '5%' }] },
    strength: '5%',
    dosage_form: 'Lotion',
    route: 'Topical',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '50 ml',
    price: 160.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 6: Different Ingredient Test (10% Cream with Ingredient D vs Ingredient E)
  {
    id: 22,
    brand_name: 'ClearSkin',
    product_name: 'ClearSkin Purifying Cream',
    active_ingredients: { ingredients: [{ name: 'Ingredient D', strength: '10%' }] },
    strength: '10%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'ClearSkin Biocare',
    pack_size: '30 g',
    price: 250.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 23,
    brand_name: 'SkinRelief',
    product_name: 'SkinRelief Soothing Cream',
    active_ingredients: { ingredients: [{ name: 'Ingredient E', strength: '10%' }] },
    strength: '10%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'SkinRelief Formulations',
    pack_size: '30 g',
    price: 240.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 7: Combination Products
  {
    id: 24,
    brand_name: 'DemoDerm',
    product_name: 'DemoDerm Dual Action Tablet',
    active_ingredients: {
      ingredients: [
        { name: 'Ingredient X', strength: '10 mg' },
        { name: 'Ingredient Y', strength: '5 mg' }
      ]
    },
    strength: '10 mg + 5 mg',
    dosage_form: 'Tablet',
    route: 'Oral',
    manufacturer: 'Demo Pharma Ltd',
    pack_size: '10 tablets',
    price: 120.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 25,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Combo Tablet',
    active_ingredients: {
      ingredients: [
        { name: 'Ingredient X', strength: '10 mg' },
        { name: 'Ingredient Y', strength: '5 mg' }
      ]
    },
    strength: '10 mg + 5 mg',
    dosage_form: 'Tablet',
    route: 'Oral',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '10 tablets',
    price: 95.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 26,
    brand_name: 'ClearSkin',
    product_name: 'ClearSkin Duo Tablet',
    active_ingredients: {
      ingredients: [
        { name: 'Ingredient Y', strength: '5 mg' },
        { name: 'Ingredient X', strength: '10 mg' }
      ]
    },
    strength: '5 mg + 10 mg',
    dosage_form: 'Tablet',
    route: 'Oral',
    manufacturer: 'ClearSkin Biocare',
    pack_size: '10 tablets',
    price: 110.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 27,
    brand_name: 'DermAssist',
    product_name: 'DermAssist Combo Forte Tablet',
    active_ingredients: {
      ingredients: [
        { name: 'Ingredient X', strength: '10 mg' },
        { name: 'Ingredient Y', strength: '10 mg' }
      ]
    },
    strength: '10 mg + 10 mg',
    dosage_form: 'Tablet',
    route: 'Oral',
    manufacturer: 'DermAssist Therapeutics',
    pack_size: '10 tablets',
    price: 140.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 28,
    brand_name: 'PureDerma',
    product_name: 'PureDerma Solo Tablet',
    active_ingredients: {
      ingredients: [{ name: 'Ingredient X', strength: '10 mg' }]
    },
    strength: '10 mg',
    dosage_form: 'Tablet',
    route: 'Oral',
    manufacturer: 'PureDerma Wellness',
    pack_size: '10 tablets',
    price: 70.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 8: Antifungal Cream (Clotrimazole Synthetic 1%)
  {
    id: 29,
    brand_name: 'DermaCare',
    product_name: 'DermaCare Myco Cream',
    active_ingredients: { ingredients: [{ name: 'Clotrimazole Synthetic', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'DermaCare Healthcare',
    pack_size: '20 g',
    price: 85.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 30,
    brand_name: 'SkinRelief',
    product_name: 'SkinRelief Antifungal Cream',
    active_ingredients: { ingredients: [{ name: 'Clotrimazole Synthetic', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'SkinRelief Formulations',
    pack_size: '20 g',
    price: 72.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 31,
    brand_name: 'ClearSkin',
    product_name: 'ClearSkin Myco Care Cream',
    active_ingredients: { ingredients: [{ name: 'Clotrimazole Synthetic', strength: '1%' }] },
    strength: '1%',
    dosage_form: 'Cream',
    route: 'Topical',
    manufacturer: 'ClearSkin Biocare',
    pack_size: '20 g',
    price: 78.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 9: BHA Cleanser (Salicylic Synthetic 2%)
  {
    id: 32,
    brand_name: 'AcneShield',
    product_name: 'AcneShield Pore Cleanser',
    active_ingredients: { ingredients: [{ name: 'Salicylic Synthetic', strength: '2%' }] },
    strength: '2%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'Shield Derma Labs',
    pack_size: '100 ml',
    price: 240.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 33,
    brand_name: 'ClearSkin',
    product_name: 'ClearSkin BHA Wash',
    active_ingredients: { ingredients: [{ name: 'Salicylic Synthetic', strength: '2%' }] },
    strength: '2%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'ClearSkin Biocare',
    pack_size: '100 ml',
    price: 210.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },
  {
    id: 34,
    brand_name: 'SkinCare Plus',
    product_name: 'SkinCare Plus BHA Foam',
    active_ingredients: { ingredients: [{ name: 'Salicylic Synthetic', strength: '2%' }] },
    strength: '2%',
    dosage_form: 'Face Wash',
    route: 'Topical',
    manufacturer: 'SkinCare Laboratories',
    pack_size: '100 ml',
    price: 225.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  },

  // GROUP 10: Standalone Unique Product (No Alternative in DB)
  {
    id: 35,
    brand_name: 'DermAssist',
    product_name: 'DermAssist Unique Bio Serum',
    active_ingredients: { ingredients: [{ name: 'Synthetic Peptides Bio', strength: '2.5%' }] },
    strength: '2.5%',
    dosage_form: 'Serum',
    route: 'Topical',
    manufacturer: 'DermAssist Therapeutics',
    pack_size: '30 ml',
    price: 550.00,
    currency: 'INR',
    source: 'Synthetic Catalog',
    is_demo: true
  }
];

module.exports = { SEED_MEDICINES };
