// 环境变量类型定义
export interface Env {
  DB: D1Database
  R2_BUCKET: R2Bucket
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
  ENVIRONMENT: string
  CORS_ORIGIN: string
  MAX_FILE_SIZE: string
  ALLOWED_FILE_TYPES: string
}

// 用户相关类型
export interface User {
  id: string
  email: string
  name: string
  role: 'parent' | 'child'
  avatar_url?: string
  created_at: string
  updated_at: string
}

// JWT Payload 类型
export interface JWTPayload {
  userId: string
  email: string
  role: 'parent' | 'child'
  familyId?: string
  iat: number
  exp: number
}

// 家庭相关类型
export interface Family {
  id: string
  creator_id: string
  name: string
  invite_code: string
  description?: string
  created_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: 'parent' | 'guardian'
  permissions?: string
  joined_at: string
}

// 儿童相关类型
export interface Child {
  id: string
  family_id: string
  name: string
  birth_date?: string
  avatar_url?: string
  total_points: number
  points: number
  child_invite_code?: string
  created_at: string
}

// 规则相关类型
export interface Rule {
  id: string
  family_id: string
  type: 'reward' | 'punishment'
  category: string
  name: string
  points: number
  description?: string
  created_by: string
  requires_approval: boolean
  is_active: boolean
  created_at: string
}

// 行为记录相关类型
export interface Behavior {
  id: string
  child_id: string
  rule_id: string
  points_change: number
  notes?: string
  recorded_by: string
  is_verified: boolean
  verification_required: boolean
  verified_by?: string
  verified_at?: string
  has_image: boolean
  family_id: string
  created_at: string
}

// 奖励相关类型
export interface Reward {
  id: string
  family_id: string
  name: string
  points_required: number
  description?: string
  is_active: boolean
  created_at: string
}

export interface RewardRedemption {
  id: string
  child_id: string
  reward_id: string
  points_spent: number
  status: 'pending' | 'approved' | 'completed'
  approved_by?: string
  approved_at?: string
  completed_at?: string
  created_at: string
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

// 请求上下文类型
export interface RequestContext {
  request: Request
  env: Env
  user?: User
  params?: Record<string, string>
}

// 中间件类型
export type Middleware = (
  ctx: RequestContext,
  next: () => Promise<Response>
) => Promise<Response>

export type Handler = (ctx: RequestContext) => Promise<Response>

// 数据库查询结果类型
export interface QueryResult<T = any> {
  success: boolean
  results?: T[]
  meta?: {
    served_by: string
    duration: number
    changes: number
    last_row_id: number
    rows_read: number
    rows_written: number
  }
}