const express = require('express');
const router = express.Router();
const { verifyDoctor } = require('../controllers/verification.controller');

// POST /api/v1/verification/verify
router.post('/verify', verifyDoctor);

module.exports = router;
