const prisma = require("../config/prisma");

const checkUserExists = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    // Check if user exists by phone
    if (phone) {
      const userByPhone = await prisma.user.findUnique({ where: { phone } });
      if (userByPhone) return res.status(200).json({ success: true, exists: true, reason: 'phone' });
    }

    // Check if user exists by exact name (case-insensitive)
    if (name) {
      const userByName = await prisma.user.findFirst({ 
        where: { name: { equals: name, mode: 'insensitive' } } 
      });
      if (userByName) return res.status(200).json({ success: true, exists: true, reason: 'name' });
    }

    return res.status(200).json({ success: true, exists: false });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = { checkUserExists };
