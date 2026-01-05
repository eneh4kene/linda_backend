import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    facilityId: string | null;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  facilityId: string | null;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        facilityId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check if user has required role(s)
 */
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user has access to a specific facility
 */
export function checkFacilityAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // ADMINs have access to all facilities
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Extract facilityId from params, query, or body
  const facilityId = req.params.facilityId || req.query.facilityId || req.body.facilityId;

  if (!facilityId) {
    return res.status(400).json({ error: 'Facility ID required' });
  }

  if (req.user.facilityId !== facilityId) {
    return res.status(403).json({ error: 'Access to this facility denied' });
  }

  next();
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: { id: string; email: string; role: string; facilityId: string | null }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    facilityId: user.facilityId,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        facilityId: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        facilityId: user.facilityId,
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just proceed without user
    next();
  }
}
