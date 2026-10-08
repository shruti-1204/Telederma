import api from './api';
import { mockMedicineCatalog } from './mockData';

/**
 * TeleDerma Medicine Alternative Finder Client Service
 * Connects the mobile / web patient app to the Medicine Alternative Finder backend APIs.
 * Supports:
 * - Suggested active ingredient molecules (/medicines/molecules)
 * - Flexible multi-token search (/medicines/search?q=...)
 * - Alternative composition matching & savings (/medicines/:id/alternatives)
 * - Single molecule lookup (/medicines/:id)
 * - Resilient offline/timeout fallback to local catalog
 */
export const medicineService = {
  /**
   * Fetch all suggested molecules from backend /medicines/molecules
   * Falls back to mockMedicineCatalog if offline or network error
   */
  getMolecules: async () => {
    try {
      const response = await api.get('/medicines/molecules');
      if (
        response.data?.success &&
        Array.isArray(response.data?.data) &&
        response.data.data.length > 0
      ) {
        return response.data.data;
      }
    } catch (err) {
      console.warn(
        '[medicineService] getMolecules backend error, using fallback:',
        err.message
      );
    }
    return mockMedicineCatalog;
  },

  /**
   * Search medicines dynamically by query (active ingredient, brand, category, indication)
   * Calls /medicines/search?q=... with graceful fallback
   */
  searchMedicines: async (query = '') => {
    const trimmed = (query || '').trim();
    try {
      const response = await api.get('/medicines/search', {
        params: { q: trimmed },
      });
      if (response.data?.success && Array.isArray(response.data?.data)) {
        return response.data.data;
      }
    } catch (err) {
      console.warn(
        '[medicineService] searchMedicines backend error, using client fallback:',
        err.message
      );
    }

    // Client-side fallback matching
    if (!trimmed) return mockMedicineCatalog;
    const qLower = trimmed.toLowerCase();
    const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const cleanedQuery = cleanStr(trimmed);
    const tokens = cleanedQuery.split(/\s+/).filter(Boolean);

    return mockMedicineCatalog.filter((med) => {
      const active = (med.activeIngredient || '').toLowerCase();
      const cleanedActive = cleanStr(med.activeIngredient);
      const cat = (med.category || '').toLowerCase();
      const ind = (med.indication || '').toLowerCase();
      const desc = (med.description || '').toLowerCase();

      if (
        active.includes(qLower) ||
        cleanedActive.includes(cleanedQuery) ||
        cat.includes(qLower) ||
        ind.includes(qLower) ||
        desc.includes(qLower)
      ) {
        return true;
      }

      if (
        med.brands &&
        med.brands.some((b) => {
          const bName = (b.name || '').toLowerCase();
          const bForm = (b.form || '').toLowerCase();
          const bMfg = (b.manufacturer || '').toLowerCase();
          return bName.includes(qLower) || bForm.includes(qLower) || bMfg.includes(qLower);
        })
      ) {
        return true;
      }

      if (tokens.length > 1) {
        return tokens.every(
          (t) =>
            cleanedActive.includes(t) ||
            cat.includes(t) ||
            ind.includes(t) ||
            (med.brands &&
              med.brands.some(
                (b) =>
                  (b.name || '').toLowerCase().includes(t) ||
                  (b.manufacturer || '').toLowerCase().includes(t)
              ))
        );
      }

      return false;
    });
  },

  /**
   * Fetch alternatives for a specific medicine by ID
   * Calls /medicines/:medicineId/alternatives
   */
  getAlternatives: async (medicineId) => {
    try {
      const response = await api.get(`/medicines/${medicineId}/alternatives`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn(
        `[medicineService] getAlternatives error for ${medicineId}:`,
        err.message
      );
    }

    const target = mockMedicineCatalog.find((m) => m.id === medicineId);
    if (!target) return null;

    const sortedBrands = [...(target.brands || [])].sort((a, b) => (a.price || 0) - (b.price || 0));
    const highestPriced = sortedBrands.length > 0 ? sortedBrands[sortedBrands.length - 1].price : 0;
    const alternativesWithSavings = sortedBrands.map((brand) => ({
      ...brand,
      savings: highestPriced && brand.price ? Math.max(0, highestPriced - brand.price) : 0,
      currency: 'INR',
      matchType: 'EXACT_COMPOSITION',
    }));

    return {
      targetMedicine: target,
      alternatives: alternativesWithSavings,
      count: alternativesWithSavings.length,
      disclaimer:
        'Alternatives are shown based on matching active ingredient(s), strength and dosage form. Consult your dermatologist before changing a prescribed product.',
    };
  },

  /**
   * Fetch single medicine details by ID
   * Calls /medicines/:medicineId
   */
  getMedicineById: async (medicineId) => {
    try {
      const response = await api.get(`/medicines/${medicineId}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn(
        `[medicineService] getMedicineById error for ${medicineId}:`,
        err.message
      );
    }
    return mockMedicineCatalog.find((m) => m.id === medicineId) || null;
  },
};

export default medicineService;
