import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export async function setupTestData() {
  // Clean up existing test data
  await prisma.familyCheckIn.deleteMany({});
  await prisma.familyMember.deleteMany({});
  await prisma.call.deleteMany({});
  await prisma.resident.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.facility.deleteMany({});

  // Create test facilities
  const facility1 = await prisma.facility.create({
    data: {
      name: 'Sunny Meadows Care Home',
      phone: '+441234567890',
      timezone: 'Europe/London',
    },
  });

  const facility2 = await prisma.facility.create({
    data: {
      name: 'Oak Tree Residence',
      phone: '+441234567891',
      timezone: 'Europe/London',
    },
  });

  // Create test users
  const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@linda.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      facilityId: null,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@sunnymeadows.com',
      password: hashedPassword,
      firstName: 'Manager',
      lastName: 'Smith',
      role: 'MANAGER',
      facilityId: facility1.id,
      isActive: true,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@sunnymeadows.com',
      password: hashedPassword,
      firstName: 'Staff',
      lastName: 'Jones',
      role: 'STAFF',
      facilityId: facility1.id,
      isActive: true,
    },
  });

  // Create test resident
  const resident = await prisma.resident.create({
    data: {
      facilityId: facility1.id,
      firstName: 'Margaret',
      lastName: 'Thompson',
      preferredName: 'Maggie',
      phoneNumber: '+441234567800',
      roomNumber: '14',
      status: 'active',
      callConsent: true,
      lifestoryConsent: true,
      familyCheckInConsent: true,
    },
  });

  // Create test family member
  const familyMember = await prisma.familyMember.create({
    data: {
      residentId: resident.id,
      firstName: 'Sarah',
      lastName: 'Thompson',
      relationship: 'daughter',
      phoneNumber: '+441234567801',
      email: 'sarah@example.com',
      canReceiveCheckIns: true,
      phoneVerified: true,
    },
  });

  // Create test calls
  const call1 = await prisma.call.create({
    data: {
      residentId: resident.id,
      callNumber: 1,
      status: 'completed',
      isFirstCall: true,
      startedAt: new Date('2025-01-01T10:00:00Z'),
      endedAt: new Date('2025-01-01T10:08:00Z'),
      durationSeconds: 480,
      sentimentScore: 0.8,
      summary: 'Pleasant conversation about family',
      transcriptText: 'Hello Margaret, how are you today?',
    },
  });

  const call2 = await prisma.call.create({
    data: {
      residentId: resident.id,
      callNumber: 2,
      status: 'completed',
      isFirstCall: false,
      startedAt: new Date('2025-01-02T14:00:00Z'),
      endedAt: new Date('2025-01-02T14:10:00Z'),
      durationSeconds: 600,
      sentimentScore: 0.6,
      summary: 'Discussed health concerns',
      transcriptText: 'How are you feeling today, Margaret?',
    },
  });

  // Create test family check-in with concerns
  const checkIn = await prisma.familyCheckIn.create({
    data: {
      familyMemberId: familyMember.id,
      residentId: resident.id,
      status: 'completed',
      startedAt: new Date('2025-01-03T09:00:00Z'),
      endedAt: new Date('2025-01-03T09:05:00Z'),
      durationSeconds: 300,
      periodStartDate: new Date('2024-12-27T00:00:00Z'),
      periodEndDate: new Date('2025-01-03T00:00:00Z'),
      callsCovered: 2,
      moodSummary: 'Generally positive but mentioned feeling tired',
      topicsDiscussed: ['family', 'health', 'daily activities'],
      concernsRaised: [
        {
          type: 'health_concern',
          description: 'Resident mentioned feeling more tired than usual',
          severity: 'medium',
        },
        {
          type: 'mood_change',
          description: 'Slight decrease in engagement during second call',
          severity: 'low',
        },
      ],
      generatedScript: 'Hello Sarah, this is Linda...',
    },
  });

  return {
    facility1,
    facility2,
    adminUser,
    managerUser,
    staffUser,
    resident,
    familyMember,
    call1,
    call2,
    checkIn,
  };
}

export async function cleanupTestData() {
  await prisma.familyCheckIn.deleteMany({});
  await prisma.familyMember.deleteMany({});
  await prisma.call.deleteMany({});
  await prisma.resident.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.facility.deleteMany({});
}
