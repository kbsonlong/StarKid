import bcrypt from 'bcryptjs'
import { RequestContext } from '../types'
import { createDatabase, generateId, formatDate } from '../db'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
} from '../utils/response'
import { generateToken } from '../utils/jwt'
import {
  getUserByEmail,
  getUserWithPasswordByEmail,
  createUser,
  emailExists,
} from './queries'

/**
 * 处理认证相关路由
 */
export async function handleAuthRoutes(ctx: RequestContext): Promise<Response> {
  const { request } = ctx
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // 注册
  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(ctx)
  }

  // 登录
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(ctx)
  }

  // 获取当前用户信息
  if (path === '/api/auth/me' && method === 'GET') {
    return handleGetMe(ctx)
  }

  // 刷新 Token
  if (path === '/api/auth/refresh' && method === 'POST') {
    return handleRefreshToken(ctx)
  }

  return createErrorResponse('NOT_FOUND', 'Auth route not found', 404)
}

/**
 * 用户注册
 */
async function handleRegister(ctx: RequestContext): Promise<Response> {
  try {
    const { email, password, name, role = 'parent' } = await ctx.request.json()

    // 验证输入
    if (!email || !password || !name) {
      return createValidationErrorResponse('Email, password, and name are required')
    }

    if (password.length < 6) {
      return createValidationErrorResponse('Password must be at least 6 characters')
    }

    if (!['parent', 'child'].includes(role)) {
      return createValidationErrorResponse('Role must be either parent or child')
    }

    const db = createDatabase(ctx.env)

    // 检查邮箱是否已存在
    if (await emailExists(db, email)) {
      return createErrorResponse('EMAIL_EXISTS', 'Email already registered', 409)
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
    const userId = generateId()
    const success = await createUser(db, {
      id: userId,
      email,
      name,
      password_hash: passwordHash,
      role,
    })

    if (!success) {
      return createErrorResponse('REGISTRATION_FAILED', 'Failed to create user', 500)
    }

    // 获取创建的用户信息
    const user = await getUserByEmail(db, email)
    if (!user) {
      return createErrorResponse('USER_NOT_FOUND', 'User creation failed', 500)
    }

    // 生成 JWT Token
    const token = generateToken(user, ctx.env.JWT_SECRET, ctx.env.JWT_EXPIRES_IN)

    return createSuccessResponse({
      user,
      token,
    }, 201)
  } catch (error) {
    console.error('Registration error:', error)
    return createErrorResponse('REGISTRATION_ERROR', 'Registration failed', 500)
  }
}

/**
 * 用户登录
 */
async function handleLogin(ctx: RequestContext): Promise<Response> {
  try {
    const { email, password } = await ctx.request.json()

    // 验证输入
    if (!email || !password) {
      return createValidationErrorResponse('Email and password are required')
    }

    const db = createDatabase(ctx.env)

    // 获取用户信息（包含密码）
    const userWithPassword = await getUserWithPasswordByEmail(db, email)
    if (!userWithPassword) {
      return createErrorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401)
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, userWithPassword.password_hash)
    if (!isPasswordValid) {
      return createErrorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401)
    }

    // 移除密码字段
    const { password_hash, ...user } = userWithPassword

    // 生成 JWT Token
    const token = generateToken(user, ctx.env.JWT_SECRET, ctx.env.JWT_EXPIRES_IN)

    return createSuccessResponse({
      user,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse('LOGIN_ERROR', 'Login failed', 500)
  }
}

/**
 * 获取当前用户信息
 */
async function handleGetMe(ctx: RequestContext): Promise<Response> {
  // 这个路由需要认证，但由于它在 /api/auth 下，不会自动应用认证中间件
  // 所以需要手动检查认证
  const authHeader = ctx.request.headers.get('Authorization')
  if (!authHeader) {
    return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  // 这里可以复用认证中间件的逻辑，或者简化处理
  // 为了简化，假设前端会在有效的认证状态下调用此接口
  return createErrorResponse('NOT_IMPLEMENTED', 'Use /api/user/profile instead', 501)
}

/**
 * 刷新 Token
 */
async function handleRefreshToken(ctx: RequestContext): Promise<Response> {
  // Token 刷新逻辑
  return createErrorResponse('NOT_IMPLEMENTED', 'Token refresh not implemented yet', 501)
}