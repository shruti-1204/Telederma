const prisma = require('./src/config/prisma');
const jwt = require('jsonwebtoken');

async function main() {
  console.log('Seeding Database...');
  
  const docUser = await prisma.user.create({
    data: {
      role: 'DOCTOR',
      phone: '9876543210',
      name: 'Dr. Shruti Patil',
      doctor: {
        create: {
          specialization: 'Dermatologist',
          licenseNumber: 'NMC123456',
          isVerified: true
        }
      }
    },
    include: { doctor: true }
  });
  console.log('Created Doctor:', docUser.name);

  const token = jwt.sign(
    { userId: docUser.id, role: docUser.role },
    'telederma_jwt_access_secret_key_default_development_2026',
    { expiresIn: '365d' }
  );
  console.log('\n=============================');
  console.log('TEST TOKEN: ' + token);
  console.log('=============================\n');

  const patientsData = [
    { name: 'Anita Verma', phone: '2222222222', slotStart: new Date(), status: 'CONFIRMED' },
    { name: 'Vikram Singh', phone: '3333333333', slotStart: new Date(Date.now() - 5000000), status: 'COMPLETED' },
    { name: 'Priya Desai', phone: '4444444444', slotStart: new Date(Date.now() + 86400000), status: 'PENDING' },
  ];

  for (let p of patientsData) {
    const pUser = await prisma.user.create({
      data: {
        role: 'PATIENT',
        phone: p.phone,
        name: p.name,
        patient: { create: {} }
      },
      include: { patient: true }
    });

    await prisma.appointment.create({
      data: {
        patientId: pUser.patient.id,
        doctorId: docUser.doctor.id,
        slotStart: p.slotStart,
        slotEnd: new Date(p.slotStart.getTime() + 1800000),
        status: p.status
      }
    });
    console.log('Created Patient & Appointment: ' + p.name);
  }

  console.log('Seeding Complete!');
}
main().finally(() => prisma.$disconnect());
