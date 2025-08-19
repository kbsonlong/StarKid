import { create } from 'zustand'
import { supabase, User, Family, Child, Rule, Behavior, Reward } from '../lib/supabase'

// 新增类型定义
interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: 'parent' | 'guardian'
  permissions: string[]
  joined_at: string
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
  joinFamily: (inviteCode: string) => Promise<void>
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
  addBehavior: (behaviorData: Omit<Behavior, 'id' | 'created_at'>) => Promise<void>
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      console.log('=== 登录成功，Supabase认证数据 ===')
      console.log('Auth data:', data)
      console.log('Session:', data.session)
      console.log('User:', data.user)
      
      // 等待一下确保认证状态已设置
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 获取用户信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (userError) {
        console.error('获取用户信息失败:', userError)
        throw userError
      }
      
      console.log('获取到的用户数据:', userData)
      set({ user: userData })
      
      // 通过creator_id获取家庭信息
      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('creator_id', userData.id)
        .single()
      
      if (familyData) {
        console.log('获取到的家庭数据:', familyData)
        set({ family: familyData })
        await get().loadChildren()
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      
      // 创建用户记录
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: data.user?.id,
          email,
          name,
          role: 'parent'
        })
        .select()
        .single()
      
      if (userError) throw userError
      
      set({ user: userData })
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, family: null })
  },
  
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, family: null })
  },
  
  checkAuth: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('=== checkAuth 认证状态检查 ===')
      console.log('Session:', session)
      console.log('Session error:', sessionError)
      console.log('User from session:', session?.user)
      
      if (sessionError) {
        console.error('获取session失败:', sessionError)
        return
      }
      
      if (session?.user) {
        // 获取用户信息
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        console.log('用户数据查询结果:', { userData, userError })
        
        if (userError) {
          console.error('获取用户信息失败:', userError)
          return
        }
        
        if (userData) {
          let familyData = null
          
          // 首先通过creator_id查找用户创建的家庭
          const { data: createdFamily, error: familyError } = await supabase
            .from('families')
            .select('*')
            .eq('creator_id', userData.id)
            .single()
          
          console.log('创建的家庭查询结果:', { createdFamily, familyError })
          
          if (createdFamily) {
            familyData = createdFamily
          } else {
            // 如果没有创建的家庭，通过family_members表查找用户所属的家庭
            const { data: memberData, error: memberError } = await supabase
              .from('family_members')
              .select(`
                family:families(*)
              `)
              .eq('user_id', userData.id)
              .single()
            
            console.log('家庭成员查询结果:', { memberData, memberError })
            
            if (memberData?.family) {
              familyData = memberData.family
            }
          }
          
          console.log('最终设置的数据:', { user: userData, family: familyData })
          set({ user: userData, family: familyData })
          
          // 如果有家庭，加载儿童信息
          if (familyData) {
            await get().loadChildren()
          }
        }
      } else {
        console.log('没有有效的session，清除用户状态')
        set({ user: null, family: null })
      }
    } catch (error) {
      console.error('checkAuth 执行失败:', error)
    }
  },
  
  initialize: async () => {
    set({ isLoading: true })
    try {
      await get().checkAuth()
      
      // 清理之前的监听器（如果存在）
      const currentListener = get().authListener
      if (currentListener) {
        currentListener.unsubscribe()
      }
      
      // 添加认证状态监听器
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('=== 认证状态变化 ===', { event, session })
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // 用户登录或token刷新时，重新检查认证状态
          await get().checkAuth()
        } else if (event === 'SIGNED_OUT') {
          // 用户登出时，清除状态
          set({ user: null, family: null, children: [], selectedChild: null })
        }
      })
      
      // 保存监听器引用
      set({ authListener })
    } finally {
      set({ isLoading: false })
    }
  },

  cleanup: () => {
    const currentListener = get().authListener
    if (currentListener) {
      currentListener.unsubscribe()
      set({ authListener: null })
    }
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) throw new Error('No user logged in')
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    set({ user: data })
  },

  updateFamily: async (updates) => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    const { data, error } = await supabase
      .from('families')
      .update(updates)
      .eq('id', family.id)
      .select()
      .single()
    
    if (error) throw error
    set({ family: data })
  },

  createFamily: async (familyData: { name: string; description?: string }) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')
    
    const inviteCode = generateInviteCode()
    const { data, error } = await supabase
      .from('families')
      .insert({
        creator_id: user.id,
        name: familyData.name,
        description: familyData.description,
        invite_code: inviteCode
      })
      .select()
      .single()
    
    if (error) throw error
    set({ family: data })
  },

  joinFamily: async (inviteCode: string) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')
    
    console.log('joinFamily: 开始申请加入家庭，邀请码:', inviteCode)
    
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .single()
    
    if (familyError) {
      if (familyError.code === 'PGRST116') {
        throw new Error('邀请码无效或已过期')
      }
      throw new Error(`查询家庭失败: ${familyError.message}`)
    }
    
    if (!familyData) {
      throw new Error('邀请码无效或已过期')
    }
    
    // 检查用户是否已经是家庭成员
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyData.id)
      .eq('user_id', user.id)
      .single()
    
    console.log('Member check result:', { existingMember, memberCheckError })
    
    // 如果查询出错但不是因为没有找到记录，则抛出错误
    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      console.error('Member check error:', memberCheckError)
      throw new Error(`检查成员状态失败: ${memberCheckError.message}`)
    }
    
    if (existingMember) {
      throw new Error('您已经是该家庭的成员')
    }
    
    // 检查是否已有待审核的申请
    const { data: existingRequest, error: requestCheckError } = await supabase
      .from('join_requests')
      .select('*')
      .eq('family_id', familyData.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()
    
    if (requestCheckError && requestCheckError.code !== 'PGRST116') {
      console.error('Request check error:', requestCheckError)
      throw new Error(`检查申请状态失败: ${requestCheckError.message}`)
    }
    
    if (existingRequest) {
      throw new Error('您已提交过加入申请，请等待家庭管理员审核')
    }
    
    // 创建加入申请
    const { error: requestError } = await supabase
      .from('join_requests')
      .insert({
        family_id: familyData.id,
        user_id: user.id,
        user_name: user.name || user.email,
        user_email: user.email,
        status: 'pending',
        message: `申请加入家庭：${familyData.name}`
      })
    
    if (requestError) {
      console.error('Request insert error:', requestError)
      throw new Error(`提交申请失败: ${requestError.message}`)
    }
    
    console.log('Successfully submitted join request for family:', familyData.name)
    throw new Error('申请已提交，请等待家庭管理员审核。审核通过后您将收到通知。')
  },

  addChild: async (childData) => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    const { data, error } = await supabase
      .from('children')
      .insert({
        family_id: family.id,
        name: childData.name,
        birth_date: childData.birth_date,
        avatar_url: childData.avatar_url
      })
      .select()
      .single()
    
    if (error) throw error
    
    const { children } = get()
    set({ children: [...children, data] })
  },

  updateChild: async (id: string, updates: { name?: string; birth_date?: string; avatar_url?: string }) => {
    const { data, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    const { children } = get()
    set({ children: children.map(child => child.id === id ? data : child) })
  },

  removeChild: async (id: string) => {
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
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
    
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', family.id)
    
    if (error) {
      console.error('Load children error:', error)
      return
    }
    
    console.log('loadChildren: 加载到的儿童数据:', data)
    set({ children: data || [] })
  },

  setSelectedChild: (child: Child | null) => {
    set({ selectedChild: child })
  },

  generateInviteCode: async () => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    const newInviteCode = generateInviteCode()
    const { error } = await supabase
      .from('families')
      .update({ invite_code: newInviteCode })
      .eq('id', family.id)
    
    if (error) throw error
    
    set({ family: { ...family, invite_code: newInviteCode } })
    return newInviteCode
  },

  // 获取待审核的加入申请
  getJoinRequests: async () => {
    const { family } = get()
    if (!family) throw new Error('No family selected')
    
    const { data, error } = await supabase
      .from('join_requests')
      .select('*')
      .eq('family_id', family.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // 审核加入申请
  approveJoinRequest: async (requestId: string, approved: boolean) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')
    
    // 获取申请详情
    const { data: request, error: requestError } = await supabase
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single()
    
    if (requestError) throw new Error(`获取申请信息失败: ${requestError.message}`)
    if (!request) throw new Error('申请不存在')
    
    if (approved) {
      // 审核通过：将用户添加到家庭成员表
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: request.family_id,
          user_id: request.user_id,
          role: 'parent',
          permissions: ['view_children', 'manage_behaviors', 'manage_rewards']
        })
      
      if (memberError) {
        throw new Error(`添加家庭成员失败: ${memberError.message}`)
      }
    }
    
    // 更新申请状态
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)
    
    if (updateError) {
      throw new Error(`更新申请状态失败: ${updateError.message}`)
    }
    
    return approved ? '申请已通过' : '申请已拒绝'
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
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('family_id', family.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      set({ rules: data || [] })
    } catch (error) {
      console.error('Load rules error:', error)
    } finally {
      set({ loading: false })
    }
  },

  createRule: async (rule) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const { data, error } = await supabase
      .from('rules')
      .insert({ ...rule, family_id: family.id })
      .select()
      .single()
    
    if (error) throw error
    
    const { rules } = get()
    set({ rules: [data, ...rules] })
  },

  addRule: async (rule) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const { data, error } = await supabase
      .from('rules')
      .insert({ ...rule, family_id: family.id })
      .select()
      .single()
    
    if (error) throw error
    
    const { rules } = get()
    set({ rules: [data, ...rules] })
  },

  updateRule: async (id: string, updates: Partial<Rule>) => {
    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    const { rules } = get()
    set({ rules: rules.map(rule => rule.id === id ? data : rule) })
  },

  deleteRule: async (id: string) => {
    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
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
      const [behaviorsResponse, childrenResponse] = await Promise.all([
        supabase
          .from('behaviors')
          .select(`
            *,
            children(name),
            rules(name, type, category),
            behavior_images(id, image_url, storage_path)
          `)
          .eq('family_id', familyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('children')
          .select('*')
          .eq('family_id', familyId)
      ])
      
      if (behaviorsResponse.error) throw behaviorsResponse.error
      if (childrenResponse.error) throw childrenResponse.error
      
      set({ 
        behaviors: behaviorsResponse.data || [],
        children: childrenResponse.data || []
      })
    } catch (error) {
      console.error('Load behaviors error:', error)
    } finally {
      set({ loading: false })
    }
  },

  addBehavior: async (behaviorData) => {
    const { data, error } = await supabase
      .from('behaviors')
      .insert(behaviorData)
      .select(`
        *,
        children(name),
        rules(name, type, category),
        behavior_images(id, image_url, storage_path)
      `)
      .single()
    
    if (error) throw error
    
    const { behaviors } = get()
    set({ behaviors: [data, ...behaviors] })
    return data
  },

  createBehavior: async (behaviorData) => {
    const { data, error } = await supabase
      .from('behaviors')
      .insert(behaviorData)
      .select(`
        *,
        children(name),
        rules(name, type, category),
        behavior_images(id, image_url, storage_path)
      `)
      .single()
    
    if (error) throw error
    
    const { behaviors } = get()
    set({ behaviors: [data, ...behaviors] })
    return data
  },

  updateBehavior: async (id: string, updates: Partial<Behavior>) => {
    const { data, error } = await supabase
      .from('behaviors')
      .update(updates)
      .eq('id', id)
      .select('*, children(name)')
      .single()
    
    if (error) throw error
    
    const { behaviors } = get()
    set({ behaviors: behaviors.map(behavior => behavior.id === id ? data : behavior) })
  },

  deleteBehavior: async (id: string) => {
    const { error } = await supabase
      .from('behaviors')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
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
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('family_id', family.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      set({ rewards: data || [] })
    } catch (error) {
      console.error('Load rewards error:', error)
    } finally {
      set({ loading: false })
    }
  },

  createReward: async (reward) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const { data, error } = await supabase
      .from('rewards')
      .insert({ ...reward, family_id: family.id })
      .select()
      .single()
    
    if (error) throw error
    
    const { rewards } = get()
    set({ rewards: [data, ...rewards] })
  },

  addReward: async (reward) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const { data, error } = await supabase
      .from('rewards')
      .insert({ ...reward, family_id: family.id })
      .select()
      .single()
    
    if (error) throw error
    
    const { rewards } = get()
    set({ rewards: [data, ...rewards] })
  },

  updateReward: async (id: string, updates: Partial<Reward>) => {
    const { data, error } = await supabase
      .from('rewards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    const { rewards } = get()
    set({ rewards: rewards.map(reward => reward.id === id ? data : reward) })
  },

  deleteReward: async (id: string) => {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
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
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          *,
          user:users(name, email, avatar_url)
        `)
        .eq('family_id', familyId)
      
      if (error) throw error
      set({ members: data || [] })
    } catch (error) {
      console.error('Load members error:', error)
    } finally {
      set({ loading: false })
    }
  },

  inviteMember: async (email: string, role: 'parent' | 'guardian', permissions: string[]) => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    // 查找用户
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (userError) throw new Error('用户不存在')
    
    // 添加家庭成员
    const { data, error } = await supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: userData.id,
        role,
        permissions
      })
      .select(`
        *,
        user:users(name, email, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { members } = get()
    set({ members: [...members, data] })
  },

  updateMemberRole: async (memberId: string, role: 'parent' | 'guardian', permissions: string[]) => {
    const { data, error } = await supabase
      .from('family_members')
      .update({ role, permissions })
      .eq('id', memberId)
      .select(`
        *,
        user:users(name, email, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { members } = get()
    set({ members: members.map(member => member.id === memberId ? data : member) })
  },

  removeMember: async (memberId: string) => {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId)
    
    if (error) throw error
    
    const { members } = get()
    set({ members: members.filter(member => member.id !== memberId) })
  },

  generateInviteCode: async () => {
    const { family } = useAuthStore.getState()
    if (!family) throw new Error('No family selected')
    
    const newCode = generateInviteCode()
    const { error } = await supabase
      .from('families')
      .update({ invite_code: newCode })
      .eq('id', family.id)
    
    if (error) throw error
    
    // 更新本地family状态
    useAuthStore.setState({ family: { ...family, invite_code: newCode } })
    
    return newCode
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
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:children!friendships_requester_id_fkey(name, avatar_url),
          addressee:children!friendships_addressee_id_fkey(name, avatar_url)
        `)
        .or(`requester_id.eq.${childId},addressee_id.eq.${childId}`)
        .eq('status', 'accepted')
      
      if (error) throw error
      
      // 获取待处理的好友请求
      const { data: pendingData, error: pendingError } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:children!friendships_requester_id_fkey(name, avatar_url),
          addressee:children!friendships_addressee_id_fkey(name, avatar_url)
        `)
        .eq('addressee_id', childId)
        .eq('status', 'pending')
      
      if (pendingError) throw pendingError
      
      set({ 
        friends: data || [],
        pendingRequests: pendingData || []
      })
    } catch (error) {
      console.error('Load friends error:', error)
    } finally {
      set({ loading: false })
    }
  },

  sendFriendRequest: async (requesterId: string, addresseeCode: string) => {
    // 通过邀请码查找目标儿童
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('child_invite_code', addresseeCode)
      .single()
    
    if (childError) throw new Error('邀请码无效')
    
    // 检查是否已经是好友或已发送请求
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${requesterId},addressee_id.eq.${childData.id}),and(requester_id.eq.${childData.id},addressee_id.eq.${requesterId})`)
      .single()
    
    if (existingFriendship) {
      throw new Error('已经是好友或已发送好友请求')
    }
    
    // 发送好友请求
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        addressee_id: childData.id,
        status: 'pending'
      })
      .select(`
        *,
        requester:children!friendships_requester_id_fkey(name, avatar_url),
        addressee:children!friendships_addressee_id_fkey(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
  },

  respondToFriendRequest: async (requestId: string, response: 'accepted' | 'declined') => {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: response })
      .eq('id', requestId)
      .select(`
        *,
        requester:children!friendships_requester_id_fkey(name, avatar_url),
        addressee:children!friendships_addressee_id_fkey(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { friends, pendingRequests } = get()
    
    // 从待处理列表中移除
    const updatedPending = pendingRequests.filter(req => req.id !== requestId)
    
    // 如果接受，添加到好友列表
    if (response === 'accepted') {
      set({ 
        friends: [...friends, data],
        pendingRequests: updatedPending
      })
    } else {
      set({ pendingRequests: updatedPending })
    }
  },

  removeFriend: async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
    
    if (error) throw error
    
    const { friends } = get()
    set({ friends: friends.filter(friend => friend.id !== friendshipId) })
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
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      set({ challenges: data || [] })
    } catch (error) {
      console.error('Load challenges error:', error)
    } finally {
      set({ loading: false })
    }
  },

  loadParticipants: async (challengeId: string) => {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          child:children(name, avatar_url)
        `)
        .eq('challenge_id', challengeId)
        .order('progress', { ascending: false })
      
      if (error) throw error
      set({ participants: data || [] })
    } catch (error) {
      console.error('Load participants error:', error)
    }
  },

  joinChallenge: async (challengeId: string, childId: string) => {
    // 检查是否已经参加
    const { data: existingParticipant } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('child_id', childId)
      .single()
    
    if (existingParticipant) {
      throw new Error('已经参加了这个挑战')
    }
    
    const { data, error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        child_id: childId,
        status: 'joined',
        progress: 0
      })
      .select(`
        *,
        child:children(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { participants } = get()
    set({ participants: [...participants, data] })
  },

  updateProgress: async (participantId: string, progress: number) => {
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({ progress })
      .eq('id', participantId)
      .select(`
        *,
        child:children(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { participants } = get()
    set({ participants: participants.map(p => p.id === participantId ? data : p) })
  },

  completeChallenge: async (participantId: string) => {
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({ 
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', participantId)
      .select(`
        *,
        child:children(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { participants } = get()
    set({ participants: participants.map(p => p.id === participantId ? data : p) })
  }
}))

// 聊天系统Store
export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,

  loadMessages: async (senderId: string, receiverId: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:children!chat_messages_sender_id_fkey(name, avatar_url)
        `)
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      set({ messages: data || [] })
    } catch (error) {
      console.error('Load messages error:', error)
    } finally {
      set({ loading: false })
    }
  },

  sendMessage: async (senderId: string, receiverId: string, message: string, type: 'text' | 'preset' | 'emoji' = 'text') => {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        message_type: type,
        is_read: false
      })
      .select(`
        *,
        sender:children!chat_messages_sender_id_fkey(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { messages } = get()
    set({ messages: [...messages, data] })
  },

  markAsRead: async (messageId: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', messageId)
    
    if (error) throw error
    
    const { messages } = get()
    set({ messages: messages.map(msg => msg.id === messageId ? { ...msg, is_read: true } : msg) })
  },

  loadPresetMessages: async () => {
    try {
      const { data, error } = await supabase
        .from('preset_messages')
        .select('message')
        .eq('is_active', true)
        .order('category')
      
      if (error) throw error
      return data?.map(item => item.message) || []
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
      let query = supabase
        .from('children')
        .select('id, name, total_points, avatar_url')
        .order('total_points', { ascending: false })
      
      if (familyId) {
        query = query.eq('family_id', familyId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // 添加排名信息
      const leaderboardData: LeaderboardEntry[] = (data || []).map((child, index) => ({
        id: child.id,
        name: child.name,
        points: child.total_points || 0,
        rank: index + 1,
        avatar: child.avatar_url || ''
      }))
      
      set({ leaderboard: leaderboardData })
    } catch (error) {
      console.error('Load leaderboard error:', error)
    } finally {
      set({ loading: false })
    }
  },

  getChildRank: async (childId: string) => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('id, total_points')
        .order('total_points', { ascending: false })
      
      if (error) throw error
      
      const childIndex = data?.findIndex(child => child.id === childId)
      return childIndex !== undefined && childIndex !== -1 ? childIndex + 1 : null
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
      let query = supabase
        .from('supervision_logs')
        .select(`
          *,
          child:children(name, avatar_url)
        `)
        .eq('children.family_id', familyId)
        .order('created_at', { ascending: false })
      
      if (filters.childId) {
        query = query.eq('child_id', filters.childId)
      }
      
      if (filters.activityType) {
        query = query.eq('activity_type', filters.activityType)
      }
      
      if (filters.flagged !== undefined) {
        query = query.eq('flagged', filters.flagged)
      }
      
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      const logs = data || []
      const flaggedLogs = logs.filter(log => log.flagged)
      
      set({ logs, flaggedLogs })
    } catch (error) {
      console.error('Load supervision logs error:', error)
    } finally {
      set({ loading: false })
    }
  },

  flagActivity: async (logId: string, reason?: string) => {
    const { data, error } = await supabase
      .from('supervision_logs')
      .update({ 
        flagged: true,
        details: { 
          ...get().logs.find(log => log.id === logId)?.details,
          flag_reason: reason,
          flagged_at: new Date().toISOString()
        }
      })
      .eq('id', logId)
      .select(`
        *,
        child:children(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { logs, flaggedLogs } = get()
    const updatedLogs = logs.map(log => log.id === logId ? data : log)
    const updatedFlaggedLogs = [...flaggedLogs, data]
    
    set({ logs: updatedLogs, flaggedLogs: updatedFlaggedLogs })
  },

  reviewActivity: async (logId: string, approved: boolean, notes?: string) => {
    const { user } = useAuthStore.getState()
    if (!user) throw new Error('User not authenticated')
    
    const { data, error } = await supabase
      .from('supervision_logs')
      .update({ 
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        details: {
          ...get().logs.find(log => log.id === logId)?.details,
          review_approved: approved,
          review_notes: notes
        }
      })
      .eq('id', logId)
      .select(`
        *,
        child:children(name, avatar_url)
      `)
      .single()
    
    if (error) throw error
    
    const { logs, flaggedLogs } = get()
    const updatedLogs = logs.map(log => log.id === logId ? data : log)
    const updatedFlaggedLogs = flaggedLogs.map(log => log.id === logId ? data : log)
    
    set({ logs: updatedLogs, flaggedLogs: updatedFlaggedLogs })
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
      
      const { data, error } = await supabase
        .from('supervision_logs')
        .select('activity_type, flagged')
        .eq('children.family_id', familyId)
        .gte('created_at', startDate.toISOString())
      
      if (error) throw error
      
      const stats = {
        totalActivities: data?.length || 0,
        flaggedActivities: data?.filter(log => log.flagged).length || 0,
        chatMessages: data?.filter(log => log.activity_type === 'chat').length || 0,
        challengeParticipations: data?.filter(log => log.activity_type === 'challenge').length || 0,
        friendshipRequests: data?.filter(log => log.activity_type === 'friendship').length || 0
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