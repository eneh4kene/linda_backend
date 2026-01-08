import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Sunny Meadows facility
  const facility = await prisma.facility.upsert({
    where: { id: 'sunny-meadows-facility' },
    update: {},
    create: {
      id: 'sunny-meadows-facility',
      name: 'Sunny Meadows Care Home',
      phone: '+44 20 1234 5678',
      timezone: 'Europe/London',
      settings: {},
    },
  });

  console.log('✅ Created facility:', facility.name);

  // Hash password
  const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@linda.com' },
    update: {},
    create: {
      email: 'admin@linda.com',
      password: hashedPassword,
      firstName: 'Linda',
      lastName: 'Admin',
      role: 'ADMIN',
      facilityId: null, // Admins don't belong to a specific facility
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create Manager user
  const manager = await prisma.user.upsert({
    where: { email: 'manager@sunnymeadows.com' },
    update: {},
    create: {
      email: 'manager@sunnymeadows.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'MANAGER',
      facilityId: facility.id,
      isActive: true,
    },
  });

  console.log('✅ Created manager user:', manager.email);

  // Create Staff user
  const staff = await prisma.user.upsert({
    where: { email: 'staff@sunnymeadows.com' },
    update: {},
    create: {
      email: 'staff@sunnymeadows.com',
      password: hashedPassword,
      firstName: 'Emily',
      lastName: 'Davis',
      role: 'STAFF',
      facilityId: facility.id,
      isActive: true,
    },
  });

  console.log('✅ Created staff user:', staff.email);

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Demo Credentials:');
  console.log('   Admin:   admin@linda.com');
  console.log('   Manager: manager@sunnymeadows.com');
  console.log('   Staff:   staff@sunnymeadows.com');
  console.log('   Password: TestPassword123!');
  console.log('\n⚠️  Remember to change these passwords in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
