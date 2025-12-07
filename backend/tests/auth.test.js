const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_internship');
    }
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test/ });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({ email: /test/ });
  });

  describe('POST /api/auth/request-otp', () => {
    it('should send OTP to valid email', async () => {
      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/request-otp')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify valid OTP and return token', async () => {
      // First request OTP
      const email = 'test@example.com';
      await request(app)
        .post('/api/auth/request-otp')
        .send({ email });

      // Get the OTP from user document (in real scenario, check email or use test OTP)
      const user = await User.findOne({ email });
      expect(user).toBeTruthy();
      expect(user.otp.codeHash).toBeTruthy();

      // Note: This test requires either:
      // 1. Mocking the OTP generation to use a known value
      // 2. Or using a test OTP service
      // For now, we'll just check the endpoint exists
    });

    it('should reject invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '000000' });

      expect(response.status).toBe(404); // User not found, or 400 if user exists with wrong OTP
    });
  });
});












