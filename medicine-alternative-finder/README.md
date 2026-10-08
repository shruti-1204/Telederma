# TeleDerma – Medicine Alternative Finder Module

> **Single Feature Module for the TeleDerma Telemedicine Platform**  
> Deterministic database search and auditable active composition matching for dermatology medications.  
> **No LLM &bull; No Generative Hallucinations &bull; Zero Vector Databases &bull; Rule-Based Source of Truth**

---

## 1. Purpose

TeleDerma is a comprehensive teledermatology platform featuring patient consultations, doctor portals, appointments, WebRTC video calling, prescriptions, and AI symptom assessment.

This standalone module is dedicated **exclusively** to the **Medicine Alternative Finder** feature:
- Searching medicines by brand, product name, or active ingredients.
- Inspecting detailed medicine composition, dosage form, and packaging.
- Finding identical **"EXACT COMPOSITION MATCH"** alternative products from the catalog.
- Sorting alternatives by lowest listed price so patients and doctors can discover cost-effective therapeutic equivalents.

### Why No LLM for this MVP?
Medication composition matching must be **deterministic, auditable, and 100% predictable**. An AI language model could hallucinate non-existent dosages, invent drug brands, or confuse chemical salt forms. Instead, this module uses a normalized relational database engine where:
1. Active ingredients and concentrations are normalized without chemical guessing.
2. The database is the unambiguous source of truth.
3. Every match is fully explainable according to explicit clinical matching rules.

---

## 2. Architecture & Technology

```
medicine-alternative-finder/
├── src/
│   ├── server.js                        # Express server entry point & middleware
│   ├── routes/
│   │   └── medicineRoutes.js            # REST API route handlers
│   ├── controllers/
│   │   └── medicineController.js        # Controller layer with input validation
│   ├── services/
│   │   ├── medicineSearchService.js     # Search and data retrieval service
│   │   └── alternativeMatcher.js        # Deterministic composition matching engine
│   ├── db/
│   │   ├── database.js                  # PostgreSQL pool client with memory fallback
│   │   └── seedData.js                  # Synthetic demo dataset (35 records)
│   └── utils/
│       └── normalize.js                 # Case, whitespace, and strength normalization
├── database/
│   ├── schema.sql                       # PostgreSQL DDL table & index definitions
│   └── seed.sql                         # SQL seed script with 35 synthetic records
├── scripts/
│   └── initDb.js                        # PostgreSQL schema & seed initialization runner
├── tests/
│   ├── alternativeMatcher.test.js       # Core matcher & normalization test suite (Tests 1-10)
│   └── api.test.js                      # REST API integration & error tests
├── docs/
│   └── INTEGRATION.md                   # Complete guide for TeleDerma backend team
├── public/
│   └── index.html                       # Standalone single-screen demo UI
├── .env.example                         # Environment configuration template
├── .gitignore                           # Git ignore rules
├── package.json                         # Node.js project manifest & scripts
└── README.md                            # Documentation
```

### Technology Stack
- **Runtime**: Node.js (v18+)
- **Web Framework**: Express.js (v4)
- **Database**: PostgreSQL (via `pg` Pool with parameterized queries)
- **Language**: JavaScript (ES6+ CommonJS)
- **Testing**: Built-in `node:test` runner (fast, zero external test dependencies)

---

## 3. Database Schema

The module uses the `medicines` table in PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    active_ingredients JSONB NOT NULL,
    strength VARCHAR(100) NOT NULL,
    dosage_form VARCHAR(100) NOT NULL,
    route VARCHAR(100) NOT NULL DEFAULT 'Topical',
    manufacturer VARCHAR(255) NOT NULL,
    pack_size VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    source VARCHAR(100) NOT NULL DEFAULT 'Synthetic Catalog',
    is_demo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medicines_brand_name ON medicines (LOWER(brand_name));
CREATE INDEX IF NOT EXISTS idx_medicines_product_name ON medicines (LOWER(product_name));
CREATE INDEX IF NOT EXISTS idx_medicines_dosage_form ON medicines (LOWER(dosage_form));
CREATE INDEX IF NOT EXISTS idx_medicines_route ON medicines (LOWER(route));
CREATE INDEX IF NOT EXISTS idx_medicines_price ON medicines (price);
CREATE INDEX IF NOT EXISTS idx_medicines_active_ingredients_gin ON medicines USING gin (active_ingredients);
```

### Active Ingredients JSONB Format
```json
{
  "ingredients": [
    { "name": "Ingredient A", "strength": "5%" }
  ]
}
```

For combination medications:
```json
{
  "ingredients": [
    { "name": "Ingredient X", "strength": "10 mg" },
    { "name": "Ingredient Y", "strength": "5 mg" }
  ]
}
```

---

## 4. Matching Rules

An alternative is designated as an **`EXACT_COMPOSITION`** match **ONLY** when all of the following rules are satisfied:

1. **Rule 1 (Active Ingredients Match)**: The set of active ingredients must match exactly. Ingredient names are normalized (lowercase, trim, whitespace collapse) without chemical speculation.
2. **Rule 2 (Strengths Match)**: All active ingredient strengths must match exactly (e.g. `5%` matches `5%`; `10 mg` matches `10 mg`).
3. **Rule 3 (Dosage Form Match)**: The dosage form must match exactly (`Face Wash` matches `Face Wash`; `Cream` does **NOT** match `Gel` or `Lotion`).
4. **Rule 4 (Route Match)**: The administration route must match when both records specify a route (`Topical` matches `Topical`; `Topical` does **NOT** match `Oral`).
5. **Rule 5 (Target Exclusion)**: The target product selected by the user is **strictly excluded** from its own alternatives list.
6. **Rule 6 (No Superficial Matching)**: Products are **never** matched based on disease indication, brand similarity, manufacturer, or product name similarity.
7. **Rule 7 (Strength Inequality Rejection)**: `Ingredient B (1%)` and `Ingredient B (2%)` will **NEVER** match.
8. **Rule 8 (Form Inequality Rejection)**: `Cream` and `Gel` will **NEVER** match even if active ingredient and strength are identical.
9. **Rule 9 (Combination Completeness)**: For multi-ingredient products, **all** ingredients and their respective strengths must match. Missing or extra ingredients invalidate the match. Order of ingredients in JSON does not affect matching.
10. **Rule 10 (Pack Size Preservation)**: Products with identical composition but different pack sizes (e.g. 50 ml vs 100 ml vs 200 ml) match compositionally, and pack sizes are clearly displayed.
11. **Rule 11 (Price Ordering)**: Alternatives are sorted ascending by listed price (`price ASC`). Unpriced items (`price: null`) are placed at the bottom.

---

## 5. Dataset Information

> [!IMPORTANT]
> **Synthetic Dataset Notice:**
> The included medicine records are synthetic/demo records for development and testing and are not a verified commercial medicine catalog. All records are explicitly flagged with `is_demo = true`.

The dataset contains 35 synthetic medicine records covering key dermatological dosage forms (Face Wash, Gel, Cream, Lotion, Solution, Tablet) and deliberate edge-case test groups:
- **Group 1**: Exact Match Group – Face Wash (`Ingredient A 5%`)
- **Group 1-B**: Different Pack Sizes of Group 1 (50 ml, 100 ml, 200 ml)
- **Group 2**: Exact Match Group – Topical Gel (`Adapalene Synthetic 0.1%`)
- **Group 3**: Exact Match Group – Barrier Cream (`Ceramide Complex Alpha 1%`)
- **Group 4**: Non-Matching Strengths (`Ingredient B Cream` at 1%, 2%, 5%)
- **Group 5**: Non-Matching Dosage Forms (`Ingredient C 5%` in Cream vs Gel vs Lotion)
- **Group 6**: Different Ingredients (`10% Cream` with Ingredient D vs Ingredient E)
- **Group 7**: Combination Tablets (`Ingredient X 10 mg + Ingredient Y 5 mg` match vs `10 mg + 10 mg` mismatch)
- **Group 8**: Antifungal Cream (`Clotrimazole Synthetic 1%`)
- **Group 9**: BHA Cleansers (`Salicylic Synthetic 2%`)
- **Group 10**: Standalone Unique Product (No match in catalog; returns empty alternatives)
- **Group 11**: Unpriced Record (Tests null price positioning at the bottom)

---

## 6. API Endpoints

### 1. `GET /api/medicines/search?q=:query`
Search medicines across brand names, product names, and active ingredients.
- **Query Parameter**: `q` (string, required)
- **Response**:
```json
{
  "success": true,
  "query": "derma",
  "count": 1,
  "results": [
    {
      "id": 1,
      "brandName": "DemoDerm",
      "productName": "DemoDerm Face Wash",
      "dosageForm": "Face Wash",
      "strength": "5%",
      "packSize": "100 ml",
      "price": 180,
      "currency": "INR"
    }
  ]
}
```

### 2. `GET /api/medicines/:id`
Retrieve full product details by numeric ID.
- **Response**:
```json
{
  "success": true,
  "medicine": {
    "id": 1,
    "brandName": "DemoDerm",
    "productName": "DemoDerm Face Wash",
    "activeIngredients": [
      { "name": "Ingredient A", "strength": "5%" }
    ],
    "strength": "5%",
    "dosageForm": "Face Wash",
    "route": "Topical",
    "manufacturer": "Demo Pharma Ltd",
    "packSize": "100 ml",
    "price": 180,
    "currency": "INR",
    "source": "Synthetic Catalog",
    "isDemo": true,
    "disclaimer": "Alternatives are shown based on matching active ingredient(s), strength and dosage form. Consult your dermatologist before changing a prescribed product."
  }
}
```

### 3. `GET /api/medicines/:id/alternatives`
Retrieve exact composition alternatives sorted by lowest listed price.
- **Response**:
```json
{
  "success": true,
  "targetMedicine": {
    "id": 1,
    "brandName": "DemoDerm",
    "productName": "DemoDerm Face Wash"
  },
  "matchingCriteria": {
    "activeIngredients": true,
    "strength": true,
    "dosageForm": true,
    "route": true
  },
  "count": 4,
  "alternatives": [
    {
      "id": 6,
      "brandName": "SkinCare Plus",
      "productName": "SkinCare Plus Travel Wash",
      "activeIngredients": [
        { "name": "Ingredient A", "strength": "5%" }
      ],
      "strength": "5%",
      "dosageForm": "Face Wash",
      "route": "Topical",
      "manufacturer": "SkinCare Laboratories",
      "packSize": "50 ml",
      "price": 85,
      "currency": "INR",
      "source": "Synthetic Catalog",
      "isDemo": true,
      "matchType": "EXACT_COMPOSITION"
    },
    {
      "id": 2,
      "brandName": "SkinCare Plus",
      "productName": "SkinCare Plus Face Wash",
      "activeIngredients": [
        { "name": "Ingredient A", "strength": "5%" }
      ],
      "strength": "5%",
      "dosageForm": "Face Wash",
      "route": "Topical",
      "manufacturer": "SkinCare Laboratories",
      "packSize": "100 ml",
      "price": 150,
      "currency": "INR",
      "source": "Synthetic Catalog",
      "isDemo": true,
      "matchType": "EXACT_COMPOSITION"
    }
  ],
  "disclaimer": "Alternatives are shown based on matching active ingredient(s), strength and dosage form. Consult your dermatologist before changing a prescribed product."
}
```

---

## 7. How to Run Locally

### Prerequisites
- Node.js v18 or higher
- Optional: PostgreSQL (v12+)

### Step 1: Install Dependencies
```bash
cd medicine-alternative-finder
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(If no PostgreSQL URL is set, the server automatically boots in embedded synthetic demo mode so you can test immediately without setting up a local database).*

### Step 3: Run Database Setup (When Using PostgreSQL)
If you have PostgreSQL running:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/telederma_db
```
Initialize the schema and seed records:
```bash
npm run db:init
```

### Step 4: Start the Server
```bash
npm start
```
The server will start on `http://localhost:5000`.

### Step 5: Test the Interactive Demo UI
Open your browser and navigate to:
```
http://localhost:5000
```
Search for **"DemoDerm"**, click **DemoDerm Face Wash**, and see immediate exact composition matches with pricing comparison.

---

## 8. Running Automated Tests

Run the test suite using Node's test runner:
```bash
npm test
```

### Test Suite Coverage:
- **TEST 1**: Same ingredient + same strength + same form &rarr; **MATCH**
- **TEST 2**: Same ingredient + different strength &rarr; **NO MATCH**
- **TEST 3**: Different ingredient + same strength + same form &rarr; **NO MATCH**
- **TEST 4**: Same ingredient + same strength + different form &rarr; **NO MATCH**
- **TEST 5**: Combination product with same ingredients and strengths (order-independent) &rarr; **MATCH**
- **TEST 6**: Combination product with one different strength &rarr; **NO MATCH**
- **TEST 7**: Selected medicine excluded from its own alternatives &rarr; **VERIFIED**
- **TEST 8**: Different pack size but same composition &rarr; **MATCH**
- **TEST 9**: Product with no catalog match &rarr; **EMPTY ARRAY**
- **TEST 10**: Case-insensitive search and normalization &rarr; **VERIFIED**
- **Price Sorting**: Ascending price ordering and null-price bottom ranking &rarr; **VERIFIED**
- **API Tests**: Express HTTP endpoints, 400 validations, and 404 handlers &rarr; **VERIFIED**

---

## 9. Integration Instructions for Main TeleDerma Backend

Refer to [docs/INTEGRATION.md](docs/INTEGRATION.md) for full instructions.

In brief:
1. Copy the table DDL from `database/schema.sql` into the main TeleDerma migrations.
2. Move the service files into the main backend under `backend/medicines/`:
   - `medicineRoutes.js`
   - `medicineController.js`
   - `medicineSearchService.js`
   - `alternativeMatcher.js`
   - `normalize.js`
3. Mount the router in the main `backend/app.js`:
   ```javascript
   const medicineRoutes = require('./medicines/medicineRoutes');
   app.use('/api/medicines', medicineRoutes);
   ```

---

## 10. Medical Safety Notice

> [!CAUTION]
> This module is **strictly an information lookup and matching utility**. It is **not** a diagnosis system, dosage calculator, or clinical prescription replacement engine.

- Do **not** use to diagnose diseases or recommend medical treatments.
- Do **not** automatically switch prescribed medications without medical review.
- Differences in inactive excipients, preservatives, vehicle textures (e.g., ointment base vs cream base), and drug delivery systems may impact patient tolerance.
- Every API response and UI screen must display the mandatory medical disclaimer:
  > *"Alternatives are shown based on matching active ingredient(s), strength and dosage form. Consult your dermatologist before changing a prescribed product."*
