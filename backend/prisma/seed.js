const prisma = require("../src/config/prisma");

async function seed() {
  console.log("Seeding doctors and initial data...");

  const doctorsData = [
    {
      phone: "9769947137",
      email: "dr.kundan@telederma.org",
      name: "Dr. Kundan Ashok Kharde",
      specialization: "Clinical Dermatology & Venereology",
      qualification: "MBBS, MD (NMC Registered)",
      licenseNumber: "09-35371",
      bio: "Verified Dermatologist registered with National Medical Commission.",
      isVerified: true,
    },
  ];

  for (const doc of doctorsData) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: doc.phone },
      include: { doctor: true },
    });

    let doctorId;
    if (!existingUser) {
      const created = await prisma.user.create({
        data: {
          phone: doc.phone,
          email: doc.email,
          name: doc.name,
          role: "DOCTOR",
          doctor: {
            create: {
              specialization: doc.specialization,
              qualification: doc.qualification,
              licenseNumber: doc.licenseNumber,
              bio: doc.bio,
              isVerified: doc.isVerified,
            },
          },
        },
        include: { doctor: true },
      });
      doctorId = created.doctor.id;
      console.log(`Created doctor: ${doc.name}`);
    } else {
      doctorId = existingUser.doctor?.id;
      if (existingUser.doctor) {
        await prisma.doctor.update({
          where: { id: doctorId },
          data: {
            specialization: doc.specialization,
            qualification: doc.qualification,
            bio: doc.bio,
            isVerified: true,
          },
        });
      }
      console.log(`Updated doctor: ${doc.name}`);
    }

    if (doctorId) {
      // Create availability for everyday (0 to 6)
      for (let day = 0; day <= 6; day++) {
        const existingAvail = await prisma.doctorAvailability.findFirst({
          where: { doctorId, dayOfWeek: day },
        });

        if (!existingAvail) {
          await prisma.doctorAvailability.create({
            data: {
              doctorId,
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "18:00",
              isActive: true,
            },
          });
        }
      }
    }
  }

  console.log("Seeding completed successfully!");
}

seed()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
