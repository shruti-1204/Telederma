-- ============================================================================
-- TeleDerma: Medicine Alternative Finder Database Schema
-- Table: medicines
-- ============================================================================

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

-- Performance & search indexes
CREATE INDEX IF NOT EXISTS idx_medicines_brand_name ON medicines (LOWER(brand_name));
CREATE INDEX IF NOT EXISTS idx_medicines_product_name ON medicines (LOWER(product_name));
CREATE INDEX IF NOT EXISTS idx_medicines_dosage_form ON medicines (LOWER(dosage_form));
CREATE INDEX IF NOT EXISTS idx_medicines_route ON medicines (LOWER(route));
CREATE INDEX IF NOT EXISTS idx_medicines_price ON medicines (price);
CREATE INDEX IF NOT EXISTS idx_medicines_active_ingredients_gin ON medicines USING gin (active_ingredients);
