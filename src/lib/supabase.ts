// Cloudflare Workers API 配置文件
// 这个文件现在用于配置 Cloudflare Workers API 连接

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!apiBaseUrl) {
  throw new Error('Missing API base URL environment variable')
}

export const config = {
  apiBaseUrl,
  // 其他配置选项可以在这里添加
  timeout: 30000, // 30秒超时
  retryAttempts: 3,
}

// 数据库表类型定义
export interface User {
  id: string
  email: string
  name: string
  role: 'parent' | 'child'
  family_id?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  creator_id: string
  name: string
  description?: string
  invite_code: string
  created_at: string
  children?: Child[]
}

export interface Child {
  id: string
  family_id: string
  name: string
  birth_date: string
  avatar_url?: string
  total_points: number
  points: number
  child_invite_code?: string
  created_at: string
}

export interface Rule {
  id: string
  family_id: string
  type: 'reward' | 'punishment'
  category: string
  name: string
  points: number
  icon: string
  description: string
  is_active: boolean
  created_at: string
}

export interface Behavior {
  id: string
  child_id: string
  rule_id: string
  notes?: string
  points_change: number
  has_image?: boolean
  created_at: string
  rules?: Rule
  children?: Child
  behavior_images?: BehaviorImage[]
}

export interface BehaviorImage {
  id: string
  behavior_id: string
  image_url: string
  storage_path: string
  created_at: string
}

export interface Reward {
  id: string
  family_id: string
  name: string
  description?: string
  type: 'physical' | 'experience' | 'privilege'
  category: string
  points_required: number
  is_active: boolean
  created_at: string
  updated_at: string
}