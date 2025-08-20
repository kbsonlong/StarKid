import jwt from 'jsonwebtoken';
import type { JWTPayload, User } from '../types';

/**
 * 生成 JWT 令牌
 * @param user 用户信息
 * @param secret JWT 密钥
 * @param expiresIn 过期时间（默认 7 天）
 * @returns JWT 令牌
 */
export function generateToken(
  user: Omit<User, 'password_hash'>,
  secret: string,
  expiresIn: string = '7d'
): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
    familyId: user.family_id
  };

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * 验证 JWT 令牌
 * @param token JWT 令牌
 * @param secret JWT 密钥
 * @returns 解码后的载荷或 null
 */
export function verifyToken(token: string, secret: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * 从请求头中提取 Bearer 令牌
 * @param authHeader Authorization 头部值
 * @returns 提取的令牌或 null
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * 刷新令牌（生成新的令牌）
 * @param oldToken 旧令牌
 * @param secret JWT 密钥
 * @param expiresIn 新令牌过期时间
 * @returns 新令牌或 null
 */
export function refreshToken(
  oldToken: string,
  secret: string,
  expiresIn: string = '7d'
): string | null {
  const payload = verifyToken(oldToken, secret);
  if (!payload) {
    return null;
  }

  // 创建新的载荷（移除旧的时间戳）
  const newPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    familyId: payload.familyId
  };

  return jwt.sign(newPayload, secret, { expiresIn });
}

/**
 * 检查令牌是否即将过期（1小时内）
 * @param token JWT 令牌
 * @param secret JWT 密钥
 * @returns 是否即将过期
 */
export function isTokenExpiringSoon(token: string, secret: string): boolean {
  const payload = verifyToken(token, secret);
  if (!payload) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  const oneHour = 60 * 60;
  
  return (payload.exp - now) < oneHour;
}