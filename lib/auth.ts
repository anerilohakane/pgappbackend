import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pg_jwt_key_2026_secured';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'resident';
  name: string;
  residentId?: string;
  propertyId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function extractAuthUser(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // Also support ?token= in URL query params for direct browser downloads (e.g. Excel exports, PDF receipts)
  try {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      return verifyToken(queryToken);
    }
  } catch (e) {
    // ignore
  }

  return null;
}

export function requireAuth(req: NextRequest, roles?: ('admin' | 'resident')[]): { user: TokenPayload } | { error: string; status: number } {
  const user = extractAuthUser(req);
  if (!user) {
    return { error: 'Authentication required. Please login.', status: 401 };
  }
  if (roles && !roles.includes(user.role)) {
    return { error: 'Access denied: insufficient permissions.', status: 403 };
  }
  return { user };
}
