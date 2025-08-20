import { RequestContext } from '../types'
import { createDatabase } from '../db'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
} from '../utils/response'
import { getUserById, updateUser } from '../auth/queries'
import { matchPath, parsePathParams } from './index'

/**
 * 处理用户相关路由
 */
export async function handleUserRoutes(ctx: RequestContext): Promise<Response> {
  const { request } = ctx
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // GET /api/user/profile - 获取当前用户信息
  if (matchPath(path, '/api/user/profile') && method === 'GET') {
    return handleGetProfile(ctx)
  }

  // PUT /api/user/profile - 更新当前用户信息
  if (matchPath(path, '/api/user/profile') && method === 'PUT') {
    return handleUpdateProfile(ctx)
  }

  // GET /api/users/:id - 获取指定用户信息
  if (matchPath(path, '/api/users/:id') && method === 'GET') {
    ctx.params = parsePathParams(path, '/api/users/:id')
    return handleGetUser(ctx)
  }

  return createErrorResponse('NOT_FOUND', 'User route not found', 404)
}

/**
 * 获取当前用户信息
 */
async function handleGetProfile(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    return createSuccessResponse(ctx.user)
  } catch (error) {
    console.error('Get profile error:', error)
    return createErrorResponse('GET_PROFILE_ERROR', 'Failed to get profile', 500)
  }
}

/**
 * 更新当前用户信息
 */
async function handleUpdateProfile(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const updates = await ctx.request.json()
    
    // 验证允许更新的字段
    const allowedFields = ['name', 'avatar_url']
    const filteredUpdates: any = {}
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return createValidationErrorResponse('No valid fields to update')
    }

    // 验证名称
    if (filteredUpdates.name && filteredUpdates.name.trim().length === 0) {
      return createValidationErrorResponse('Name cannot be empty')
    }

    const db = createDatabase(ctx.env)
    const success = await updateUser(db, ctx.user.id, filteredUpdates)

    if (!success) {
      return createErrorResponse('UPDATE_FAILED', 'Failed to update profile', 500)
    }

    // 获取更新后的用户信息
    const updatedUser = await getUserById(db, ctx.user.id)
    if (!updatedUser) {
      return createErrorResponse('USER_NOT_FOUND', 'User not found after update', 500)
    }

    return createSuccessResponse(updatedUser)
  } catch (error) {
    console.error('Update profile error:', error)
    return createErrorResponse('UPDATE_PROFILE_ERROR', 'Failed to update profile', 500)
  }
}

/**
 * 获取指定用户信息
 */
async function handleGetUser(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const userId = ctx.params?.id
    if (!userId) {
      return createValidationErrorResponse('User ID is required')
    }

    const db = createDatabase(ctx.env)
    const user = await getUserById(db, userId)

    if (!user) {
      return createNotFoundResponse('User not found')
    }

    // 只返回公开信息
    const publicUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    }

    return createSuccessResponse(publicUser)
  } catch (error) {
    console.error('Get user error:', error)
    return createErrorResponse('GET_USER_ERROR', 'Failed to get user', 500)
  }
}