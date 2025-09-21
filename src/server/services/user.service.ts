import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../config/database';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCheckResult {
  email: boolean;
  fullName: boolean;
}

export class UserService {
  async createUser(data: { email: string; password: string; fullName: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const query = `
      INSERT INTO users (email, password_hash, full_name, email_verified)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, password_hash AS "passwordHash", full_name AS "fullName",
               email_verified AS "emailVerified", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    
    const values = [
      data.email.toLowerCase(),
      hashedPassword,
      data.fullName,
      false
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async checkUserExists(email: string, fullName: string): Promise<UserCheckResult> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE LOWER(email) = LOWER($1)) as email_count,
        COUNT(*) FILTER (WHERE LOWER(full_name) = LOWER($2)) as name_count
      FROM users
    `;
    
    const result = await pool.query(query, [email, fullName]);
    const row = result.rows[0];
    
    return {
      email: parseInt(row.email_count) > 0,
      fullName: parseInt(row.name_count) > 0
    };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash AS "passwordHash", full_name AS "fullName",
             email_verified AS "emailVerified", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `;
    
    const result = await pool.query(query, [email]);
    const user = result.rows[0];
    if (!user) {return null;}
    return user;
  }

  async findUserForLogin(email: string): Promise<User | null> {
    return this.findUserByEmail(email);
  }

  async createVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const query = `
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING token
    `;
    
    await pool.query(query, [userId, token, expiresAt]);
    return token;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; user?: { id: string; email: string; fullName: string; } }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const tokenQuery = `
        SELECT evt.*, u.id as "userId", u.email, u.full_name AS "fullName", u.email_verified AS "emailVerified"
        FROM email_verification_tokens evt
        JOIN users u ON evt.user_id = u.id
        WHERE evt.token = $1 AND evt.expires_at > NOW()
      `;
      
      const tokenResult = await client.query(tokenQuery, [token]);
      
      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Invalid or expired verification token' };
      }
      
      const tokenData = tokenResult.rows[0];
      
      if (tokenData.emailVerified) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Email already verified' };
      }
      
      const updateQuery = `
        UPDATE users
        SET email_verified = true, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [tokenData.userId]);
      
      const deleteTokenQuery = `
        DELETE FROM email_verification_tokens
        WHERE token = $1
      `;
      
      await client.query(deleteTokenQuery, [token]);
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          id: tokenData.userId,
          email: tokenData.email,
          fullName: tokenData.fullName
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllVerifiedUsers(): Promise<Partial<User>[]> {
    const query = `
      SELECT id, email, full_name AS "fullName"
      FROM users
      WHERE email_verified = true
      ORDER BY full_name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async blacklistToken(jti: string, userId: string, expiresAt: Date): Promise<void> {
    const query = `
      INSERT INTO token_blacklist (token_jti, user_id, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (token_jti) DO NOTHING
    `;
    
    await pool.query(query, [jti, userId, expiresAt]);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM token_blacklist
      WHERE token_jti = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [jti]);
    return result.rows.length > 0;
  }

  async cleanupExpiredTokens(): Promise<void> {
    const queries = [
      'DELETE FROM email_verification_tokens WHERE expires_at < NOW()',
      'DELETE FROM token_blacklist WHERE expires_at < NOW()'
    ];
    
    for (const query of queries) {
      await pool.query(query);
    }
  }
}

export const userService = new UserService();