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
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  initialize: () => Promise<void>
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
  createBehavior: (behaviorData: Omit<Behavior, 'id' | 'created_at'>) => Promise<void>
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

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // 获取用户信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (userError) throw userError
      
      set({ user: userData })
      
      // 通过creator_id获取家庭信息
      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('creator_id', userData.id)
        .single()
      
      if (familyData) {
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
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      // 获取用户信息
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (userData) {
        let familyData = null
        
        // 首先通过creator_id查找用户创建的家庭
        const { data: createdFamily } = await supabase
          .from('families')
          .select('*')
          .eq('creator_id', userData.id)
          .single()
        
        if (createdFamily) {
          familyData = createdFamily
        } else {
          // 如果没有创建的家庭，通过family_members表查找用户所属的家庭
          const { data: memberData } = await supabase
            .from('family_members')
            .select(`
              family:families(*)
            `)
            .eq('user_id', userData.id)
            .single()
          
          if (memberData?.family) {
            familyData = memberData.family
          }
        }
        
        set({ user: userData, family: familyData })
        
        // 如果有家庭，加载儿童信息
        if (familyData) {
          await get().loadChildren()
        }
      }
    }
  },
  
  initialize: async () => {
    set({ isLoading: true })
    try {
      await get().checkAuth()
    } finally {
      set({ isLoading: false })
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
    
    // 查找家庭
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()
    
    if (familyError) {
      if (familyError.code === 'PGRST116') {
        throw new Error('邀请码无效或已过期')
      }
      throw familyError
    }
    
    // 检查用户是否已经是家庭成员
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyData.id)
      .eq('user_id', user.id)
      .single()
    
    if (existingMember) {
      throw new Error('您已经是该家庭的成员')
    }
    
    // 将用户添加到家庭成员表
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyData.id,
        user_id: user.id,
        role: 'parent',
        permissions: ['view_children', 'manage_behaviors', 'manage_rewards']
      })
    
    if (memberError) throw memberError
    
    set({ family: familyData })
    await get().loadChildren()
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
    if (!family) return
    
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', family.id)
    
    if (error) {
      console.error('Load children error:', error)
      return
    }
    
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
          .select('*, children(name)')
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
      .select('*, children(name)')
      .single()
    
    if (error) throw error
    
    const { behaviors } = get()
    set({ behaviors: [data, ...behaviors] })
  },

  createBehavior: async (behaviorData) => {
    const { data, error } = await supabase
      .from('behaviors')
      .insert(behaviorData)
      .select('*, children(name)')
      .single()
    
    if (error) throw error
    
    const { behaviors } = get()
    set({ behaviors: [data, ...behaviors] })
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