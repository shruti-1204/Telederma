const { verifyDoctorOnNMC } = require('../services/scraper.service');

const verifyDoctor = async (req, res) => {
  try {
    const { registrationNumber, expectedName } = req.body;

    if (!registrationNumber || !expectedName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both registrationNumber and expectedName.' 
      });
    }

    // Call our Puppeteer Scraper Service
    const result = await verifyDoctorOnNMC(registrationNumber, expectedName);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Return the MedVerify style response
    return res.status(200).json(result);

  } catch (error) {
    console.error("Verification Controller Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { verifyDoctor };
