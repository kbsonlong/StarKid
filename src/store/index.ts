import { create } from 'zustand'
import { supabase, User, Family, Child, Rule, Behavior, Reward } from '../lib/supabase'

interface AuthState {
  user: User | null
  family: Family | null
  children: Child[]
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  initialize: () => Promise<void>
  updateProfile: (updates: { name?: string; email?: string; avatar_url?: string }) => Promise<void>
  createFamily: (name: string) => Promise<void>
  updateFamily: (updates: { name?: string; description?: string }) => Promise<void>
  joinFamily: (inviteCode: string) => Promise<void>
  addChild: (childData: { name: string; birth_date: string; avatar_url?: string }) => Promise<void>
  updateChild: (id: string, updates: { name?: string; birth_date?: string; avatar_url?: string }) => Promise<void>
  removeChild: (id: string) => Promise<void>
  loadChildren: () => Promise<void>
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

// 生成随机邀请码
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  family: null,
  children: [],
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
      
      // 获取家庭信息
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
      // 获取用户信息和家庭信息
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (userData) {
        const { data: familyData } = await supabase
          .from('families')
          .select('*')
          .eq('id', userData.family_id)
          .single()
        
        set({ user: userData, family: familyData })
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

  createFamily: async (name: string) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')
    
    const inviteCode = generateInviteCode()
    const { data, error } = await supabase
      .from('families')
      .insert({
        creator_id: user.id,
        name,
        invite_code: inviteCode
      })
      .select()
      .single()
    
    if (error) throw error
    set({ family: data })
  },

  joinFamily: async (inviteCode: string) => {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()
    
    if (error) throw error
    set({ family: data })
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

  updateRule: async (id, updates) => {
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

  deleteRule: async (id) => {
    const { error } = await supabase
      .from('rules')
      .update({ is_active: false })
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

  loadBehaviors: async (familyId) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('behaviors')
        .select(`
          *,
          rules(*),
          children(*)
        `)
        .eq('children.family_id', familyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ behaviors: data || [] })
    } finally {
      set({ loading: false })
    }
  },

  addBehavior: async (behavior) => {
    const { data, error } = await supabase
      .from('behaviors')
      .insert(behavior)
      .select(`
        *,
        rules(*),
        children(*)
      `)
      .single()
    
    if (error) throw error
    
    // 更新子女积分
    const child = get().children.find(c => c.id === behavior.child_id)
    if (child) {
      await supabase
        .from('children')
        .update({
          total_points: child.total_points + behavior.points_change
        })
        .eq('id', behavior.child_id)
    }
    
    const { behaviors } = get()
    set({ behaviors: [data, ...behaviors] })
    
    // 重新加载儿童数据
    useAuthStore.getState().loadChildren()
  },
  
  createBehavior: async (behaviorData) => {
    return get().addBehavior(behaviorData)
  },
  
  updateBehavior: async (id, updates) => {
    const { error } = await supabase
      .from('behaviors')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    set(state => ({
      behaviors: state.behaviors.map(b => 
        b.id === id ? { ...b, ...updates } : b
      )
    }))
  },
  
  deleteBehavior: async (id) => {
    const { error } = await supabase
      .from('behaviors')
      .delete()
      .eq('id', id)

    if (error) throw error

    set(state => ({
      behaviors: state.behaviors.filter(b => b.id !== id)
    }))
  },
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
      
      if (error) {
        console.error('Load rewards error:', error)
        return
      }
      
      set({ rewards: data || [] })
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

  updateReward: async (id, updates) => {
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

  deleteReward: async (id) => {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    const { rewards } = get()
    set({ rewards: rewards.filter(reward => reward.id !== id) })
  },

  redeemReward: async (rewardId, childId) => {
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .single()
    
    if (rewardError) throw rewardError
    
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single()
    
    if (childError) throw childError
    
    if (child.total_points < reward.points_required) {
       throw new Error('Insufficient points')
     }
     
     // 扣除积分
     await supabase
       .from('children')
       .update({
         total_points: child.total_points - reward.points_required
       })
       .eq('id', childId)
     
     // 记录兑换行为
     await supabase
       .from('behaviors')
       .insert({
         child_id: childId,
         rule_id: null,
         notes: `兑换奖励: ${reward.name}`,
         points: -reward.points_required,
         points_earned: -reward.points_required
       })
    
    // 重新加载儿童数据
    useAuthStore.getState().loadChildren()
  }
}))