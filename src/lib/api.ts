// Cloudflare Workers API 客户端

// 环境变量配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-worker.your-subdomain.workers.dev'

// 类型定义
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
  type: 'positive' | 'negative'
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
  recorded_by?: string
  is_verified?: boolean
  verification_required?: boolean
  verified_by?: string
  verified_at?: string
  family_id?: string
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
  status?: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approval_note?: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: 'parent' | 'guardian'
  permissions: string[]
  created_at: string
  updated_at: string
  joined_at: string
  user: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthResponse {
  user: User
  token: string
  expires_at: string
}

// Token 管理
class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly EXPIRES_KEY = 'auth_expires'

  static getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static setToken(token: string, expiresAt: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.TOKEN_KEY, token)
    localStorage.setItem(this.EXPIRES_KEY, expiresAt)
  }

  static removeToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.EXPIRES_KEY)
  }

  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true
    const expiresAt = localStorage.getItem(this.EXPIRES_KEY)
    if (!expiresAt) return true
    return new Date() >= new Date(expiresAt)
  }

  static shouldRefreshToken(): boolean {
    if (typeof window === 'undefined') return false
    const expiresAt = localStorage.getItem(this.EXPIRES_KEY)
    if (!expiresAt) return false
    // 如果距离过期时间少于5分钟，则刷新token
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
    return fiveMinutesFromNow >= new Date(expiresAt)
  }
}

// HTTP 客户端
class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const token = TokenManager.getToken()

    // 检查是否需要刷新token
    if (token && TokenManager.shouldRefreshToken()) {
      try {
        await this.refreshToken()
      } catch (error) {
        console.warn('Token refresh failed:', error)
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // 添加认证头
    if (token && !TokenManager.isTokenExpired()) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        // 如果是401错误，清除token并抛出错误
        if (response.status === 401) {
          TokenManager.removeToken()
        }
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // 认证相关方法
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (response.success && response.data) {
      TokenManager.setToken(response.data.token, response.data.expires_at)
      return response.data
    }

    throw new Error(response.error || 'Login failed')
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })

    if (response.success && response.data) {
      TokenManager.setToken(response.data.token, response.data.expires_at)
      return response.data
    }

    throw new Error(response.error || 'Registration failed')
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    })

    if (response.success && response.data) {
      TokenManager.setToken(response.data.token, response.data.expires_at)
      return response.data
    }

    throw new Error(response.error || 'Token refresh failed')
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>('/auth/me')

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get current user')
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      })
    } finally {
      TokenManager.removeToken()
    }
  }

  async getMe(): Promise<User> {
    const response = await this.request<User>('/api/auth/me')

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get user profile')
  }

  async getProfile(): Promise<User> {
    return this.getMe()
  }

  // 用户相关方法
  async updateProfile(updates: { name?: string; avatar_url?: string }): Promise<User> {
    const response = await this.request<User>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to update profile')
  }

  async getUser(id: string): Promise<User> {
    const response = await this.request<User>(`/api/users/${id}`)

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get user')
  }

  // 家庭相关方法
  async createFamily(familyData: { name: string; description?: string }): Promise<Family> {
    const response = await this.request<Family>('/api/families', {
      method: 'POST',
      body: JSON.stringify(familyData),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to create family')
  }

  async getFamilies(): Promise<Family[]> {
    const response = await this.request<Family[]>('/api/families')

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get families')
  }

  async getFamily(id: string): Promise<Family> {
    const response = await this.request<Family>(`/api/families/${id}`)

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get family')
  }

  async updateFamily(id: string, updates: { name?: string; description?: string; invite_code?: string }): Promise<Family> {
    const response = await this.request<Family>(`/api/families/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to update family')
  }

  async joinFamily(inviteCode: string): Promise<Family> {
    const response = await this.request<Family>('/api/families/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to join family')
  }



  // 儿童相关方法
  async getChildren(familyId?: string): Promise<Child[]> {
    const url = familyId ? `/api/children?family_id=${familyId}` : '/api/children'
    const response = await this.request<Child[]>(url)

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get children')
  }

  async createChild(childData: { name: string; birth_date?: string; avatar_url?: string }): Promise<Child> {
    const response = await this.request<Child>('/api/children', {
      method: 'POST',
      body: JSON.stringify(childData),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to create child')
  }

  async updateChild(id: string, updates: { name?: string; birth_date?: string; avatar_url?: string }): Promise<Child> {
    const response = await this.request<Child>(`/api/children/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to update child')
  }

  async deleteChild(id: string): Promise<void> {
    const response = await this.request(`/api/children/${id}`, {
      method: 'DELETE',
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete child')
    }
  }

  // 规则相关方法
  async getRules(familyId?: string): Promise<Rule[]> {
    const url = familyId ? `/api/rules?family_id=${familyId}` : '/api/rules'
    const response = await this.request<Rule[]>(url)

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get rules')
  }

  async createRule(ruleData: { name: string; description?: string; type: 'positive' | 'negative'; category: string; points: number }): Promise<Rule> {
    const response = await this.request<Rule>('/api/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to create rule')
  }

  async updateRule(id: string, updates: { name?: string; description?: string; type?: 'positive' | 'negative'; category?: string; points?: number; is_active?: boolean }): Promise<Rule> {
    const response = await this.request<Rule>(`/api/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to update rule')
  }

  async deleteRule(id: string): Promise<void> {
    const response = await this.request(`/api/rules/${id}`, {
      method: 'DELETE',
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete rule')
    }
  }

  // 行为记录相关方法
  async getBehaviors(familyId?: string, filters?: { verified?: boolean }): Promise<Behavior[]> {
    let url = familyId ? `/api/behaviors?family_id=${familyId}` : '/api/behaviors'
    if (filters?.verified !== undefined) {
      url += `${familyId ? '&' : '?'}verified=${filters.verified}`
    }
    const response = await this.request<Behavior[]>(url)

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get behaviors')
  }

  async createBehavior(behaviorData: { child_id: string; rule_id: string; notes?: string; image_urls?: string[] }): Promise<Behavior> {
    const response = await this.request<Behavior>('/api/behaviors', {
      method: 'POST',
      body: JSON.stringify(behaviorData),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to create behavior')
  }

  async updateBehavior(id: string, updates: { notes?: string; image_urls?: string[]; description?: string; points?: number; category?: string; is_verified?: boolean; verified_by?: string | null }): Promise<Behavior> {
    const response = await this.request<Behavior>(`/api/behaviors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to update behavior')
  }

  async deleteBehavior(id: string): Promise<void> {
    const response = await this.request(`/api/behaviors/${id}`, {
      method: 'DELETE',
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete behavior')
    }
  }

  // 奖励相关方法
  async getRewards(familyId?: string): Promise<Reward[]> {
    const url = familyId ? `/api/rewards?family_id=${familyId}` : '/api/rewards'
    const response = await this.request<Reward[]>(url)

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to get rewards')
  }

  async createReward(rewardData: { name: string; description?: string; points_required: number; category?: string }): Promise<Reward> {
    const response = await this.request<Reward>('/api/rewards', {
      method: 'POST',
      body: JSON.stringify(rewardData),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to create reward')
  }

  async updateReward(id: string, updates: { name?: string; description?: string; points_required?: number; category?: string; is_active?: boolean; status?: string; approved_by?: string; approval_note?: string }): Promise<Reward> {
    const response = await this.request<Reward>(`/api/rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error(response.error || 'Failed to update reward')
  }

  async deleteReward(id: string): Promise<void> {
    const response = await this.request(`/api/rewards/${id}`, {
      method: 'DELETE',
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete reward')
    }
  }

  // Behavior Images
  async createBehaviorImage(behaviorImage: {
    behavior_id: string
    image_url: string
    storage_path: string
    uploaded_by?: string
  }): Promise<any> {
    const response = await this.request('/api/behavior-images', {
      method: 'POST',
      body: JSON.stringify(behaviorImage)
    })
    return response.data
  }

  // 家庭成员管理相关方法
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    const response = await this.request(`/api/families/${familyId}/members`)
    return response.data
  }

  async inviteFamilyMember(familyId: string, email: string, role: 'parent' | 'guardian', permissions: string[]): Promise<FamilyMember> {
    const response = await this.request(`/api/families/${familyId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role, permissions })
    })
    return response.data
  }

  async updateFamilyMemberRole(familyId: string, memberId: string, role: 'parent' | 'guardian' | 'member', permissions: string[]): Promise<FamilyMember> {
    const response = await this.request(`/api/families/${familyId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role, permissions })
    })
    return response.data
  }

  async removeFamilyMember(familyId: string, memberId: string): Promise<void> {
    await this.request(`/api/families/${familyId}/members/${memberId}`, {
      method: 'DELETE'
    })
  }

  async generateFamilyInviteCode(familyId: string): Promise<{ invite_code: string }> {
    const response = await this.request(`/api/families/${familyId}/invite-code`, {
      method: 'POST'
    })
    return response.data
  }



  // 文件上传方法
  async uploadFile(file: File, path?: string): Promise<{ url: string; path: string }> {
    const formData = new FormData()
    formData.append('file', file)
    if (path) {
      formData.append('path', path)
    }

    const token = TokenManager.getToken()
    const headers: HeadersInit = {}
    
    if (token && !TokenManager.isTokenExpired()) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed')
    }

    if (data.success && data.data) {
      return data.data
    }

    throw new Error(data.error || 'Upload failed')
  }

  // 文件删除方法
  async deleteFile(path: string): Promise<void> {
    const response = await this.request(`/api/files/${encodeURIComponent(path)}`, {
      method: 'DELETE',
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete file')
    }
  }
}

// 创建全局 API 客户端实例
export const apiClient = new ApiClient()

// 认证状态管理
export const auth = {
  isAuthenticated: (): boolean => {
    const token = TokenManager.getToken()
    return token !== null && !TokenManager.isTokenExpired()
  },

  getToken: (): string | null => {
    return TokenManager.getToken()
  },

  logout: (): void => {
    TokenManager.removeToken()
  },

  // 监听认证状态变化的回调函数列表
  listeners: new Set<(isAuthenticated: boolean) => void>(),

  // 添加认证状态监听器
  onAuthStateChange: (callback: (isAuthenticated: boolean) => void) => {
    auth.listeners.add(callback)
    return () => auth.listeners.delete(callback)
  },

  // 触发认证状态变化事件
  notifyAuthStateChange: (isAuthenticated: boolean) => {
    auth.listeners.forEach(callback => callback(isAuthenticated))
  },

  // 清除认证状态
  clearAuth: (): void => {
    auth.logout()
  },

  // 清除所有认证状态监听器
  clearAuthStateListeners: (): void => {
    auth.listeners.clear()
  },
}

// 在token变化时通知监听器
const originalSetToken = TokenManager.setToken
TokenManager.setToken = (token: string, expiresAt: string) => {
  originalSetToken.call(TokenManager, token, expiresAt)
  auth.notifyAuthStateChange(true)
}

const originalRemoveToken = TokenManager.removeToken
TokenManager.removeToken = () => {
  originalRemoveToken.call(TokenManager)
  auth.notifyAuthStateChange(false)
}