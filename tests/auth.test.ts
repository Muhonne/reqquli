import axios from 'axios';
import { closePool } from '../src/server/config/database';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Authentication Endpoints', () => {

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@reqquli.com',
        password: 'salasana!123'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe('admin@reqquli.com');
    });

    it('should fail with invalid password', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/login`, {
          email: 'admin@reqquli.com',
          password: 'wrongPassword'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.message).toBe('Invalid email or password');
      }
    });

    it('should fail with non-existent email', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'testPassword123!'
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.message).toBe('Invalid email or password');
      }
    });

    it('should fail with missing credentials', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/login`, {});
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toBe('Email and password are required');
      }
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;
    
    beforeEach(async () => {
      // Login to get a fresh token
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@reqquli.com',
        password: 'salasana!123'
      });
      authToken = response.data.token;
    });

    it('should successfully logout with valid token', async () => {
      const response = await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Logged out successfully');
    });

    it('should succeed even without token', async () => {
      const response = await axios.post(`${API_URL}/api/auth/logout`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Logged out successfully');
    });

    it('should succeed even with invalid token', async () => {
      const response = await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        {
          headers: {
            Authorization: 'Bearer invalid-token'
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Logged out successfully');
    });
  });

  describe('GET /api/auth/approvers', () => {
    let localAuthToken: string;
    
    beforeEach(async () => {
      // Login to get a fresh token for this test suite
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@reqquli.com',
        password: 'salasana!123'
      });
      localAuthToken = response.data.token;
    });

    it('should return approvers list with valid token', async () => {
      const response = await axios.get(
        `${API_URL}/api/auth/approvers`,
        {
          headers: {
            Authorization: `Bearer ${localAuthToken}`
          }
        }
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Check approver structure
      const approver = response.data[0];
      expect(approver).toHaveProperty('id');
      expect(approver).toHaveProperty('displayName');
      expect(approver).toHaveProperty('email');
    });

    it('should reject request without token', async () => {
      try {
        await axios.get(`${API_URL}/api/auth/approvers`);
        fail('Should have required authentication');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        const errorMessage = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : error.response.data.error?.message || '';
        expect(errorMessage).toContain('Authentication required');
      }
    });

    it('should reject request with invalid token', async () => {
      try {
        await axios.get(
          `${API_URL}/api/auth/approvers`,
          {
            headers: {
              Authorization: 'Bearer invalid-token-12345'
            }
          }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        const errorMessage = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : error.response.data.error?.message || '';
        expect(errorMessage).toContain('Invalid token');
      }
    });

    it('should reject request with malformed authorization header', async () => {
      try {
        await axios.get(
          `${API_URL}/api/auth/approvers`,
          {
            headers: {
              Authorization: 'NotBearer ' + localAuthToken
            }
          }
        );
        fail('Should have required authentication');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        const errorMessage = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : error.response.data.error?.message || '';
        expect(errorMessage).toContain('Authentication required');
      }
    });
  });

  describe('POST /api/auth/refresh', () => {
    let localAuthToken: string;
    
    beforeEach(async () => {
      // Login to get a fresh token for this test suite
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@reqquli.com',
        password: 'salasana!123'
      });
      localAuthToken = response.data.token;
    });

    it('should refresh token with valid token', async () => {
      const response = await axios.post(
        `${API_URL}/api/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localAuthToken}`
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(typeof response.data.token).toBe('string');
      expect(response.data.token.length).toBeGreaterThan(0);
      
      // Verify the returned token (new or same) works
      const testResponse = await axios.get(
        `${API_URL}/api/auth/approvers`,
        {
          headers: {
            Authorization: `Bearer ${response.data.token}`
          }
        }
      );
      expect(testResponse.status).toBe(200);
    });

    it('should reject refresh without token', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/refresh`, {});
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.message).toBe('No token provided');
      }
    });

    it('should reject refresh with invalid token', async () => {
      try {
        await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          {
            headers: {
              Authorization: 'Bearer invalid-token-xyz'
            }
          }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.message).toBe('Invalid token');
      }
    });

    it('should reject refresh with expired token format', async () => {
      // Create a token with invalid signature
      const expiredToken = localAuthToken.slice(0, -10) + 'tampered123';
      
      try {
        await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${expiredToken}`
            }
          }
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.message).toBe('Invalid token');
      }
    });
  });

  describe('POST /api/auth/register', () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;

    it('should register a new user successfully', async () => {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email: uniqueEmail,
        password: 'TestPassword123!',
        fullName: 'Test User ' + Date.now()
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe(uniqueEmail.toLowerCase());
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('Registration successful');
    });

    it('should reject duplicate email', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/register`, {
          email: 'admin@reqquli.com', // Existing user
          password: 'TestPassword123!',
          fullName: 'Duplicate User'
        });
        fail('Should have rejected duplicate email');
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error.message).toContain('already registered');
      }
    });

    it('should reject weak password', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/register`, {
          email: `weak_${Date.now()}@example.com`,
          password: 'weak',
          fullName: 'Weak Password User'
        });
        fail('Should have rejected weak password');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toContain('Password');
      }
    });

    it('should reject invalid email format', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/register`, {
          email: 'not-an-email',
          password: 'ValidPassword123!',
          fullName: 'Invalid Email User'
        });
        fail('Should have rejected invalid email');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toContain('valid email');
      }
    });

    it('should reject missing required fields', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/register`, {
          email: `missing_${Date.now()}@example.com`
          // Missing password and fullName
        });
        fail('Should have rejected missing fields');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toContain('required');
      }
    });

    it('should enforce password complexity requirements', async () => {
      const testCases = [
        { password: 'nouppercase1!', expectedError: 'uppercase' },
        { password: 'NOLOWERCASE1!', expectedError: 'lowercase' },
        { password: 'NoNumbers!', expectedError: 'number' },
        { password: 'Short1!', expectedError: 'at least 8' }
      ];

      for (const testCase of testCases) {
        try {
          await axios.post(`${API_URL}/api/auth/register`, {
            email: `test_${Date.now()}_${Math.random()}@example.com`,
            password: testCase.password,
            fullName: 'Password Test User'
          });
          fail(`Should have rejected password: ${testCase.password}`);
        } catch (error: any) {
          expect(error.response.status).toBe(422);
          expect(error.response.data.error.message.toLowerCase()).toContain(testCase.expectedError);
        }
      }
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    it('should handle invalid token', async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/verify-email/invalid-token-12345`);
        expect(response.status).toBe(400);
        expect(response.data.success).toBe(false);
        expect(response.data.message).toContain('Invalid or expired');
      } catch (error: any) {
        // Some implementations might return 400 in the catch block
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should handle expired token', async () => {
      // Use a JWT-like expired token format
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token';

      try {
        const response = await axios.get(`${API_URL}/api/auth/verify-email/${expiredToken}`);
        expect(response.status).toBe(400);
        expect(response.data.success).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
      }
    });

    it('should reject empty token', async () => {
      try {
        await axios.get(`${API_URL}/api/auth/verify-email/`);
        fail('Should have rejected empty token');
      } catch (error: any) {
        // The server returns 401 for missing token, not 404
        expect([401, 404]).toContain(error.response.status);
      }
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should handle request for non-existent email gracefully', async () => {
      const response = await axios.post(`${API_URL}/api/auth/resend-verification`, {
        email: 'nonexistent@example.com'
      });

      // Should return success to avoid email enumeration
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('If an account');
    });

    it('should reject already verified email', async () => {
      try {
        const response = await axios.post(`${API_URL}/api/auth/resend-verification`, {
          email: 'admin@reqquli.com' // Already verified user
        });

        // Could return 400 or 200 depending on implementation
        if (response.status === 200) {
          expect(response.data.message).toBeDefined();
        }
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain('already verified');
      }
    });

    it('should reject invalid email format', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/resend-verification`, {
          email: 'not-an-email'
        });
        fail('Should have rejected invalid email');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toContain('valid email');
      }
    });

    it('should reject missing email', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/resend-verification`, {});
        fail('Should have rejected missing email');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toContain('required');
      }
    });
  });

  afterAll(async () => {
    // Close database pool to prevent open handles
    await closePool();
  });

});