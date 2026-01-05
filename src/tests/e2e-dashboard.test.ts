import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { setupTestData, cleanupTestData } from './setup';
import authRouter from '../routes/auth';
import facilitiesRouter from '../routes/facilities';
import residentsRouter from '../routes/residents';
import staffDashboardRouter from '../routes/staff-dashboard';
import familyMembersRouter from '../routes/family-members';
import familyCheckInsRouter from '../routes/family-checkins';

// Setup Express app for testing
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/facilities', facilitiesRouter);
app.use('/api/residents', residentsRouter);
app.use('/api/staff', staffDashboardRouter);
app.use('/api/family-members', familyMembersRouter);
app.use('/api/family-checkins', familyCheckInsRouter);

let testData: Awaited<ReturnType<typeof setupTestData>>;
let adminToken: string;
let managerToken: string;
let staffToken: string;

describe('E2E Dashboard Tests', () => {
  beforeAll(async () => {
    testData = await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Authentication Flow', () => {
    it('should login as ADMIN and receive token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@linda.com',
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('ADMIN');
      expect(response.body.user.facilityId).toBeNull();
      adminToken = response.body.token;
    });

    it('should login as MANAGER and receive token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@sunnymeadows.com',
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('MANAGER');
      expect(response.body.user.facilityId).toBe(testData.facility1.id);
      managerToken = response.body.token;
    });

    it('should login as STAFF and receive token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'staff@sunnymeadows.com',
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('STAFF');
      staffToken = response.body.token;
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@linda.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should reject requests without token', async () => {
      await request(app)
        .get('/api/facilities')
        .expect(401);
    });
  });

  describe('Facility Management (RBAC)', () => {
    it('ADMIN should see all facilities', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body.map((f: any) => f.name)).toContain('Sunny Meadows Care Home');
      expect(response.body.map((f: any) => f.name)).toContain('Oak Tree Residence');
    });

    it('MANAGER should only see their own facility', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Sunny Meadows Care Home');
    });

    it('STAFF should only see their own facility', async () => {
      const response = await request(app)
        .get('/api/facilities')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Sunny Meadows Care Home');
    });

    it('ADMIN should create new facility', async () => {
      const response = await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Care Home',
          phone: '+441234567892',
          timezone: 'Europe/London',
        })
        .expect(201);

      expect(response.body.name).toBe('New Care Home');
    });

    it('MANAGER should NOT create new facility', async () => {
      await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Unauthorized Facility',
          phone: '+441234567893',
        })
        .expect(403);
    });

    it('STAFF should NOT create new facility', async () => {
      await request(app)
        .post('/api/facilities')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Unauthorized Facility',
          phone: '+441234567893',
        })
        .expect(403);
    });

    it('MANAGER should NOT access other facility', async () => {
      await request(app)
        .get(`/api/facilities/${testData.facility2.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('ADMIN should access any facility', async () => {
      await request(app)
        .get(`/api/facilities/${testData.facility2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Staff Dashboard - Concerns', () => {
    it('should retrieve concerns from family check-ins', async () => {
      const response = await request(app)
        .get('/api/staff/concerns')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.concerns).toBeDefined();
      expect(Array.isArray(response.body.concerns)).toBe(true);

      const concerns = response.body.concerns;
      expect(concerns.length).toBeGreaterThan(0);

      // Check concern structure
      const item = concerns[0];
      expect(item.concern.type).toBeDefined();
      expect(item.concern.description).toBeDefined();
      expect(item.concern.severity).toBeDefined();
      expect(item.resident).toBeDefined();
      expect(item.familyMember).toBeDefined();
    });

    it('should filter concerns by severity', async () => {
      const response = await request(app)
        .get('/api/staff/concerns?severity=medium')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const concerns = response.body.concerns;
      concerns.forEach((c: any) => {
        expect(c.concern.severity).toBe('medium');
      });
    });

    it('MANAGER should only see concerns from their facility', async () => {
      const response = await request(app)
        .get('/api/staff/concerns')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const concerns = response.body.concerns;
      concerns.forEach((c: any) => {
        expect(c.facility.id).toBe(testData.facility1.id);
      });
    });

    it('ADMIN should see concerns from all facilities', async () => {
      const response = await request(app)
        .get('/api/staff/concerns')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.concerns).toBeDefined();
    });
  });

  describe('Staff Dashboard - Check-in Summary', () => {
    it('should get check-in summary statistics', async () => {
      const response = await request(app)
        .get('/api/staff/check-ins/summary')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.summary.totalCheckIns).toBeDefined();
      expect(response.body.summary.completed).toBeDefined();
      expect(response.body.summary.withConcerns).toBeDefined();
      expect(response.body.summary.concernsBySeverity).toBeDefined();
    });

    it('should get recent check-ins', async () => {
      const response = await request(app)
        .get('/api/staff/check-ins/recent?limit=10')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.checkIns)).toBe(true);

      if (response.body.checkIns.length > 0) {
        const checkIn = response.body.checkIns[0];
        expect(checkIn.resident).toBeDefined();
        expect(checkIn.familyMember).toBeDefined();
        expect(checkIn.moodSummary).toBeDefined();
      }
    });

    it('should get check-ins for specific resident', async () => {
      const response = await request(app)
        .get(`/api/staff/residents/${testData.resident.id}/check-ins`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.checkIns)).toBe(true);

      response.body.checkIns.forEach((checkIn: any) => {
        expect(checkIn.residentId).toBe(testData.resident.id);
      });
    });
  });

  describe('Family Members Management', () => {
    it('should create new family member', async () => {
      const response = await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          residentId: testData.resident.id,
          firstName: 'John',
          lastName: 'Thompson',
          relationship: 'son',
          phoneNumber: '+441234567802',
          email: 'john@example.com',
          canReceiveCheckIns: true,
        })
        .expect(201);

      expect(response.body.firstName).toBe('John');
      expect(response.body.relationship).toBe('son');
    });

    it('should get family members for resident', async () => {
      const response = await request(app)
        .get(`/api/family-members/resident/${testData.resident.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should update family member permissions', async () => {
      const response = await request(app)
        .patch(`/api/family-members/${testData.familyMember.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          canAccessStarred: true,
        })
        .expect(200);

      expect(response.body.canAccessStarred).toBe(true);
    });

    it('should not allow duplicate phone numbers', async () => {
      await request(app)
        .post('/api/family-members')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          residentId: testData.resident.id,
          firstName: 'Duplicate',
          lastName: 'User',
          relationship: 'friend',
          phoneNumber: testData.familyMember.phoneNumber, // Same phone
        })
        .expect(409);
    });
  });

  describe('User Management (ADMIN only)', () => {
    it('ADMIN should create new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newstaff@sunnymeadows.com',
          password: 'NewPassword123!',
          firstName: 'New',
          lastName: 'Staff',
          role: 'STAFF',
          facilityId: testData.facility1.id,
        })
        .expect(201);

      expect(response.body.user.email).toBe('newstaff@sunnymeadows.com');
      expect(response.body.user.role).toBe('STAFF');
    });

    it('MANAGER should NOT create new user', async () => {
      await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          email: 'unauthorized@sunnymeadows.com',
          password: 'Password123!',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: 'STAFF',
          facilityId: testData.facility1.id,
        })
        .expect(403);
    });

    it('ADMIN should list all users', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
    });

    it('MANAGER should NOT list all users', async () => {
      await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('should validate STAFF/MANAGER require facilityId', async () => {
      await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid@test.com',
          password: 'Password123!',
          firstName: 'Invalid',
          lastName: 'User',
          role: 'STAFF',
          // Missing facilityId
        })
        .expect(400);
    });
  });

  describe('Current User Profile', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('manager@sunnymeadows.com');
      expect(response.body.user.role).toBe('MANAGER');
      expect(response.body.user.facility).toBeDefined();
      expect(response.body.user.facility.name).toBe('Sunny Meadows Care Home');
    });

    it('should change password', async () => {
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(200);

      // Verify can login with new password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'staff@sunnymeadows.com',
          password: 'NewPassword456!',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();

      // Change it back for other tests
      await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${response.body.token}`)
        .send({
          currentPassword: 'NewPassword456!',
          newPassword: 'TestPassword123!',
        })
        .expect(200);
    });
  });

  describe('Cross-Facility Access Control', () => {
    it('MANAGER from facility1 should NOT access residents from facility2', async () => {
      // Create resident in facility2
      const resident2 = await request(app)
        .post('/api/residents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: testData.facility2.id,
          firstName: 'Test',
          lastName: 'Resident',
          phoneNumber: '+441234567803',
        })
        .expect(201);

      // Manager from facility1 tries to access
      await request(app)
        .get(`/api/residents/${resident2.body.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('ADMIN should access residents from any facility', async () => {
      const response = await request(app)
        .get(`/api/residents/${testData.resident.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(testData.resident.id);
    });
  });
});

console.log('E2E Dashboard Tests Ready');
console.log('Run with: npx tsx src/tests/e2e-dashboard.test.ts');
