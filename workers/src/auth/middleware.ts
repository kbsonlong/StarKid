import { Middleware } from '../types'
import { verifyToken, extractBearerToken } from './jwt'
import { createUnauthorizedResponse } from '../utils/response'
import { getUserById } from './queries'
import { createDatabase } from '../db'

/**
 * 认证中间件
 */
export const authMiddleware: Middleware = async (ctx, next) => {
  const { request, env } = ctx
  
  // 提取 Authorization 头
  const authHeader = request.headers.get('Authorization')
  const token = extractBearerToken(authHeader)
  
  if (!token) {
    return createUnauthorizedResponse('Missing authorization token')
  }
  
  // 验证 JWT Token
  const payload = verifyToken(token, env.JWT_SECRET)
  if (!payload) {
    return createUnauthorizedResponse('Invalid or expired token')
  }
  
  // 从数据库获取用户信息
  const db = createDatabase(env)
  const user = await getUserById(db, payload.userId)
  
  if (!user) {
    return createUnauthorizedResponse('User not found')
  }
  
  // 将用户信息添加到上下文
  ctx.user = user
  
  return next()
}

/**
 * 可选认证中间件 (用户可能已登录也可能未登录)
 */
export const optionalAuthMiddleware: Middleware = async (ctx, next) => {
  const { request, env } = ctx
  
  // 提取 Authorization 头
  const authHeader = request.headers.get('Authorization')
  const token = extractBearerToken(authHeader)
  
  if (token) {
    // 验证 JWT Token
    const payload = verifyToken(token, env.JWT_SECRET)
    if (payload) {
      // 从数据库获取用户信息
      const db = createDatabase(env)
      const user = await getUserById(db, payload.userId)
      if (user) {
        ctx.user = user
      }
    }
  }
  
  return next()
}

/**
 * 角色检查中间件
 */
export function requireRole(allowedRoles: string[]): Middleware {
  return async (ctx, next) => {
    if (!ctx.user) {
      return createUnauthorizedResponse('Authentication required')
    }
    
    if (!allowedRoles.includes(ctx.user.role)) {
      return createUnauthorizedResponse('Insufficient permissions')
    }
    
    return next()
  }
}

/**
 * 家长权限检查中间件
 */
export const requireParent: Middleware = requireRole(['parent'])

/**
 * 儿童权限检查中间件
 */
export const requireChild: Middleware = requireRole(['child'])