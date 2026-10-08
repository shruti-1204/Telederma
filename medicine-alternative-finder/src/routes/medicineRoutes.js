/**
 * TeleDerma Medicine Alternative Finder
 * Medicine Routes
 */

const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

// Search medicines by brand, product, or ingredient: GET /api/medicines/search?q=
router.get('/search', medicineController.search);

// Get single medicine details: GET /api/medicines/:id
router.get('/:id', medicineController.getById);

// Get exact composition alternatives: GET /api/medicines/:id/alternatives
router.get('/:id/alternatives', medicineController.getAlternatives);

module.exports = router;
