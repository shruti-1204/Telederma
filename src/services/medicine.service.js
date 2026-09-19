const { NotFoundError } = require("../utils/errors");

// Decoupled medicine catalog provider abstraction
const MEDICINES_DATABASE = [
  {
    id: "med_1",
    genericName: "Hydrocortisone",
    brandName: "Cortizone-10",
    strength: "1%",
    dosageForm: "Cream / Topical Ointment",
    manufacturer: "Chattem Inc.",
    price: 180.0,
    category: "Topical Corticosteroid",
  },
  {
    id: "med_2",
    genericName: "Hydrocortisone",
    brandName: "Hytone",
    strength: "2.5%",
    dosageForm: "Cream",
    manufacturer: "DermAvance",
    price: 240.0,
    category: "Topical Corticosteroid",
  },
  {
    id: "med_3",
    genericName: "Clindamycin Phosphate",
    brandName: "Cleocin T",
    strength: "1%",
    dosageForm: "Topical Gel",
    manufacturer: "Pfizer",
    price: 320.0,
    category: "Topical Antibiotic",
  },
  {
    id: "med_4",
    genericName: "Clindamycin Phosphate",
    brandName: "Clindac A",
    strength: "1%",
    dosageForm: "Gel",
    manufacturer: "Alkem Laboratories",
    price: 195.0,
    category: "Topical Antibiotic",
  },
  {
    id: "med_5",
    genericName: "Tretinoin",
    brandName: "Retin-A",
    strength: "0.05%",
    dosageForm: "Cream",
    manufacturer: "Bausch Health",
    price: 450.0,
    category: "Retinoid",
  },
  {
    id: "med_6",
    genericName: "Tretinoin",
    brandName: "A-Ret Gel",
    strength: "0.05%",
    dosageForm: "Gel",
    manufacturer: "Menarini India",
    price: 210.0,
    category: "Retinoid",
  },
  {
    id: "med_7",
    genericName: "Ketoconazole",
    brandName: "Nizoral",
    strength: "2%",
    dosageForm: "Shampoo / Cream",
    manufacturer: "Johnson & Johnson",
    price: 290.0,
    category: "Antifungal",
  },
  {
    id: "med_8",
    genericName: "Ketoconazole",
    brandName: "Ketomac",
    strength: "2%",
    dosageForm: "Lotion",
    manufacturer: "Torque Pharma",
    price: 180.0,
    category: "Antifungal",
  },
  {
    id: "med_9",
    genericName: "Cetirizine Hydrochloride",
    brandName: "Zyrtec",
    strength: "10mg",
    dosageForm: "Oral Tablet",
    manufacturer: "McNeil Consumer",
    price: 90.0,
    category: "Antihistamine",
  },
  {
    id: "med_10",
    genericName: "Cetirizine Hydrochloride",
    brandName: "Cetzine",
    strength: "10mg",
    dosageForm: "Oral Tablet",
    manufacturer: "Dr. Reddy's Laboratories",
    price: 45.0,
    category: "Antihistamine",
  },
];

class MedicineProvider {
  async search(query) {
    const q = query.trim().toLowerCase();
    return MEDICINES_DATABASE.filter(
      (m) =>
        m.genericName.toLowerCase().includes(q) ||
        m.brandName.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }

  async getById(medicineId) {
    return MEDICINES_DATABASE.find((m) => m.id === medicineId) || null;
  }

  async getAlternatives(medicineId) {
    const target = await this.getById(medicineId);
    if (!target) {
      throw new NotFoundError("Medicine not found");
    }

    const alternatives = MEDICINES_DATABASE.filter(
      (m) => m.id !== medicineId && m.genericName.toLowerCase() === target.genericName.toLowerCase()
    );

    return {
      referenceMedicine: target,
      alternatives,
    };
  }
}

module.exports = new MedicineProvider();
