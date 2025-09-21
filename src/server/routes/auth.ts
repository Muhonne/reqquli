import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userService } from '../services/user.service';
import { emailService } from '../services/email.service';
import { JWT_SECRET } from '../config/jwt.config';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import {
  RegisterRequest,
  RegisterResponse,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse
} from '../../types';
import {
  badRequest,
  unauthorized,
  conflict,
  unprocessableEntity,
  internalServerError
} from '../utils/responses';

const router = express.Router();

// Validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};


// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName }: RegisterRequest = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return unprocessableEntity(res, 'Email, password, and full name are required');
    }

    // Validate email format
    if (!validateEmail(email)) {
      return unprocessableEntity(res, 'Please provide a valid email address');
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return unprocessableEntity(res, passwordValidation.message || 'Invalid password');
    }

    // Validate full name
    if (fullName.trim().length < 2) {
      return unprocessableEntity(res, 'Full name must be at least 2 characters long');
    }

    // Check if user already exists
    const existingUser = await userService.checkUserExists(email.toLowerCase(), fullName.trim());
    if (existingUser.email) {
      return conflict(res, 'Email is already registered');
    }
    if (existingUser.fullName) {
      return conflict(res, 'Full name is already taken');
    }
    // Create user
    const newUser = await userService.createUser({
      email: email.toLowerCase(),
      password: password,
      fullName: fullName.trim()
    });

    // Create verification token
    const verificationToken = await userService.createVerificationToken(newUser.id);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(newUser.email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    const response: RegisterResponse = {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName
      },
      message: 'Registration successful. Please check your email to verify your account.'
    };

    // Keep original format for backward compatibility
    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error) {
      return badRequest(res, error.message);
    } else {
      return internalServerError(res, 'Registration failed. Please try again.');
    }
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return unprocessableEntity(res, 'Verification token is required');
    }

    const result: VerifyEmailResponse = await userService.verifyEmail(token);

    // Return appropriate status code - keep original format for backward compatibility
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Email verification error:', error);
    return internalServerError(res, 'Email verification failed. Please try again.');
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email }: ResendVerificationRequest = req.body;

    if (!email) {
      return unprocessableEntity(res, 'Email address is required');
    }

    if (!validateEmail(email)) {
      return unprocessableEntity(res, 'Please provide a valid email address');
    }

    // Find user
    const user = await userService.findUserByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal whether email exists - keep original format
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification email will be sent.'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return badRequest(res, 'This email address is already verified.');
    }

    // Create new verification token
    const verificationToken = await userService.createVerificationToken(user.id);

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return internalServerError(res, 'Failed to send verification email. Please try again later.');
    }

    const response: ResendVerificationResponse = {
      success: true,
      message: 'Verification email sent successfully.'
    };

    // Keep original format for backward compatibility
    res.status(200).json(response);
  } catch (error) {
    console.error('Resend verification error:', error);
    return internalServerError(res, 'Failed to resend verification email. Please try again.');
  }
});

// POST /api/auth/login (updated to use database)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return unprocessableEntity(res, 'Email and password are required');
    }

    // Find user in database
    const user = await userService.findUserForLogin(email);
    if (!user) {
      return unauthorized(res, 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return unauthorized(res, 'Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return unauthorized(res, 'Please verify your email address before logging in');
    }

    // Generate JWT token with JTI for tracking
    const jti = require('crypto').randomBytes(16).toString('hex');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        jti
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Log login event
    try {
      await pool.query(
        `SELECT log_audit_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          'Authentication',
          'UserLoggedIn',
          'User',
          user.id,
          user.id,
          JSON.stringify({
            email: user.email,
            timestamp: new Date().toISOString()
          }),
          null,
          req.ip,
          req.headers['user-agent'],
          jti
        ]
      );
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    // Set secure cookie with token
    res.cookie('authToken', token, {
      httpOnly: true,        // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',    // CSRF protection
      maxAge: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
      path: '/',
      domain: process.env.COOKIE_DOMAIN // Set domain if configured
    });

    // Return user info and token (exclude passwordHash)
    // Keep original format for backward compatibility with tests
    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return internalServerError(res);
  }
});

// POST /api/auth/refresh (updated to use database)
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    let token: string | undefined;

    // Check for token in cookies first
    if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    } else {
      // Fall back to Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return unauthorized(res, 'No token provided');
      }
      token = authHeader.substring(7);
    }

    if (!token) {
      return unauthorized(res, 'No token provided');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; jti?: string };
      
      // Verify user still exists and is verified
      const user = await userService.findUserForLogin(decoded.email);
      if (!user) {
        return unauthorized(res, 'User not found');
      }

      // Generate new token
      const newToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email
        },
        JWT_SECRET,
        { expiresIn: '4h' }
      );

      // Set new secure cookie
      res.cookie('authToken', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 4 * 60 * 60 * 1000,
        path: '/',
        domain: process.env.COOKIE_DOMAIN // Set domain if configured
      });

      // Keep original format for backward compatibility
      res.json({ token: newToken });
    } catch {
      return unauthorized(res, 'Invalid token');
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return internalServerError(res);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    let token: string | undefined;
    
    // Check for token in cookies first
    if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    } else {
      // Fall back to Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Clear the auth cookie regardless of token validity
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; jti?: string; exp?: number };

        // Generate JTI from token content for blacklisting
        const jti = Buffer.from(token).toString('base64').substring(0, 255);

        // Calculate token expiration (default to 4 hours if not present)
        const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 4 * 60 * 60 * 1000);
        
        // Blacklist the token
        await userService.blacklistToken(jti, decoded.userId, expiresAt);
      } catch {
        // Token might be invalid, but we still clear the cookie
      }
    }
    
    // Keep original format for backward compatibility
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return internalServerError(res);
  }
});


// GET /api/auth/approvers (updated to use database)
router.get('/approvers', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await userService.getAllVerifiedUsers();
    
    // Return user ID to name mapping for approvers
    const approvers = users.map(user => ({
      id: user.id,
      displayName: user.fullName,
      email: user.email
    }));

    // Keep original format for backward compatibility
    res.json(approvers);
  } catch (error) {
    console.error('Approvers fetch error:', error);
    return internalServerError(res);
  }
});

export default router;