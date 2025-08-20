import { RequestContext, Family, FamilyMember } from '../types'
import { createDatabase, generateId, generateInviteCode, formatDate } from '../db'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
} from '../utils/response'
import { matchPath, parsePathParams } from './index'

/**
 * 处理家庭相关路由
 */
export async function handleFamilyRoutes(ctx: RequestContext): Promise<Response> {
  const { request } = ctx
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // POST /api/families - 创建家庭
  if (matchPath(path, '/api/families') && method === 'POST') {
    return handleCreateFamily(ctx)
  }

  // GET /api/families - 获取用户的家庭列表
  if (matchPath(path, '/api/families') && method === 'GET') {
    return handleGetFamilies(ctx)
  }

  // GET /api/families/:id - 获取家庭详情
  if (matchPath(path, '/api/families/:id') && method === 'GET') {
    ctx.params = parsePathParams(path, '/api/families/:id')
    return handleGetFamily(ctx)
  }

  // PUT /api/families/:id - 更新家庭信息
  if (matchPath(path, '/api/families/:id') && method === 'PUT') {
    ctx.params = parsePathParams(path, '/api/families/:id')
    return handleUpdateFamily(ctx)
  }

  // POST /api/families/join - 加入家庭
  if (matchPath(path, '/api/families/join') && method === 'POST') {
    return handleJoinFamily(ctx)
  }

  // GET /api/families/:id/members - 获取家庭成员
  if (matchPath(path, '/api/families/:id/members') && method === 'GET') {
    ctx.params = parsePathParams(path, '/api/families/:id/members')
    return handleGetFamilyMembers(ctx)
  }

  return createErrorResponse('NOT_FOUND', 'Family route not found', 404)
}

/**
 * 创建家庭
 */
async function handleCreateFamily(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { name, description } = await ctx.request.json()

    if (!name || name.trim().length === 0) {
      return createValidationErrorResponse('Family name is required')
    }

    const db = createDatabase(ctx.env)
    const familyId = generateId()
    const inviteCode = generateInviteCode()

    // 创建家庭
    const createFamilySQL = `
      INSERT INTO families (id, creator_id, name, invite_code, description, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `
    
    const familyResult = await db.execute(createFamilySQL, [
      familyId,
      ctx.user.id,
      name.trim(),
      inviteCode,
      description || null,
    ])

    if (!familyResult.success) {
      return createErrorResponse('CREATE_FAMILY_FAILED', 'Failed to create family', 500)
    }

    // 添加创建者为家庭成员
    const addMemberSQL = `
      INSERT INTO family_members (id, family_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'parent', datetime('now'))
    `
    
    const memberResult = await db.execute(addMemberSQL, [
      generateId(),
      familyId,
      ctx.user.id,
    ])

    if (!memberResult.success) {
      return createErrorResponse('ADD_MEMBER_FAILED', 'Failed to add family member', 500)
    }

    // 获取创建的家庭信息
    const family = await getFamilyById(db, familyId)
    if (!family) {
      return createErrorResponse('FAMILY_NOT_FOUND', 'Family creation failed', 500)
    }

    return createSuccessResponse(family, 201)
  } catch (error) {
    console.error('Create family error:', error)
    return createErrorResponse('CREATE_FAMILY_ERROR', 'Failed to create family', 500)
  }
}

/**
 * 获取用户的家庭列表
 */
async function handleGetFamilies(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const db = createDatabase(ctx.env)
    const sql = `
      SELECT f.id, f.creator_id, f.name, f.invite_code, f.description, f.created_at,
             fm.role as user_role
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      WHERE fm.user_id = ?
      ORDER BY f.created_at DESC
    `

    const result = await db.query(sql, [ctx.user.id])
    if (!result.success) {
      return createErrorResponse('GET_FAMILIES_FAILED', 'Failed to get families', 500)
    }

    return createSuccessResponse(result.results || [])
  } catch (error) {
    console.error('Get families error:', error)
    return createErrorResponse('GET_FAMILIES_ERROR', 'Failed to get families', 500)
  }
}

/**
 * 获取家庭详情
 */
async function handleGetFamily(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const familyId = ctx.params?.id
    if (!familyId) {
      return createValidationErrorResponse('Family ID is required')
    }

    const db = createDatabase(ctx.env)
    
    // 检查用户是否是家庭成员
    const memberCheck = await db.queryFirst(
      'SELECT 1 FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, ctx.user.id]
    )

    if (!memberCheck) {
      return createErrorResponse('FORBIDDEN', 'Access denied', 403)
    }

    const family = await getFamilyById(db, familyId)
    if (!family) {
      return createNotFoundResponse('Family not found')
    }

    return createSuccessResponse(family)
  } catch (error) {
    console.error('Get family error:', error)
    return createErrorResponse('GET_FAMILY_ERROR', 'Failed to get family', 500)
  }
}

/**
 * 更新家庭信息
 */
async function handleUpdateFamily(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const familyId = ctx.params?.id
    if (!familyId) {
      return createValidationErrorResponse('Family ID is required')
    }

    const { name, description } = await ctx.request.json()

    if (!name || name.trim().length === 0) {
      return createValidationErrorResponse('Family name is required')
    }

    const db = createDatabase(ctx.env)
    
    // 检查用户是否是家庭创建者
    const family = await getFamilyById(db, familyId)
    if (!family) {
      return createNotFoundResponse('Family not found')
    }

    if (family.creator_id !== ctx.user.id) {
      return createErrorResponse('FORBIDDEN', 'Only family creator can update family', 403)
    }

    const sql = `
      UPDATE families 
      SET name = ?, description = ?
      WHERE id = ?
    `

    const result = await db.execute(sql, [name.trim(), description || null, familyId])
    if (!result.success) {
      return createErrorResponse('UPDATE_FAMILY_FAILED', 'Failed to update family', 500)
    }

    const updatedFamily = await getFamilyById(db, familyId)
    return createSuccessResponse(updatedFamily)
  } catch (error) {
    console.error('Update family error:', error)
    return createErrorResponse('UPDATE_FAMILY_ERROR', 'Failed to update family', 500)
  }
}

/**
 * 加入家庭
 */
async function handleJoinFamily(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { inviteCode } = await ctx.request.json()

    if (!inviteCode) {
      return createValidationErrorResponse('Invite code is required')
    }

    const db = createDatabase(ctx.env)
    
    // 查找家庭
    const family = await db.queryFirst<Family>(
      'SELECT * FROM families WHERE invite_code = ?',
      [inviteCode]
    )

    if (!family) {
      return createErrorResponse('INVALID_INVITE_CODE', 'Invalid invite code', 404)
    }

    // 检查是否已经是成员
    const existingMember = await db.queryFirst(
      'SELECT 1 FROM family_members WHERE family_id = ? AND user_id = ?',
      [family.id, ctx.user.id]
    )

    if (existingMember) {
      return createErrorResponse('ALREADY_MEMBER', 'Already a member of this family', 409)
    }

    // 添加为家庭成员
    const sql = `
      INSERT INTO family_members (id, family_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'parent', datetime('now'))
    `

    const result = await db.execute(sql, [generateId(), family.id, ctx.user.id])
    if (!result.success) {
      return createErrorResponse('JOIN_FAMILY_FAILED', 'Failed to join family', 500)
    }

    return createSuccessResponse({ family })
  } catch (error) {
    console.error('Join family error:', error)
    return createErrorResponse('JOIN_FAMILY_ERROR', 'Failed to join family', 500)
  }
}

/**
 * 获取家庭成员
 */
async function handleGetFamilyMembers(ctx: RequestContext): Promise<Response> {
  try {
    if (!ctx.user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const familyId = ctx.params?.id
    if (!familyId) {
      return createValidationErrorResponse('Family ID is required')
    }

    const db = createDatabase(ctx.env)
    
    // 检查用户是否是家庭成员
    const memberCheck = await db.queryFirst(
      'SELECT 1 FROM family_members WHERE family_id = ? AND user_id = ?',
      [familyId, ctx.user.id]
    )

    if (!memberCheck) {
      return createErrorResponse('FORBIDDEN', 'Access denied', 403)
    }

    const sql = `
      SELECT fm.id, fm.family_id, fm.user_id, fm.role, fm.joined_at,
             u.name, u.email, u.avatar_url
      FROM family_members fm
      JOIN users u ON fm.user_id = u.id
      WHERE fm.family_id = ?
      ORDER BY fm.joined_at ASC
    `

    const result = await db.query(sql, [familyId])
    if (!result.success) {
      return createErrorResponse('GET_MEMBERS_FAILED', 'Failed to get family members', 500)
    }

    return createSuccessResponse(result.results || [])
  } catch (error) {
    console.error('Get family members error:', error)
    return createErrorResponse('GET_MEMBERS_ERROR', 'Failed to get family members', 500)
  }
}

/**
 * 根据 ID 获取家庭信息
 */
async function getFamilyById(db: any, familyId: string): Promise<Family | null> {
  const sql = `
    SELECT id, creator_id, name, invite_code, description, created_at
    FROM families 
    WHERE id = ?
  `
  return db.queryFirst<Family>(sql, [familyId])
}