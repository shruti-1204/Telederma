-- ============================================================================
-- TeleDerma: Medicine Alternative Finder - Synthetic Seed Dataset
-- NOTE: ALL records are synthetic demo data created for prototype testing.
-- They are NOT verified commercial medicine records.
-- is_demo is set to TRUE for all rows.
-- ============================================================================

INSERT INTO medicines (
    id,
    brand_name,
    product_name,
    active_ingredients,
    strength,
    dosage_form,
    route,
    manufacturer,
    pack_size,
    price,
    currency,
    source,
    is_demo
) VALUES

-- ----------------------------------------------------------------------------
-- GROUP 1: Exact Match Group - Face Wash (Ingredient A 5%)
-- ----------------------------------------------------------------------------
(
    1,
    'DemoDerm',
    'DemoDerm Face Wash',
    '{"ingredients": [{"name": "Ingredient A", "strength": "5%"}]}'::jsonb,
    '5%',
    'Face Wash',
    'Topical',
    'Demo Pharma Ltd',
    '100 ml',
    180.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    2,
    'SkinCare Plus',
    'SkinCare Plus Face Wash',
    '{"ingredients": [{"name": "Ingredient A", "strength": "5%"}]}'::jsonb,
    '5%',
    'Face Wash',
    'Topical',
    'SkinCare Laboratories',
    '100 ml',
    150.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    3,
    'DermaCare',
    'DermaCare Face Wash',
    '{"ingredients": [{"name": "Ingredient A", "strength": "5%"}]}'::jsonb,
    '5%',
    'Face Wash',
    'Topical',
    'DermaCare Healthcare',
    '100 ml',
    165.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    4,
    'PureDerma',
    'PureDerma Gentle Wash',
    '{"ingredients": [{"name": "Ingredient A", "strength": "5%"}]}'::jsonb,
    '5%',
    'Face Wash',
    'Topical',
    'PureDerma Wellness',
    '100 ml',
    195.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 1-B: Different Pack Sizes of Group 1 (Same composition, different pack)
-- ----------------------------------------------------------------------------
(
    5,
    'DemoDerm',
    'DemoDerm Face Wash Large',
    '{"ingredients": [{"name": "Ingredient A", "strength": "5%"}]}'::jsonb,
    '5%',
    'Face Wash',
    'Topical',
    'Demo Pharma Ltd',
    '200 ml',
    320.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    6,
    'SkinCare Plus',
    'SkinCare Plus Travel Wash',
    '{"ingredients": [{"name": "Ingredient A", "strength": "5%"}]}'::jsonb,
    '5%',
    'Face Wash',
    'Topical',
    'SkinCare Laboratories',
    '50 ml',
    85.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 2: Exact Match Group - Topical Gel (Adapalene Synthetic 0.1%)
-- ----------------------------------------------------------------------------
(
    7,
    'ClearSkin',
    'ClearSkin Gel',
    '{"ingredients": [{"name": "Adapalene Synthetic", "strength": "0.1%"}]}'::jsonb,
    '0.1%',
    'Gel',
    'Topical',
    'ClearSkin Biocare',
    '15 g',
    220.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    8,
    'AcneShield',
    'AcneShield Gel',
    '{"ingredients": [{"name": "Adapalene Synthetic", "strength": "0.1%"}]}'::jsonb,
    '0.1%',
    'Gel',
    'Topical',
    'Shield Derma Labs',
    '15 g',
    185.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    9,
    'DermAssist',
    'DermAssist Clear Gel',
    '{"ingredients": [{"name": "Adapalene Synthetic", "strength": "0.1%"}]}'::jsonb,
    '0.1%',
    'Gel',
    'Topical',
    'DermAssist Therapeutics',
    '15 g',
    200.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    10,
    'SkinCare Plus',
    'SkinCare Plus Acne Gel',
    '{"ingredients": [{"name": "Adapalene Synthetic", "strength": "0.1%"}]}'::jsonb,
    '0.1%',
    'Gel',
    'Topical',
    'SkinCare Laboratories',
    '15 g',
    210.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    11,
    'GlowMed',
    'GlowMed Clear Gel (Unpriced Demo)',
    '{"ingredients": [{"name": "Adapalene Synthetic", "strength": "0.1%"}]}'::jsonb,
    '0.1%',
    'Gel',
    'Topical',
    'GlowMed Pharmaceuticals',
    '15 g',
    NULL,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 3: Exact Match Group - Barrier Cream (Ceramide Complex Alpha 1%)
-- ----------------------------------------------------------------------------
(
    12,
    'SkinRelief',
    'SkinRelief Hydro Cream',
    '{"ingredients": [{"name": "Ceramide Complex Alpha", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'SkinRelief Formulations',
    '50 g',
    310.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    13,
    'DermaCare',
    'DermaCare Moisture Cream',
    '{"ingredients": [{"name": "Ceramide Complex Alpha", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'DermaCare Healthcare',
    '50 g',
    275.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    14,
    'GlowMed',
    'GlowMed Barrier Cream',
    '{"ingredients": [{"name": "Ceramide Complex Alpha", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'GlowMed Pharmaceuticals',
    '50 g',
    340.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    15,
    'DemoDerm',
    'DemoDerm Hydrating Cream',
    '{"ingredients": [{"name": "Ceramide Complex Alpha", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'Demo Pharma Ltd',
    '50 g',
    290.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 4: Non-Matching Strength Test (Ingredient B Cream with 1%, 2%, 5%)
-- ----------------------------------------------------------------------------
(
    16,
    'DemoDerm',
    'DemoDerm Cream 1%',
    '{"ingredients": [{"name": "Ingredient B", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'Demo Pharma Ltd',
    '30 g',
    140.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    17,
    'SkinCare Plus',
    'SkinCare Cream 2%',
    '{"ingredients": [{"name": "Ingredient B", "strength": "2%"}]}'::jsonb,
    '2%',
    'Cream',
    'Topical',
    'SkinCare Laboratories',
    '30 g',
    170.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    18,
    'DermaCare',
    'DermaCare Intensive Cream 5%',
    '{"ingredients": [{"name": "Ingredient B", "strength": "5%"}]}'::jsonb,
    '5%',
    'Cream',
    'Topical',
    'DermaCare Healthcare',
    '30 g',
    210.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 5: Non-Matching Dosage Form Test (Ingredient C 5% in Cream vs Gel vs Lotion)
-- ----------------------------------------------------------------------------
(
    19,
    'DermaCare',
    'DermaCare Soothing Cream',
    '{"ingredients": [{"name": "Ingredient C", "strength": "5%"}]}'::jsonb,
    '5%',
    'Cream',
    'Topical',
    'DermaCare Healthcare',
    '20 g',
    130.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    20,
    'DermaCare',
    'DermaCare Soothing Gel',
    '{"ingredients": [{"name": "Ingredient C", "strength": "5%"}]}'::jsonb,
    '5%',
    'Gel',
    'Topical',
    'DermaCare Healthcare',
    '20 g',
    135.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    21,
    'DermaCare',
    'DermaCare Soothing Lotion',
    '{"ingredients": [{"name": "Ingredient C", "strength": "5%"}]}'::jsonb,
    '5%',
    'Lotion',
    'Topical',
    'DermaCare Healthcare',
    '50 ml',
    160.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 6: Different Ingredient Test (10% Cream with Ingredient D vs Ingredient E)
-- ----------------------------------------------------------------------------
(
    22,
    'ClearSkin',
    'ClearSkin Purifying Cream',
    '{"ingredients": [{"name": "Ingredient D", "strength": "10%"}]}'::jsonb,
    '10%',
    'Cream',
    'Topical',
    'ClearSkin Biocare',
    '30 g',
    250.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    23,
    'SkinRelief',
    'SkinRelief Soothing Cream',
    '{"ingredients": [{"name": "Ingredient E", "strength": "10%"}]}'::jsonb,
    '10%',
    'Cream',
    'Topical',
    'SkinRelief Formulations',
    '30 g',
    240.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 7: Combination Products - Exact Match vs Strength / Ingr Mismatch
-- ----------------------------------------------------------------------------
(
    24,
    'DemoDerm',
    'DemoDerm Dual Action Tablet',
    '{"ingredients": [{"name": "Ingredient X", "strength": "10 mg"}, {"name": "Ingredient Y", "strength": "5 mg"}]}'::jsonb,
    '10 mg + 5 mg',
    'Tablet',
    'Oral',
    'Demo Pharma Ltd',
    '10 tablets',
    120.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    25,
    'DermaCare',
    'DermaCare Combo Tablet',
    '{"ingredients": [{"name": "Ingredient X", "strength": "10 mg"}, {"name": "Ingredient Y", "strength": "5 mg"}]}'::jsonb,
    '10 mg + 5 mg',
    'Tablet',
    'Oral',
    'DermaCare Healthcare',
    '10 tablets',
    95.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    26,
    'ClearSkin',
    'ClearSkin Duo Tablet',
    '{"ingredients": [{"name": "Ingredient Y", "strength": "5 mg"}, {"name": "Ingredient X", "strength": "10 mg"}]}'::jsonb,
    '5 mg + 10 mg',
    'Tablet',
    'Oral',
    'ClearSkin Biocare',
    '10 tablets',
    110.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    27,
    'DermAssist',
    'DermAssist Combo Forte Tablet',
    '{"ingredients": [{"name": "Ingredient X", "strength": "10 mg"}, {"name": "Ingredient Y", "strength": "10 mg"}]}'::jsonb,
    '10 mg + 10 mg',
    'Tablet',
    'Oral',
    'DermAssist Therapeutics',
    '10 tablets',
    140.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    28,
    'PureDerma',
    'PureDerma Solo Tablet',
    '{"ingredients": [{"name": "Ingredient X", "strength": "10 mg"}]}'::jsonb,
    '10 mg',
    'Tablet',
    'Oral',
    'PureDerma Wellness',
    '10 tablets',
    70.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 8: Exact Match Group - Antifungal Cream (Clotrimazole Synthetic 1%)
-- ----------------------------------------------------------------------------
(
    29,
    'DermaCare',
    'DermaCare Myco Cream',
    '{"ingredients": [{"name": "Clotrimazole Synthetic", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'DermaCare Healthcare',
    '20 g',
    85.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    30,
    'SkinRelief',
    'SkinRelief Antifungal Cream',
    '{"ingredients": [{"name": "Clotrimazole Synthetic", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'SkinRelief Formulations',
    '20 g',
    72.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    31,
    'ClearSkin',
    'ClearSkin Myco Care Cream',
    '{"ingredients": [{"name": "Clotrimazole Synthetic", "strength": "1%"}]}'::jsonb,
    '1%',
    'Cream',
    'Topical',
    'ClearSkin Biocare',
    '20 g',
    78.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 9: Exact Match Group - BHA Exfoliating Cleanser (Salicylic Synthetic 2%)
-- ----------------------------------------------------------------------------
(
    32,
    'AcneShield',
    'AcneShield Pore Cleanser',
    '{"ingredients": [{"name": "Salicylic Synthetic", "strength": "2%"}]}'::jsonb,
    '2%',
    'Face Wash',
    'Topical',
    'Shield Derma Labs',
    '100 ml',
    240.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    33,
    'ClearSkin',
    'ClearSkin BHA Wash',
    '{"ingredients": [{"name": "Salicylic Synthetic", "strength": "2%"}]}'::jsonb,
    '2%',
    'Face Wash',
    'Topical',
    'ClearSkin Biocare',
    '100 ml',
    210.00,
    'INR',
    'Synthetic Catalog',
    true
),
(
    34,
    'SkinCare Plus',
    'SkinCare Plus BHA Foam',
    '{"ingredients": [{"name": "Salicylic Synthetic", "strength": "2%"}]}'::jsonb,
    '2%',
    'Face Wash',
    'Topical',
    'SkinCare Laboratories',
    '100 ml',
    225.00,
    'INR',
    'Synthetic Catalog',
    true
),

-- ----------------------------------------------------------------------------
-- GROUP 10: Standalone Unique Product (No Exact Match in Catalog)
-- ----------------------------------------------------------------------------
(
    35,
    'DermAssist',
    'DermAssist Unique Bio Serum',
    '{"ingredients": [{"name": "Synthetic Peptides Bio", "strength": "2.5%"}]}'::jsonb,
    '2.5%',
    'Serum',
    'Topical',
    'DermAssist Therapeutics',
    '30 ml',
    550.00,
    'INR',
    'Synthetic Catalog',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Reset serial sequence to max id
SELECT setval(pg_get_serial_sequence('medicines', 'id'), COALESCE(MAX(id), 1)) FROM medicines;
