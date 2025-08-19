import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  note?: string
  points: number
  points_change: number
  points_earned: number
  created_at: string
  rules?: Rule
  children?: Child
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