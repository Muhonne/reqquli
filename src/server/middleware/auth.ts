import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config';

interface JWTPayload {
  userId: string;
  email: string;
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    jti?: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;
  
  // Check for token in cookies first (more secure)
  if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  } 
  // Fall back to Authorization header for backward compatibility
  else {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    token = authHeader.substring(7).trim();
  }
  
  if (!token || token === 'undefined' || token === 'null' || token === '') {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      jti: decoded.jti
    };
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

