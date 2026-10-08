/**
 * TeleDerma Medicine Alternative Finder
 * Database Connection & Adapter
 *
 * Connects to PostgreSQL using 'pg' pool with parameterized queries.
 * Provides automatic fallback to embedded synthetic seed dataset
 * if PostgreSQL is not yet configured or currently unavailable.
 */

require('dotenv').config();
const { Pool } = require('pg');
const { SEED_MEDICINES } = require('./seedData');

let pool = null;
let useMemoryFallback = false;

// Initialize PostgreSQL pool if DATABASE_URL or PGHOST is configured
if (process.env.DB_MODE !== 'memory' && (process.env.DATABASE_URL || process.env.PGHOST || process.env.PGDATABASE)) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Fallback connection configs if DATABASE_URL is not set directly
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000
    });

    pool.on('error', (err) => {
      console.warn('[Database] PostgreSQL pool background error:', err.message);
    });
  } catch (err) {
    console.warn('[Database] Failed to initialize PostgreSQL pool:', err.message);
    useMemoryFallback = true;
  }
} else {
  useMemoryFallback = true;
  console.log('[Database] No PostgreSQL connection string provided. Using embedded synthetic dataset (35 records).');
}

/**
 * Executes a parameterized SQL query against PostgreSQL,
 * falling back to memory store if PostgreSQL is unreachable.
 *
 * @param {string} text - SQL query string with $1, $2 placeholders
 * @param {Array<any>} params - Query parameters
 * @returns {Promise<{rows: Array<object>, rowCount: number}>}
 */
async function query(text, params = []) {
  if (pool && !useMemoryFallback) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (err) {
      // If PostgreSQL connection fails, fallback to memory store
      console.warn(`[Database] PostgreSQL query error (${err.message}). Using fallback dataset.`);
      return executeMemoryQuery(text, params);
    }
  }

  return executeMemoryQuery(text, params);
}

/**
 * In-memory SQL execution fallback for testing and development
 * when PostgreSQL server is not locally running.
 */
function executeMemoryQuery(text, params = []) {
  const normalizedQuery = text.trim().toUpperCase();

  // 1. Candidates for alternatives: WHERE id != $1
  if (normalizedQuery.includes('ID != $1')) {
    const targetId = parseInt(params[0], 10);
    const dosageForm = (String(params[1] || '')).trim().toLowerCase();

    const candidates = SEED_MEDICINES.filter((m) => {
      if (m.id === targetId) return false;
      if (dosageForm && m.dosage_form.toLowerCase() !== dosageForm) return false;
      return true;
    });

    return { rows: candidates, rowCount: candidates.length };
  }

  // 2. SELECT by ID: WHERE id = $1
  if (normalizedQuery.includes('WHERE ID = $1')) {
    const targetId = parseInt(params[0], 10);
    const found = SEED_MEDICINES.filter((m) => m.id === targetId);
    return { rows: found, rowCount: found.length };
  }

  // 3. Search query: LIKE $1 or ILIKE $1
  if (normalizedQuery.includes('LIKE $1') || normalizedQuery.includes('ILIKE $1')) {
    const rawTerm = String(params[0] || '').replace(/%/g, '').trim().toLowerCase();

    if (!rawTerm) {
      return { rows: [], rowCount: 0 };
    }

    const matches = SEED_MEDICINES.filter((m) => {
      const brandMatch = m.brand_name.toLowerCase().includes(rawTerm);
      const productMatch = m.product_name.toLowerCase().includes(rawTerm);
      const ingredients = m.active_ingredients?.ingredients || [];
      const ingredientMatch = ingredients.some((ing) =>
        ing.name.toLowerCase().includes(rawTerm)
      );
      return brandMatch || productMatch || ingredientMatch;
    });

    return { rows: matches, rowCount: matches.length };
  }

  // 4. Default: Return all seed medicines
  return { rows: [...SEED_MEDICINES], rowCount: SEED_MEDICINES.length };
}

/**
 * Healthcheck helper to verify database connection status.
 */
async function checkHealth() {
  if (pool && !useMemoryFallback) {
    try {
      const res = await pool.query('SELECT 1 as alive');
      return { connected: true, driver: 'PostgreSQL', alive: res.rows[0].alive === 1 };
    } catch (err) {
      return { connected: false, driver: 'Memory Fallback', error: err.message };
    }
  }
  return { connected: true, driver: 'Memory Fallback (Seed Catalog)' };
}

module.exports = {
  query,
  pool,
  checkHealth,
  executeMemoryQuery
};
