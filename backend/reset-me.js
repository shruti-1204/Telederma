const prisma = require('./src/config/prisma');

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.log("Please provide a phone number! Example: node reset-me.js 9769947137");
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      console.log("User with phone " + phone + " not found in database.");
      process.exit(0);
    }
    
    await prisma.user.delete({ where: { phone } });
    console.log("✅ Success! Phone number " + phone + " deleted from Database.");
    console.log("You can now test Registration again.");
  } catch (e) {
    console.error("Error deleting user:", e.message);
  } finally {
    process.exit(0);
  }
}

main();
