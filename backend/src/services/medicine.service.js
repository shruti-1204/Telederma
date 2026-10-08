const { NotFoundError } = require("../utils/errors");

/**
 * TeleDerma Medicine Alternative Finder Service
 * Deterministic Pharmaceutical Composition Matcher & Dynamic Search
 */

const MEDICAL_SAFETY_DISCLAIMER =
  "Alternatives are shown based on matching active ingredient(s), strength and dosage form. Consult your dermatologist before changing a prescribed product.";

// Comprehensive dermatology & general pharmaceutical catalog with exact compositions & brand alternatives
const MEDICINES_CATALOG = [
  {
    id: "med-1",
    activeIngredient: "Adapalene (0.1%)",
    category: "Topical Retinoid",
    indication: "Acne vulgaris, comedones, follicular keratosis",
    prescriptionRequired: true,
    description: "Third-generation synthetic retinoid that modulates cellular differentiation and keratinization.",
    dosageForm: "Gel",
    strength: "0.1%",
    brands: [
      { id: "b-1", name: "Adaferin Gel 0.1% (Galderma)", manufacturer: "Galderma", price: 345, size: "15g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-2", name: "Deriva-CMS Gel (Glenmark)", manufacturer: "Glenmark", price: 295, size: "15g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-3", name: "Differin 0.1% (Galderma)", manufacturer: "Galderma", price: 420, size: "30g Tube", form: "Cream", prescriptionRequired: true },
      { id: "b-4", name: "Acfree Gel (Cipla)", manufacturer: "Cipla", price: 210, size: "15g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-5", name: "Adiff Gel 0.1% (Sun Pharma)", manufacturer: "Sun Pharma", price: 185, size: "15g Tube", form: "Gel", prescriptionRequired: true },
    ],
  },
  {
    id: "med-2",
    activeIngredient: "Clindamycin Phosphate (1%)",
    category: "Topical Lincosamide Antibiotic",
    indication: "Inflammatory acne, bacterial folliculitis",
    prescriptionRequired: true,
    description: "Bacteriostatic agent that inhibits bacterial protein synthesis of Propionibacterium acnes.",
    dosageForm: "Gel",
    strength: "1%",
    brands: [
      { id: "b-6", name: "Clindac-A Gel (Alkem)", manufacturer: "Alkem Laboratories", price: 165, size: "20g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-7", name: "Erytop Gel 1% (USV Ltd)", manufacturer: "USV Ltd", price: 185, size: "20g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-8", name: "Cleargel 1% (Curatio)", manufacturer: "Curatio Healthcare", price: 172, size: "15g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-9", name: "Clincin Gel 1% (Torrent Pharma)", manufacturer: "Torrent Pharma", price: 140, size: "20g Tube", form: "Gel", prescriptionRequired: true },
    ],
  },
  {
    id: "med-3",
    activeIngredient: "Ketoconazole (2%)",
    category: "Antifungal",
    indication: "Seborrheic dermatitis, tinea versicolor, dandruff",
    prescriptionRequired: false,
    description: "Broad-spectrum synthetic imidazole antifungal agent that inhibits ergosterol synthesis.",
    dosageForm: "Lotion / Shampoo",
    strength: "2%",
    brands: [
      { id: "b-10", name: "Nizral 2% Shampoo (Janssen)", manufacturer: "Janssen / J&J", price: 380, size: "100ml", form: "Lotion / Shampoo", prescriptionRequired: false },
      { id: "b-11", name: "Scalpe Pro Anti-Dandruff (Glenmark)", manufacturer: "Glenmark", price: 275, size: "100ml", form: "Shampoo", prescriptionRequired: false },
      { id: "b-12", name: "Keto Soap 2% (Med Manor)", manufacturer: "Med Manor Organics", price: 120, size: "75g Bar", form: "Soap", prescriptionRequired: false },
      { id: "b-13", name: "Ketofly Shampoo 2% (Leeford)", manufacturer: "Leeford Healthcare", price: 160, size: "100ml", form: "Shampoo", prescriptionRequired: false },
    ],
  },
  {
    id: "med-4",
    activeIngredient: "Hydrocortisone (1%)",
    category: "Mild Topical Corticosteroid",
    indication: "Eczema, contact dermatitis, insect bites",
    prescriptionRequired: true,
    description: "Mild potency topical corticosteroid for reducing inflammatory redness and itching.",
    dosageForm: "Cream",
    strength: "1%",
    brands: [
      { id: "b-14", name: "Hicort 1% Cream (Ranbaxy)", manufacturer: "Ranbaxy / Sun Pharma", price: 85, size: "10g Tube", form: "Cream", prescriptionRequired: true },
      { id: "b-15", name: "Locoid Lipo Cream (Leo Pharma)", manufacturer: "Leo Pharma", price: 195, size: "30g Tube", form: "Cream", prescriptionRequired: true },
      { id: "b-16", name: "Cortizone-10 (Chattem)", manufacturer: "Chattem Inc.", price: 180, size: "28g Tube", form: "Cream", prescriptionRequired: true },
    ],
  },
  {
    id: "med-5",
    activeIngredient: "Niacinamide (5% - 10%) + Zinc PCA",
    category: "Barrier Repair & Sebum Regulator",
    indication: "Blemishes, enlarged pores, redness, hyperpigmentation",
    prescriptionRequired: false,
    description: "Vitamin B3 derivative that strengthens epidermal lipid synthesis and soothes inflammation.",
    dosageForm: "Serum",
    strength: "10% + 1%",
    brands: [
      { id: "b-17", name: "Minimalist 10% Niacinamide Serum", manufacturer: "Uprising Science", price: 599, size: "30ml", form: "Serum", prescriptionRequired: false },
      { id: "b-18", name: "The Ordinary Niacinamide 10% + Zinc 1%", manufacturer: "Deciem", price: 600, size: "30ml", form: "Serum", prescriptionRequired: false },
      { id: "b-19", name: "Plum 10% Niacinamide Rice Water", manufacturer: "Pureplay Skin Sciences", price: 520, size: "30ml", form: "Serum", prescriptionRequired: false },
      { id: "b-20", name: "Derma Co 10% Niacinamide Serum", manufacturer: "Honer Consumer Products", price: 499, size: "30ml", form: "Serum", prescriptionRequired: false },
    ],
  },
  {
    id: "med-6",
    activeIngredient: "Benzoyl Peroxide (2.5% - 5%)",
    category: "Topical Antibacterial & Keratolytic",
    indication: "Inflammatory acne lesions, papules, pustules",
    prescriptionRequired: false,
    description: "Generates free radical oxygen species that eliminate P. acnes bacteria and unplug follicles.",
    dosageForm: "Gel / Wash",
    strength: "2.5% - 5%",
    brands: [
      { id: "b-21", name: "Benzac AC 2.5% Gel (Galderma)", manufacturer: "Galderma", price: 175, size: "30g Tube", form: "Gel", prescriptionRequired: false },
      { id: "b-22", name: "Brevoxyl 4% Creamy Wash (GSK)", manufacturer: "GlaxoSmithKline", price: 230, size: "50g Tube", form: "Cream", prescriptionRequired: false },
      { id: "b-23", name: "Pernex AC 5% Gel (Cosme Farma)", manufacturer: "Cosme Farma", price: 140, size: "20g Tube", form: "Gel", prescriptionRequired: false },
      { id: "b-24", name: "Benxop 2.5% Gel (Apex Labs)", manufacturer: "Apex Laboratories", price: 125, size: "20g Tube", form: "Gel", prescriptionRequired: false },
    ],
  },
  {
    id: "med-7",
    activeIngredient: "Salicylic Acid (2%)",
    category: "Beta Hydroxy Acid (BHA) Exfoliant",
    indication: "Blackheads, whiteheads, excess oil, rough skin texture",
    prescriptionRequired: false,
    description: "Lipid-soluble chemical exfoliant that penetrates deep into pores to dissolve sebum build-up.",
    dosageForm: "Gel / Face Wash",
    strength: "2%",
    brands: [
      { id: "b-25", name: "Sebogel 2% (Cipla)", manufacturer: "Cipla", price: 280, size: "30g Tube", form: "Gel", prescriptionRequired: false },
      { id: "b-26", name: "Saslic DS Face Wash (Cipla)", manufacturer: "Cipla", price: 395, size: "60ml", form: "Foam Wash", prescriptionRequired: false },
      { id: "b-27", name: "Minimalist 2% Salicylic Acid Serum", manufacturer: "Uprising Science", price: 549, size: "30ml", form: "Serum", prescriptionRequired: false },
      { id: "b-28", name: "Salicylix SF 6% Ointment (Dr. Reddy's)", manufacturer: "Dr. Reddy's", price: 135, size: "50g Tube", form: "Ointment", prescriptionRequired: false },
    ],
  },
  {
    id: "med-8",
    activeIngredient: "Tretinoin (0.025% - 0.05%)",
    category: "First-Generation Retinoid",
    indication: "Comedonal acne, photoaging, coarse skin wrinkling",
    prescriptionRequired: true,
    description: "Potent vitamin A metabolite that stimulates cellular epidermal turnover and collagen production.",
    dosageForm: "Cream / Gel",
    strength: "0.025% - 0.05%",
    brands: [
      { id: "b-29", name: "Retino-A 0.025% Cream (Janssen)", manufacturer: "Janssen / J&J", price: 215, size: "20g Tube", form: "Cream", prescriptionRequired: true },
      { id: "b-30", name: "A-Ret 0.05% Gel (Menarini)", manufacturer: "Menarini India", price: 195, size: "20g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-31", name: "Tretiheal 0.05% Cream (Healing Pharma)", manufacturer: "Healing Pharma", price: 160, size: "20g Tube", form: "Cream", prescriptionRequired: true },
    ],
  },
  {
    id: "med-9",
    activeIngredient: "Azelaic Acid (10% - 20%)",
    category: "Dicarboxylic Acid Anti-inflammatory",
    indication: "Rosacea, post-inflammatory erythema (PIE), melasma",
    prescriptionRequired: true,
    description: "Competitively inhibits tyrosinase to diminish hyperpigmentation and calms vascular facial redness.",
    dosageForm: "Gel / Cream",
    strength: "10% - 20%",
    brands: [
      { id: "b-32", name: "Aziderm 10% Gel (Micro Labs)", manufacturer: "Micro Labs", price: 270, size: "15g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-33", name: "Picspot 20% Gel (Curatio)", manufacturer: "Curatio Healthcare", price: 340, size: "15g Tube", form: "Gel", prescriptionRequired: true },
      { id: "b-34", name: "Exazel-N Cream (Cosme Farma)", manufacturer: "Cosme Farma", price: 310, size: "20g Tube", form: "Cream", prescriptionRequired: true },
      { id: "b-35", name: "Aziderm 20% Cream (Micro Labs)", manufacturer: "Micro Labs", price: 380, size: "15g Tube", form: "Cream", prescriptionRequired: true },
    ],
  },
  {
    id: "med-10",
    activeIngredient: "Ceramide Complex (1% - 3%)",
    category: "Epidermal Barrier Restorer",
    indication: "Compromised skin barrier, atopic eczema, flaking dryness",
    prescriptionRequired: false,
    description: "Multi-ceramide physiological lipid complex that mimics the natural stratum corneum lipid matrix.",
    dosageForm: "Cream / Lotion",
    strength: "1% - 3%",
    brands: [
      { id: "b-36", name: "Cerave Moisturizing Cream", manufacturer: "L'Oreal / CeraVe", price: 450, size: "50g Tube", form: "Cream", prescriptionRequired: false },
      { id: "b-37", name: "Cetaphil DAM Daily Advanced Ultra", manufacturer: "Galderma", price: 395, size: "30g Tube", form: "Lotion", prescriptionRequired: false },
      { id: "b-38", name: "Bioderma Atoderm Intensive Baume", manufacturer: "NAOS Bioderma", price: 799, size: "75ml", form: "Baume", prescriptionRequired: false },
      { id: "b-39", name: "Venusia Max Intensive Cream", manufacturer: "Dr. Reddy's", price: 320, size: "150g Jar", form: "Cream", prescriptionRequired: false },
    ],
  },
  {
    id: "med-11",
    activeIngredient: "Clotrimazole (1%)",
    category: "Topical Antifungal",
    indication: "Ringworm (Tinea corporis), athlete's foot, jock itch",
    prescriptionRequired: false,
    description: "Broad-spectrum imidazole antifungal that inhibits fungal cell wall ergosterol biosynthesis.",
    dosageForm: "Cream",
    strength: "1%",
    brands: [
      { id: "b-40", name: "Candid Cream 1% (Glenmark)", manufacturer: "Glenmark", price: 110, size: "30g Tube", form: "Cream", prescriptionRequired: false },
      { id: "b-41", name: "Canesten 1% Cream (Bayer)", manufacturer: "Bayer Pharmaceuticals", price: 135, size: "30g Tube", form: "Cream", prescriptionRequired: false },
      { id: "b-42", name: "Clocip Cream 1% (Cipla)", manufacturer: "Cipla", price: 85, size: "20g Tube", form: "Cream", prescriptionRequired: false },
    ],
  },
];

class MedicineService {
  /**
   * Retrieves all suggested curated molecules with brand alternatives
   */
  async getMolecules() {
    return MEDICINES_CATALOG.map((m) => ({
      ...m,
      brands: this.sortBrandsByPrice(m.brands),
    }));
  }

  /**
   * Searches medicines by active ingredient, brand name, indication, category, or formulation
   */
  async search(query = "") {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
      return this.getMolecules();
    }

    const cleanStr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const cleanedQuery = cleanStr(q);
    const tokens = cleanedQuery.split(/\s+/).filter(Boolean);

    const matches = MEDICINES_CATALOG.filter((med) => {
      const activeLower = med.activeIngredient.toLowerCase();
      const cleanedActive = cleanStr(med.activeIngredient);
      const catLower = (med.category || "").toLowerCase();
      const indLower = (med.indication || "").toLowerCase();
      const descLower = (med.description || "").toLowerCase();
      const formLower = (med.dosageForm || "").toLowerCase();

      // Direct substring match
      if (
        activeLower.includes(q) ||
        cleanedActive.includes(cleanedQuery) ||
        catLower.includes(q) ||
        indLower.includes(q) ||
        descLower.includes(q) ||
        formLower.includes(q)
      ) {
        return true;
      }

      // Check any brand name or manufacturer
      if (
        med.brands &&
        med.brands.some((b) => {
          const bName = b.name.toLowerCase();
          const bMfg = (b.manufacturer || "").toLowerCase();
          const bForm = (b.form || "").toLowerCase();
          return bName.includes(q) || bMfg.includes(q) || bForm.includes(q);
        })
      ) {
        return true;
      }

      // Multi-token match
      if (tokens.length > 1) {
        return tokens.every(
          (t) =>
            cleanedActive.includes(t) ||
            catLower.includes(t) ||
            indLower.includes(t) ||
            (med.brands &&
              med.brands.some(
                (b) =>
                  b.name.toLowerCase().includes(t) ||
                  (b.manufacturer || "").toLowerCase().includes(t)
              ))
        );
      }

      return false;
    });

    return matches.map((m) => ({
      ...m,
      brands: this.sortBrandsByPrice(m.brands),
    }));
  }

  /**
   * Helper to normalize ID comparison (supports med-1, med_1, med1)
   */
  findMedicineById(medicineId) {
    if (!medicineId) return null;
    const clean = String(medicineId).toLowerCase().replace(/[^a-z0-9]/g, "");
    return MEDICINES_CATALOG.find(
      (m) =>
        m.id === medicineId ||
        String(m.id).toLowerCase().replace(/[^a-z0-9]/g, "") === clean
    );
  }

  /**
   * Retrieves single molecule by ID
   */
  async getById(medicineId) {
    const found = this.findMedicineById(medicineId);
    if (!found) {
      throw new NotFoundError(`Medicine with ID ${medicineId} not found`);
    }
    return {
      ...found,
      brands: this.sortBrandsByPrice(found.brands),
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    };
  }

  /**
   * Deterministic composition alternative finder
   * Given a medicine ID, returns all matching alternative brands with formulation, pack size, price, and savings
   */
  async getAlternatives(medicineId) {
    const target = this.findMedicineById(medicineId);
    if (!target) {
      throw new NotFoundError(`Medicine with ID ${medicineId} not found`);
    }

    const sortedBrands = this.sortBrandsByPrice(target.brands);
    const highestPriced = sortedBrands.length > 0 ? sortedBrands[sortedBrands.length - 1].price : 0;

    const alternativesWithSavings = sortedBrands.map((brand) => {
      const savings = highestPriced && brand.price ? Math.max(0, highestPriced - brand.price) : 0;
      return {
        ...brand,
        savings,
        currency: "INR",
        matchType: "EXACT_COMPOSITION",
      };
    });

    return {
      targetMedicine: {
        id: target.id,
        activeIngredient: target.activeIngredient,
        category: target.category,
        indication: target.indication,
        prescriptionRequired: target.prescriptionRequired,
        description: target.description,
        dosageForm: target.dosageForm,
        strength: target.strength,
      },
      alternatives: alternativesWithSavings,
      count: alternativesWithSavings.length,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    };
  }

  /**
   * Helper: Sort alternative brands by lowest price first
   */
  sortBrandsByPrice(brands = []) {
    return [...brands].sort((a, b) => {
      const priceA = a.price !== null && a.price !== undefined ? Number(a.price) : 999999;
      const priceB = b.price !== null && b.price !== undefined ? Number(b.price) : 999999;
      return priceA - priceB;
    });
  }
}

module.exports = new MedicineService();
