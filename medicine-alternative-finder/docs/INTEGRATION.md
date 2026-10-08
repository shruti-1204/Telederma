# TeleDerma – Medicine Alternative Finder Integration Guide

This guide is written specifically for the **TeleDerma Main Backend and Frontend developers** to integrate the Medicine Alternative Finder module into the central TeleDerma repository and infrastructure.

---

## 1. Overview & Architecture

The **Medicine Alternative Finder** is a deterministic, rule-based micro-module designed to find therapeutic alternatives with identical active chemical composition at potentially lower listed prices.

- **No Machine Learning or LLM**: The engine uses auditable database search and exact composition normalization. No generative hallucinations or invented dosages can occur.
- **Source of Truth**: The PostgreSQL `medicines` table.
- **Primary Matching Criteria**:
  1. Active ingredient set (exact name match, order-independent)
  2. Ingredient strength / concentration (exact match)
  3. Dosage form (exact match: Cream ≠ Gel ≠ Lotion)
  4. Administration route (Topical vs Oral)
  5. Selected product itself is excluded
  6. Sorted by lowest listed price first

---

## 2. Required Database Schema & Columns

The module operates on the `medicines` table in PostgreSQL.

### Table: `medicines`

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | No | Unique identifier |
| `brand_name` | `VARCHAR(255)` | No | Commercial brand name (e.g. `DemoDerm`) |
| `product_name` | `VARCHAR(255)` | No | Full product title |
| `active_ingredients` | `JSONB` | No | Structured array of `{ name, strength }` |
| `strength` | `VARCHAR(100)` | No | Summary concentration (e.g. `5%` or `10 mg + 5 mg`) |
| `dosage_form` | `VARCHAR(100)` | No | Dosage form (e.g. `Face Wash`, `Gel`, `Cream`, `Tablet`) |
| `route` | `VARCHAR(100)` | No | Route of administration (default `'Topical'`) |
| `manufacturer` | `VARCHAR(255)` | No | Pharmaceutical manufacturer |
| `pack_size` | `VARCHAR(100)` | No | Packaging unit (e.g. `100 ml`, `15 g`, `10 tablets`) |
| `price` | `NUMERIC(10, 2)` | Yes | Listed price (in INR or base currency). Null if unpriced |
| `currency` | `VARCHAR(10)` | No | Currency code (default `'INR'`) |
| `source` | `VARCHAR(100)` | No | Origin of record (e.g. `'Synthetic Catalog'`) |
| `is_demo` | `BOOLEAN` | No | Flag indicating synthetic/test record (`true` for prototype) |
| `created_at` | `TIMESTAMPTZ` | No | Timestamp of creation |
| `updated_at` | `TIMESTAMPTZ` | No | Timestamp of last modification |

### Schema SQL Definition

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

-- Performance & GIN Indexes
CREATE INDEX IF NOT EXISTS idx_medicines_brand_name ON medicines (LOWER(brand_name));
CREATE INDEX IF NOT EXISTS idx_medicines_product_name ON medicines (LOWER(product_name));
CREATE INDEX IF NOT EXISTS idx_medicines_dosage_form ON medicines (LOWER(dosage_form));
CREATE INDEX IF NOT EXISTS idx_medicines_route ON medicines (LOWER(route));
CREATE INDEX IF NOT EXISTS idx_medicines_price ON medicines (price);
CREATE INDEX IF NOT EXISTS idx_medicines_active_ingredients_gin ON medicines USING gin (active_ingredients);
```

### JSONB Structure for `active_ingredients`

Single Active Ingredient:
```json
{
  "ingredients": [
    {
      "name": "Ingredient A",
      "strength": "5%"
    }
  ]
}
```

Combination Product:
```json
{
  "ingredients": [
    {
      "name": "Ingredient X",
      "strength": "10 mg"
    },
    {
      "name": "Ingredient Y",
      "strength": "5 mg"
    }
  ]
}
```

---

## 3. Environment Variables

Add the following to your main backend `.env`:

```env
# Database connection string (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/telederma_db

# Port for standalone server (default: 5000)
PORT=5000
```

---

## 4. API Endpoints Reference

### 1. Search Medicines
- **Route**: `GET /api/medicines/search?q=:query`
- **Description**: Case-insensitive substring search over `brand_name`, `product_name`, and active ingredient names.
- **Query Params**:
  - `q` *(string, required)*: Search term (minimum 1 character).
- **Example Call**:
  ```bash
  curl "http://localhost:5000/api/medicines/search?q=DemoDerm"
  ```
- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "query": "DemoDerm",
    "count": 4,
    "results": [
      {
        "id": 16,
        "brandName": "DemoDerm",
        "productName": "DemoDerm Cream 1%",
        "dosageForm": "Cream",
        "strength": "1%",
        "packSize": "30 g",
        "price": 140,
        "currency": "INR"
      },
      {
        "id": 24,
        "brandName": "DemoDerm",
        "productName": "DemoDerm Dual Action Tablet",
        "dosageForm": "Tablet",
        "strength": "10 mg + 5 mg",
        "packSize": "10 tablets",
        "price": 120,
        "currency": "INR"
      },
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

---

### 2. Get Medicine Details
- **Route**: `GET /api/medicines/:id`
- **Description**: Retrieves full product record and safety disclaimer.
- **Example Call**:
  ```bash
  curl "http://localhost:5000/api/medicines/1"
  ```
- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "medicine": {
      "id": 1,
      "brandName": "DemoDerm",
      "productName": "DemoDerm Face Wash",
      "activeIngredients": [
        {
          "name": "Ingredient A",
          "strength": "5%"
        }
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

---

### 3. Get Alternatives
- **Route**: `GET /api/medicines/:id/alternatives`
- **Description**: Finds all exact composition matches, excludes the selected medicine, and returns results sorted by lowest listed price.
- **Example Call**:
  ```bash
  curl "http://localhost:5000/api/medicines/1/alternatives"
  ```
- **Example Response (200 OK)**:
  ```json
  {
    "success": true,
    "targetMedicine": {
      "id": 1,
      "brandName": "DemoDerm",
      "productName": "DemoDerm Face Wash",
      "activeIngredients": [
        {
          "name": "Ingredient A",
          "strength": "5%"
        }
      ],
      "strength": "5%",
      "dosageForm": "Face Wash",
      "route": "Topical",
      "manufacturer": "Demo Pharma Ltd",
      "packSize": "100 ml",
      "price": 180,
      "currency": "INR"
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
          {
            "name": "Ingredient A",
            "strength": "5%"
          }
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
          {
            "name": "Ingredient A",
            "strength": "5%"
          }
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
      },
      {
        "id": 3,
        "brandName": "DermaCare",
        "productName": "DermaCare Face Wash",
        "activeIngredients": [
          {
            "name": "Ingredient A",
            "strength": "5%"
          }
        ],
        "strength": "5%",
        "dosageForm": "Face Wash",
        "route": "Topical",
        "manufacturer": "DermaCare Healthcare",
        "packSize": "100 ml",
        "price": 165,
        "currency": "INR",
        "source": "Synthetic Catalog",
        "isDemo": true,
        "matchType": "EXACT_COMPOSITION"
      },
      {
        "id": 4,
        "brandName": "PureDerma",
        "productName": "PureDerma Gentle Wash",
        "activeIngredients": [
          {
            "name": "Ingredient A",
            "strength": "5%"
          }
        ],
        "strength": "5%",
        "dosageForm": "Face Wash",
        "route": "Topical",
        "manufacturer": "PureDerma Wellness",
        "packSize": "100 ml",
        "price": 195,
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

## 5. Frontend Integration Example (React / Vue / Flutter)

Here is a minimal TypeScript / JavaScript snippet showing how the Patient or Doctor app can call the service:

```javascript
// Example: fetchMedicineAlternatives.js
const API_BASE = 'http://localhost:5000/api/medicines';

export async function searchMedicines(query) {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.results;
}

export async function getAlternativesForMedicine(medicineId) {
  const res = await fetch(`${API_BASE}/${medicineId}/alternatives`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);

  return {
    target: data.targetMedicine,
    alternatives: data.alternatives,
    disclaimer: data.disclaimer
  };
}
```

UI Card Recommendation:
```jsx
function AlternativeCard({ targetPrice, alternative }) {
  const savings = targetPrice && alternative.price ? targetPrice - alternative.price : 0;

  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-semibold">
        {alternative.matchType === 'EXACT_COMPOSITION' ? 'Exact Composition Match' : 'Alternative'}
      </span>
      <h4 className="font-bold text-lg mt-2">{alternative.productName}</h4>
      <p className="text-sm text-gray-600">{alternative.dosageForm} &bull; {alternative.strength}</p>
      <p className="text-xs text-gray-500">Pack: {alternative.packSize} | Mfg: {alternative.manufacturer}</p>
      <div className="mt-3 flex justify-between items-baseline">
        <span className="text-xl font-bold">₹{alternative.price ?? 'N/A'}</span>
        {savings > 0 && (
          <span className="text-green-600 font-semibold text-sm">Save ₹{savings.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
```

---

## 6. Migration Path: Moving into the Main TeleDerma Backend

When ready to merge this standalone feature module directly into the main `backend/` folder of the TeleDerma monorepo, follow this simple file mapping:

```
telederma/
├── backend/
│   ├── src/ (or controllers, routes, etc.)
│   │   ├── medicines/
│   │   │   ├── medicineRoutes.js      <-- Copy from medicine-alternative-finder/src/routes/medicineRoutes.js
│   │   │   ├── medicineController.js  <-- Copy from medicine-alternative-finder/src/controllers/medicineController.js
│   │   │   ├── medicineSearchService.js<-- Copy from medicine-alternative-finder/src/services/medicineSearchService.js
│   │   │   ├── alternativeMatcher.js  <-- Copy from medicine-alternative-finder/src/services/alternativeMatcher.js
│   │   │   └── normalize.js           <-- Copy from medicine-alternative-finder/src/utils/normalize.js
│   │   └── app.js                     <-- Mount: app.use('/api/medicines', medicineRoutes);
```

### Steps to Merge:
1. Copy `database/schema.sql` into the main backend migrations directory.
2. Run migrations against your central PostgreSQL database.
3. Import `medicineRoutes` into `backend/app.js`:
   ```javascript
   const medicineRoutes = require('./medicines/medicineRoutes');
   app.use('/api/medicines', medicineRoutes);
   ```
4. Point `database.js` to reuse the existing central database pool/connection if one already exists in `backend/db/`.
5. Run the existing test suite:
   ```bash
   node --test tests/*.test.js
   ```

---

## 7. Important Medical Safety Limitations

- **Not a Diagnostic or Prescriptive Tool**: The Medicine Alternative Finder only identifies products sharing identical database-recorded active ingredients, strengths, and dosage forms.
- **Dermatologist Consultation Required**: Formulations may differ in inactive excipients, preservatives, vehicle textures, or delivery systems. Patients must never alter an active prescription without consulting their treating dermatologist.
- **Mandatory UI Disclaimer**: The following disclaimer must remain visible on any screen showing alternatives:
  > *"Alternatives are shown based on matching active ingredient(s), strength and dosage form. Consult your dermatologist before changing a prescribed product."*
