import { create } from 'zustand'
import { apiClient, auth, User, Family, Child, Rule, Behavior, Reward } from '../lib/api'

// 新增类型定义
interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: 'parent' | 'guardian'
  permissions: string[]
  created_at: string
  updated_at: string
  user?: {
    name: string
    email: string
    avatar_url?: string
  }
}

interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  requester?: {
    name: string
    avatar_url?: string
  }
  addressee?: {
    name: string
    avatar_url?: string
  }
}

interface Challenge {
  id: string
  title: string
  description: string
  type: 'individual' | 'group'
  difficulty: 'easy' | 'medium' | 'hard'
  points_reward: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

interface ChallengeParticipant {
  id: string
  challenge_id: string
  child_id: string
  status: 'joined' | 'completed' | 'failed'
  progress: number
  completed_at?: string
  child?: {
    name: string
    avatar_url?: string
  }
}

interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  message: string
  message_type: 'text' | 'preset' | 'emoji'
  is_read: boolean
  created_at: string
  sender?: {
    name: string
    avatar_url?: string
  }
}

interface AuthState {
  user: User | null
  family: Family | null
  children: Child[]
  selectedChild: Child | null
  isLoading: boolean
  authListener: any
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  initialize: () => Promise<void>
  cleanup: () => void
  updateProfile: (updates: { name?: string; email?: string; avatar_url?: string }) => Promise<void>
  createFamily: (familyData: { name: string; description?: string }) => Promise<void>
  updateFamily: (updates: { name?: string; description?: string }) => Promise<void>
  joinFamily: (inviteCode: string) => Promise<{ family: Family }>
  addChild: (childData: { name: string; birth_date: string; avatar_url?: string }) => Promise<void>
  updateChild: (id: string, updates: { name?: string; birth_date?: string; avatar_url?: string }) => Promise<void>
  removeChild: (id: string) => Promise<void>
  loadChildren: () => Promise<void>
  setSelectedChild: (child: Child | null) => void
  generateInviteCode: () => Promise<string>
  getJoinRequests: () => Promise<any[]>
  approveJoinRequest: (requestId: string, approved: boolean) => Promise<string>
}

interface RulesState {
  rules: Rule[]
  loading: boolean
  loadRules: () => Promise<void>
  createRule: (rule: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  addRule: (rule: Omit<Rule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateRule: (id: string, updates: Partial<Rule>) => Promise<void>
  deleteRule: (id: string) => Promise<void>
}

interface BehaviorsState {
  behaviors: Behavior[]
  children: Child[]
  loading: boolean
  loadBehaviors: (familyId: string) => Promise<void>
  addBehavior: (behaviorData: Omit<Behavior, 'id' | 'created_at'>) => Promise<Behavior>
  createBehavior: (behaviorData: Omit<Behavior, 'id' | 'created_at'>) => Promise<Behavior>
  updateBehavior: (id: string, updates: Partial<Behavior>) => Promise<void>
  deleteBehavior: (id: string) => Promise<void>
}

interface RewardsState {
  rewards: Reward[]
  loading: boolean
  loadRewards: () => Promise<void>
  createReward: (reward: Omit<Reward, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  addReward: (reward: Omit<Reward, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateReward: (id: string, updates: Partial<Reward>) => Promise<void>
  deleteReward: (id: string) => Promise<void>
  redeemReward: (rewardId: string, childId: string) => Promise<void>
}

// 家庭成员管理状态
interface FamilyMembersState {
  members: FamilyMember[]
  loading: boolean
  loadMembers: (familyId: string) => Promise<void>
  inviteMember: (email: string, role: 'parent' | 'guardian', permissions: string[]) => Promise<void>
  updateMemberRole: (memberId: string, role: 'parent' | 'guardian', permissions: string[]) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  generateInviteCode: () => Promise<string>
}

// 好友系统状态
interface FriendsState {
  friends: Friendship[]
  pendingRequests: Friendship[]
  loading: boolean
  loadFriends: (childId: string) => Promise<void>
  sendFriendRequest: (requesterId: string, addresseeCode: string) => Promise<void>
  respondToFriendRequest: (requestId: string, response: 'accepted' | 'declined') => Promise<void>
  removeFriend: (friendshipId: string) => Promise<void>
}

// 挑战系统状态
interface ChallengesState {
  challenges: Challenge[]
  participants: ChallengeParticipant[]
  loading: boolean
  loadChallenges: () => Promise<void>
  loadParticipants: (challengeId: string) => Promise<void>
  joinChallenge: (challengeId: string, childId: string) => Promise<void>
  updateProgress: (participantId: string, progress: number) => Promise<void>
  completeChallenge: (participantId: string) => Promise<void>
}

// 聊天系统状态
interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  loadMessages: (senderId: string, receiverId: string) => Promise<void>
  sendMessage: (senderId: string, receiverId: string, message: string, type?: 'text' | 'preset' | 'emoji') => Promise<void>
  markAsRead: (messageId: string) => Promise<void>
  loadPresetMessages: () => Promise<string[]>
}

// 积分排行榜状态
interface LeaderboardEntry {
  id: string
  name: string
  points: number
  rank: number
  avatar?: string
}

interface LeaderboardState {
  leaderboard: LeaderboardEntry[]
  loading: boolean
  loadLeaderboard: (familyId?: string) => Promise<void>
  getChildRank: (childId: string) => Promise<number | null>
}

// 生成随机邀请码
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  family: null,
  children: [],
  selectedChild: null,
  isLoading: false,
  authListener: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const authResponse = await apiClient.login(email, password)
      
      console.log('=== 登录成功，API认证数据 ===')
      console.log('Auth response:', authResponse)
      console.log('User:', authResponse.user)
      
      set({ user: authResponse.user })
      
      // 获取用户的家庭信息
      try {
        const families = await apiClient.getFamilies()
        if (families.length > 0) {
          const family = families[0] // 假设用户只属于一个家庭
          console.log('获取到的家庭数据:', family)
          set({ family })
          await get().loadChildren()
        }
      } catch (familyError) {
        console.warn('获取家庭信息失败:', familyError)
        // 不抛出错误，因为用户可能还没有家庭
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true })
    try {
      const authResponse = await apiClient.register(email, password, name)
      
      console.log('=== 注册成功，API认证数据 ===')
      console.log('Auth response:', authResponse)
      console.log('User:', authResponse.user)
      
      set({ user: authResponse.user })
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    await apiClient.logout()
    set({ user: null, family: null, children: [], selectedChild: null })
  },
  
  logout: async () => {
    await apiClient.logout()
    set({ user: null, family: null, children: [], selectedChild: null })
  },
  
  checkAuth: async () => {
    try {
      console.log('=== checkAuth 认证状态检查 ===')
      
      // 检查是否有有效的 token
      if (!auth.isAuthenticated()) {
        console.log('没有有效的token，清除用户状态')
        set({ user: null, family: null, children: [], selectedChild: null })
        return
      }
      
      // 获取当前用户信息
      const userData = await apiClient.getMe()
      console.log('用户数据查询结果:', userData)
      
      if (userData) {
        // 获取用户的家庭信息
        const families = await apiClient.getFamilies()
        const familyData = families.length > 0 ? families[0] : null
        
        console.log('最终设置的数据:', { user: userData, family: familyData })
        set({ user: userData, family: familyData })
        
        // 如果有家庭，加载儿童信息
        if (familyData) {
          await get().loadChildren()
        }
      }
    } catch (error) {
      console.error('checkAuth 执行失败:', error)
      // 如果获取用户信息失败，可能是 token 过期，清除状态
      set({ user: null, family: null, children: [], selectedChild: null })
      auth.clearAuth()
    }
  },
  
  initialize: async () => {
    set({ isLoading: true })
    try {
      await get().checkAuth()
      
      // 设置认证状态变化监听器
      auth.onAuthStateChange((isAuthenticated) => {
        console.log('=== 认证状态变化 ===', { isAuthenticated })
        
        if (isAuthenticated) {
          // 用户登录时，重新检查认证状态
          get().checkAuth()
        } else {
          // 用户登出时，清除状态
          set({ user: null, family: null, children: [], selectedChild: null })
        }
      })
    } finally {
      set({ isLoading: false })
    }
  },

  cleanup: () => {
    // 清理认证状态监听器
    auth.clearAuthStateListeners()
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) throw new Error('No user logged in')
    
    const updatedUser = await apiClient.updateProfile(updates)
    set({ user: updatedUser })
  },

  updateFamily: async (updates) => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    const updatedFamily = await apiClient.updateFamily(family.id, updates)
    set({ family: updatedFamily })
  },

  createFamily: async (familyData: { name: string; description?: string }) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')
    
    const newFamily = await apiClient.createFamily(familyData)
    set({ family: newFamily })
  },

  joinFamily: async (inviteCode: string) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')
    
    console.log('joinFamily: 开始申请加入家庭，邀请码:', inviteCode)
    
    const family = await apiClient.joinFamily(inviteCode.trim())
    
    // 如果成功加入家庭，更新本地状态
    set({ family })
    // 重新加载儿童信息
    await get().loadChildren()
    
    return { family }
  },

  addChild: async (childData) => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    const newChild = await apiClient.createChild({
      name: childData.name,
      birth_date: childData.birth_date,
      avatar_url: childData.avatar_url
    })
    
    const { children } = get()
    set({ children: [...children, newChild] })
  },

  updateChild: async (id: string, updates: { name?: string; birth_date?: string; avatar_url?: string }) => {
    const updatedChild = await apiClient.updateChild(id, updates)
    
    const { children } = get()
    set({ children: children.map(child => child.id === id ? updatedChild : child) })
  },

  removeChild: async (id: string) => {
    await apiClient.deleteChild(id)
    
    const { children } = get()
    set({ children: children.filter(child => child.id !== id) })
  },

  loadChildren: async () => {
    const { family } = get()
    if (!family) {
      console.log('loadChildren: 没有家庭信息，跳过加载儿童')
      return
    }
    
    console.log('loadChildren: 开始加载儿童数据，family_id:', family.id)
    
    try {
      const children = await apiClient.getChildren(family.id)
      console.log('loadChildren: 加载到的儿童数据:', children)
      set({ children: children || [] })
    } catch (error) {
      console.error('Load children error:', error)
      set({ children: [] })
    }
  },

  setSelectedChild: (child: Child | null) => {
    set({ selectedChild: child })
  },

  generateInviteCode: async () => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    const newInviteCode = generateInviteCode()
    const updatedFamily = await apiClient.updateFamily(family.id, { invite_code: newInviteCode })
    
    set({ family: updatedFamily })
    return newInviteCode
  },

  // 获取待审核的加入申请
  getJoinRequests: async () => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    // 加入申请功能待后续实现
    return []
  },

  // 审核加入申请
  approveJoinRequest: async (requestId: string, approved: boolean) => {
    // 加入申请功能待后续实现
    throw new Error('加入申请功能暂未实现')
  }
}))

export const useRulesStore = create<RulesState>((set, get) => ({
  rules: [],
  loading: false,

  loadRules: async () => {
    const { family } = useAuthStore.getState()
    if (!family) return
    
    set({ loading: true })
    try {
      const rules = await apiClient.getRules(family.id)
      set({ rules: rules || [] })
    } catch (error) {
      console.error('Load rules error:', error)
      set({ rules: [] })
    } finally {
      set({ loading: false })
    }
  },

  createRule: async (rule) => {
    const newRule = await apiClient.createRule(rule)
    
    const { rules } = get()
    set({ rules: [newRule, ...rules] })
  },

  addRule: async (rule) => {
    const newRule = await apiClient.createRule(rule)
    
    const { rules } = get()
    set({ rules: [newRule, ...rules] })
  },

  updateRule: async (id: string, updates: Partial<Rule>) => {
    const updatedRule = await apiClient.updateRule(id, updates)
    
    const { rules } = get()
    set({ rules: rules.map(rule => rule.id === id ? updatedRule : rule) })
  },

  deleteRule: async (id: string) => {
    await apiClient.deleteRule(id)
    
    const { rules } = get()
    set({ rules: rules.filter(rule => rule.id !== id) })
  }
}))

export const useBehaviorsStore = create<BehaviorsState>((set, get) => ({
  behaviors: [],
  children: [],
  loading: false,

  loadBehaviors: async (familyId: string) => {
    set({ loading: true })
    try {
      const [behaviors, children] = await Promise.all([
        apiClient.getBehaviors(familyId),
        apiClient.getChildren(familyId)
      ])
      
      set({ 
        behaviors: behaviors || [],
        children: children || []
      })
    } catch (error) {
      console.error('Load behaviors error:', error)
      set({ behaviors: [], children: [] })
    } finally {
      set({ loading: false })
    }
  },

  addBehavior: async (behaviorData) => {
    const newBehavior = await apiClient.createBehavior(behaviorData)
    
    const { behaviors } = get()
    set({ behaviors: [newBehavior, ...behaviors] })
    return newBehavior
  },

  createBehavior: async (behaviorData) => {
    const newBehavior = await apiClient.createBehavior(behaviorData)
    
    const { behaviors } = get()
    set({ behaviors: [newBehavior, ...behaviors] })
    return newBehavior
  },

  updateBehavior: async (id: string, updates: Partial<Behavior>) => {
    const updatedBehavior = await apiClient.updateBehavior(id, updates)
    
    const { behaviors } = get()
    set({ behaviors: behaviors.map(behavior => behavior.id === id ? updatedBehavior : behavior) })
  },

  deleteBehavior: async (id: string) => {
    await apiClient.deleteBehavior(id)
    
    const { behaviors } = get()
    set({ behaviors: behaviors.filter(behavior => behavior.id !== id) })
  }
}))

export const useRewardsStore = create<RewardsState>((set, get) => ({
  rewards: [],
  loading: false,

  loadRewards: async () => {
    const { family } = useAuthStore.getState()
    if (!family) return
    
    set({ loading: true })
    try {
      const rewards = await apiClient.getRewards(family.id)
      set({ rewards: rewards || [] })
    } catch (error) {
      console.error('Load rewards error:', error)
      set({ rewards: [] })
    } finally {
      set({ loading: false })
    }
  },

  createReward: async (reward) => {
    const newReward = await apiClient.createReward(reward)
    
    const { rewards } = get()
    set({ rewards: [newReward, ...rewards] })
  },

  addReward: async (reward) => {
    const newReward = await apiClient.createReward(reward)
    
    const { rewards } = get()
    set({ rewards: [newReward, ...rewards] })
  },

  updateReward: async (id: string, updates: Partial<Reward>) => {
    const updatedReward = await apiClient.updateReward(id, updates)
    
    const { rewards } = get()
    set({ rewards: rewards.map(reward => reward.id === id ? updatedReward : reward) })
  },

  deleteReward: async (id: string) => {
    await apiClient.deleteReward(id)
    
    const { rewards } = get()
    set({ rewards: rewards.filter(reward => reward.id !== id) })
  },

  redeemReward: async (rewardId: string, childId: string) => {
    // 这里可以添加兑换奖励的逻辑
    // 比如减少孩子的积分，记录兑换历史等
    console.log(`Redeeming reward ${rewardId} for child ${childId}`)
  }
}))

// 家庭成员管理Store
export const useFamilyMembersStore = create<FamilyMembersState>((set, get) => ({
  members: [],
  loading: false,

  loadMembers: async (familyId: string) => {
    set({ loading: true })
    try {
      const members = await apiClient.getFamilyMembers(familyId)
      set({ members: members || [] })
    } catch (error) {
      console.error('Load members error:', error)
      set({ members: [] })
    } finally {
      set({ loading: false })
    }
  },

  inviteMember: async (email: string, role: 'parent' | 'guardian', permissions: string[]) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const newMember = await apiClient.inviteFamilyMember(family.id, email, role, permissions)
    
    const { members } = get()
    set({ members: [...members, newMember] })
  },

  updateMemberRole: async (memberId: string, role: 'parent' | 'guardian', permissions: string[]) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const updatedMember = await apiClient.updateFamilyMemberRole(family.id, memberId, role, permissions)
    
    const { members } = get()
    set({ members: members.map(member => member.id === memberId ? updatedMember : member) })
  },

  removeMember: async (memberId: string) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    await apiClient.removeFamilyMember(family.id, memberId)
    
    const { members } = get()
    set({ members: members.filter(member => member.id !== memberId) })
  },

  generateInviteCode: async () => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const result = await apiClient.generateFamilyInviteCode(family.id)
    
    // 更新本地family状态
    useAuthStore.setState({ family: { ...family, invite_code: result.invite_code } })
    
    return result.invite_code
  }
}))

// 好友系统Store
export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  loading: false,

  loadFriends: async (childId: string) => {
    set({ loading: true })
    try {
      // 暂时使用空数组，好友系统功能待后续实现
      set({ 
        friends: [],
        pendingRequests: []
      })
    } catch (error) {
      console.error('Load friends error:', error)
    } finally {
      set({ loading: false })
    }
  },

  sendFriendRequest: async (requesterId: string, addresseeCode: string) => {
    // 好友系统功能待后续实现
    throw new Error('好友系统功能暂未实现')
  },

  respondToFriendRequest: async (requestId: string, response: 'accepted' | 'declined') => {
    // 好友系统功能待后续实现
    throw new Error('好友系统功能暂未实现')
  },

  removeFriend: async (friendshipId: string) => {
    // 好友系统功能待后续实现
    throw new Error('好友系统功能暂未实现')
  }
}))

// 挑战系统Store
export const useChallengesStore = create<ChallengesState>((set, get) => ({
  challenges: [],
  participants: [],
  loading: false,

  loadChallenges: async () => {
    set({ loading: true })
    try {
      // 挑战系统功能待后续实现
      set({ challenges: [] })
    } catch (error) {
      console.error('Load challenges error:', error)
    } finally {
      set({ loading: false })
    }
  },

  loadParticipants: async (challengeId: string) => {
    try {
      // 挑战系统功能待后续实现
      set({ participants: [] })
    } catch (error) {
      console.error('Load participants error:', error)
    }
  },

  joinChallenge: async (challengeId: string, childId: string) => {
    // 挑战系统功能待后续实现
    throw new Error('挑战系统功能暂未实现')
  },

  updateProgress: async (participantId: string, progress: number) => {
    // 挑战系统功能待后续实现
    throw new Error('挑战系统功能暂未实现')
  },

  completeChallenge: async (participantId: string) => {
    // 挑战系统功能待后续实现
    throw new Error('挑战系统功能暂未实现')
  }
}))

// 聊天系统Store
export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,

  loadMessages: async (senderId: string, receiverId: string) => {
    set({ loading: true })
    try {
      // 聊天系统功能待后续实现
      set({ messages: [] })
    } catch (error) {
      console.error('Load messages error:', error)
    } finally {
      set({ loading: false })
    }
  },

  sendMessage: async (senderId: string, receiverId: string, message: string, type: 'text' | 'preset' | 'emoji' = 'text') => {
    // 聊天系统功能待后续实现
    throw new Error('聊天系统功能暂未实现')
  },

  markAsRead: async (messageId: string) => {
    // 聊天系统功能待后续实现
    throw new Error('聊天系统功能暂未实现')
  },

  loadPresetMessages: async () => {
    try {
      // 聊天系统功能待后续实现
      return []
    } catch (error) {
      console.error('Load preset messages error:', error)
      return []
    }
  }
}))

// 积分排行榜Store
export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  leaderboard: [],
  loading: false,

  loadLeaderboard: async (familyId?: string) => {
    set({ loading: true })
    try {
      // 排行榜功能待后续实现
      set({ leaderboard: [] })
    } catch (error) {
      console.error('Load leaderboard error:', error)
    } finally {
      set({ loading: false })
    }
  },

  getChildRank: async (childId: string) => {
    try {
      // 排行榜功能待后续实现
      return null
    } catch (error) {
      console.error('Get child rank error:', error)
      return null
    }
  }
}))

// 监督日志接口
interface SupervisionLog {
  id: string
  child_id: string
  activity_type: 'chat' | 'challenge' | 'friendship'
  activity_id?: string
  details?: any
  flagged: boolean
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  child?: {
    name: string
    avatar_url?: string
  }
}

// 监督状态接口
interface SupervisionState {
  logs: SupervisionLog[]
  flaggedLogs: SupervisionLog[]
  loading: boolean
  
  loadSupervisionLogs: (familyId: string, filters?: {
    childId?: string
    activityType?: string
    flagged?: boolean
    dateRange?: { start: string; end: string }
  }) => Promise<void>
  flagActivity: (logId: string, reason?: string) => Promise<void>
  reviewActivity: (logId: string, approved: boolean, notes?: string) => Promise<void>
  getActivityStats: (familyId: string, period?: 'day' | 'week' | 'month') => Promise<{
    totalActivities: number
    flaggedActivities: number
    chatMessages: number
    challengeParticipations: number
    friendshipRequests: number
  }>
}

// 监督功能Store
export const useSupervisionStore = create<SupervisionState>((set, get) => ({
  logs: [],
  flaggedLogs: [],
  loading: false,

  loadSupervisionLogs: async (familyId: string, filters = {}) => {
    set({ loading: true })
    try {
      // 监督功能待后续实现
      set({ logs: [], flaggedLogs: [] })
    } catch (error) {
      console.error('Load supervision logs error:', error)
    } finally {
      set({ loading: false })
    }
  },

  flagActivity: async (logId: string, reason?: string) => {
    // 监督功能待后续实现
    throw new Error('监督功能暂未实现')
  },

  reviewActivity: async (logId: string, approved: boolean, notes?: string) => {
    // 监督功能待后续实现
    throw new Error('监督功能暂未实现')
  },

  getActivityStats: async (familyId: string, period = 'week') => {
    try {
      const now = new Date()
      let startDate: Date
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default: // week
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
      
      // 监督功能待后续实现
      const stats = {
        totalActivities: 0,
        flaggedActivities: 0,
        chatMessages: 0,
        challengeParticipations: 0,
        friendshipRequests: 0
      }
      
      return stats
    } catch (error) {
      console.error('Get activity stats error:', error)
      return {
        totalActivities: 0,
        flaggedActivities: 0,
        chatMessages: 0,
        challengeParticipations: 0,
        friendshipRequests: 0
      }
    }
  }
}))