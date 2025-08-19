import { useState, useEffect } from 'react'
import { 
  User, 
  Users, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  Save, 
  Edit, 
  Trash2, 
  Plus, 
  X, 
  Check,
  UserPlus,
  Crown,
  Baby
} from 'lucide-react'
import { useAuthStore } from '../store'
import { Child } from '../lib/supabase'
import { calculateAge, formatDate } from '../lib/utils'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

interface ChildFormData {
  name: string
  birth_date: string
  avatar_url?: string
}

const initialChildForm: ChildFormData = {
  name: '',
  birth_date: '',
  avatar_url: ''
}

interface UserProfileData {
  name: string
  email: string
  avatar_url?: string
}

interface FamilyData {
  name: string
  description?: string
}

function Settings() {
  const { user, family, children, updateProfile, updateFamily, createFamily, joinFamily, addChild, updateChild, removeChild } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState<'profile' | 'family' | 'children' | 'notifications' | 'privacy'>('profile')
  const [showChildForm, setShowChildForm] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [childFormData, setChildFormData] = useState<ChildFormData>(initialChildForm)
  const [submitting, setSubmitting] = useState(false)
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || ''
  })
  
  const [familyData, setFamilyData] = useState<FamilyData>({
    name: family?.name || '',
    description: family?.description || ''
  })
  
  const [showJoinFamily, setShowJoinFamily] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState('')
  
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    weekly_reports: true,
    achievement_alerts: true
  })
  
  const [privacy, setPrivacy] = useState({
    data_sharing: false,
    analytics: true,
    marketing: false
  })

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        avatar_url: user.avatar_url || ''
      })
    }
  }, [user])

  useEffect(() => {
    if (family) {
      setFamilyData({
        name: family.name || '',
        description: family.description || ''
      })
    }
  }, [family])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateProfile(profileData)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (family) {
        await updateFamily(familyData)
      } else {
        await createFamily(familyData)
      }
    } catch (error) {
      console.error('Failed to save family:', error)
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    
    // 验证邀请码格式
    const trimmedCode = inviteCode.trim().toUpperCase()
    if (trimmedCode.length !== 6 || !/^[A-Z0-9]{6}$/.test(trimmedCode)) {
      setJoinError('邀请码格式不正确，请输入6位字母数字组合')
      return
    }
    
    setSubmitting(true)
    setJoinError('')
    try {
      await joinFamily(trimmedCode)
      setShowJoinFamily(false)
      setInviteCode('')
      // 显示成功提示
      toast.success('成功加入家庭！')
    } catch (error: any) {
      console.error('Join family error:', error)
      
      // 根据错误类型提供更详细的提示
      if (error.message?.includes('邀请码无效或已过期')) {
        setJoinError('邀请码不存在或已过期，请向家庭管理员确认邀请码是否正确')
      } else if (error.message?.includes('已经是该家庭的成员')) {
        setJoinError('您已经是该家庭的成员了')
      } else if (error.message?.includes('网络')) {
        setJoinError('网络连接失败，请检查网络后重试')
      } else {
        setJoinError(error.message || '加入家庭失败，请稍后重试或联系技术支持')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!childFormData.name.trim() || !childFormData.birth_date) return

    setSubmitting(true)
    try {
      if (editingChild) {
        await updateChild(editingChild.id, childFormData)
      } else {
        await addChild(childFormData)
      }
      handleChildCancel()
    } catch (error) {
      console.error('Failed to save child:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChildEdit = (child: Child) => {
    setEditingChild(child)
    setChildFormData({
      name: child.name,
      birth_date: child.birth_date,
      avatar_url: child.avatar_url || ''
    })
    setShowChildForm(true)
  }

  const handleChildDelete = async (child: Child) => {
    if (window.confirm(`确定要删除 ${child.name} 的信息吗？这将同时删除相关的所有行为记录。`)) {
      await removeChild(child.id)
    }
  }

  const handleChildCancel = () => {
    setShowChildForm(false)
    setEditingChild(null)
    setChildFormData(initialChildForm)
  }

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'family', label: '家庭信息', icon: Users },
    { id: 'children', label: '儿童管理', icon: Baby },
    { id: 'notifications', label: '通知设置', icon: Bell },
    { id: 'privacy', label: '隐私设置', icon: Shield }
  ]

  const isParent = user?.role === 'parent'

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">设置</h1>
        <p className="text-gray-600 mt-1">管理您的账户、家庭和应用偏好设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 侧边栏导航 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-yellow-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
            {/* 个人资料 */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-6">个人资料</h2>
                
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      {profileData.avatar_url ? (
                        <img 
                          src={profileData.avatar_url} 
                          alt="头像" 
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <button 
                        type="button"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        更换头像
                      </button>
                      <p className="text-sm text-gray-500 mt-1">支持 JPG、PNG 格式，建议尺寸 200x200</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="请输入您的姓名"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        邮箱
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="请输入邮箱地址"
                        disabled
                      />
                      <p className="text-sm text-gray-500 mt-1">邮箱地址不可修改</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      头像链接
                    </label>
                    <input
                      type="url"
                      value={profileData.avatar_url || ''}
                      onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="请输入头像图片链接"
                    />
                    <p className="text-sm text-gray-500 mt-1">请输入有效的图片链接地址</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">
                      账户类型: {user?.role === 'parent' ? '家长' : '儿童'}
                    </span>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {submitting ? '保存中...' : '保存更改'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 家庭信息 */}
            {activeTab === 'family' && isParent && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-6">家庭信息</h2>
                
                {!family ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">还没有加入家庭</h3>
                    <p className="text-gray-600 mb-6">您可以创建新家庭或通过邀请码加入现有家庭</p>
                    
                    {/* 选择操作 */}
                    {!showJoinFamily ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                          <button
                            onClick={() => setShowJoinFamily(false)}
                            className="p-4 border-2 border-yellow-500 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                          >
                            <Plus className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                            <div className="text-sm font-medium text-gray-800">创建新家庭</div>
                            <div className="text-xs text-gray-600 mt-1">成为家庭管理员</div>
                          </button>
                          
                          <button
                            onClick={() => setShowJoinFamily(true)}
                            className="p-4 border-2 border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
                          >
                            <UserPlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <div className="text-sm font-medium text-gray-800">加入家庭</div>
                            <div className="text-xs text-gray-600 mt-1">使用邀请码加入</div>
                          </button>
                        </div>
                        
                        {/* 创建家庭表单 */}
                        <div className="mt-8">
                          <form onSubmit={handleFamilySubmit} className="space-y-4 max-w-md mx-auto">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                家庭名称
                              </label>
                              <input
                                type="text"
                                value={familyData.name}
                                onChange={(e) => setFamilyData({ ...familyData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                placeholder="请输入家庭名称"
                                required
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                家庭描述
                              </label>
                              <textarea
                                value={familyData.description}
                                onChange={(e) => setFamilyData({ ...familyData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                rows={3}
                                placeholder="描述一下您的家庭"
                              />
                            </div>
                            
                            <div className="flex justify-center">
                              <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {submitting ? '创建中...' : '创建家庭'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    ) : (
                      /* 加入家庭表单 */
                      <div className="max-w-md mx-auto">
                        <div className="mb-4">
                          <button
                            onClick={() => {
                              setShowJoinFamily(false)
                              setJoinError('')
                              setInviteCode('')
                            }}
                            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            ← 返回选择
                          </button>
                        </div>
                        
                        <form onSubmit={handleJoinFamily} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              家庭邀请码
                            </label>
                            <input
                              type="text"
                              value={inviteCode}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                                setInviteCode(value)
                                setJoinError('')
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                                joinError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder="请输入6位邀请码（如：ABC123）"
                              maxLength={6}
                              required
                            />
                            {joinError && (
                              <p className="text-sm text-red-600 mt-1">{joinError}</p>
                            )}
                          </div>
                          
                          <div className="flex justify-center">
                            <button
                              type="submit"
                              disabled={submitting || !inviteCode.trim()}
                              className="inline-flex items-center px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 mb-2"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {submitting ? '加入中...' : '加入家庭'}
                            </button>
                            
                            {/* 临时调试按钮 */}
                            <button
                              onClick={async () => {
                                try {
                                  const { data: allFamilies, error } = await supabase
                                    .from('families')
                                    .select('id, name, invite_code, created_at')
                                  
                                  console.log('=== 调试：所有家庭数据 ===')
                                  console.log('查询结果:', allFamilies)
                                  console.log('查询错误:', error)
                                  
                                  if (allFamilies) {
                                    allFamilies.forEach((family, index) => {
                                      console.log(`家庭 ${index + 1}:`, {
                                        id: family.id,
                                        name: family.name,
                                        invite_code: family.invite_code,
                                        invite_code_length: family.invite_code?.length,
                                        created_at: family.created_at
                                      })
                                    })
                                  }
                                  
                                  alert(`找到 ${allFamilies?.length || 0} 个家庭，详情请查看控制台`)
                                } catch (error) {
                                  console.error('调试查询失败:', error)
                                  alert('调试查询失败，请查看控制台')
                                }
                              }}
                              className="inline-flex items-center px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs"
                            >
                              🔍 调试：查看所有家庭邀请码
                            </button>
                            
                            <button
                              type="button"
                              className="inline-flex items-center px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs"
                              onClick={async () => {
                                console.log('=== 认证状态诊断 ===')
                                
                                // 检查Supabase session
                                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                                console.log('Supabase Session:', session)
                                console.log('Session Error:', sessionError)
                                console.log('Access Token存在:', !!session?.access_token)
                                console.log('User ID:', session?.user?.id)
                                
                                // 检查store状态
                                console.log('Store中的用户:', user)
                                console.log('Store中的家庭:', family)
                                
                                // 尝试简单查询测试权限
                                try {
                                  const { data: testData, error: testError } = await supabase
                                    .from('users')
                                    .select('id, email')
                                    .limit(1)
                                  
                                  console.log('权限测试查询结果:', testData)
                                  console.log('权限测试查询错误:', testError)
                                } catch (err) {
                                  console.error('权限测试失败:', err)
                                }
                                
                                alert('认证状态诊断完成，请查看控制台输出')
                              }}
                            >
                              🔍 检查认证状态
                            </button>
                          </div>
                        </form>
                        
                        <div className="mt-4 space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>如何获取邀请码：</strong>
                            </p>
                            <ul className="text-sm text-blue-700 mt-1 space-y-1">
                              <li>• 请联系已创建家庭的家长获取邀请码</li>
                              <li>• 家长可在"协作"页面查看和复制邀请码</li>
                              <li>• 邀请码为6位字母数字组合（如：ABC123）</li>
                              <li>• 如果没有人创建家庭，请选择"创建新家庭"</li>
                            </ul>
                            <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                              <p className="text-blue-800 text-sm font-medium">💡 提示</p>
                              <p className="text-blue-700 text-sm mt-1">
                                如果您是第一个使用此应用的用户，请选择"创建新家庭"来开始。
                                创建家庭后，您可以在协作页面找到邀请码分享给其他家长。
                              </p>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-sm text-amber-800">
                              <strong>注意事项：</strong>
                            </p>
                            <ul className="text-sm text-amber-700 mt-1 space-y-1">
                              <li>• 每个邀请码只能使用一次</li>
                              <li>• 请确保邀请码输入正确，区分大小写</li>
                              <li>• 如遇问题请联系家庭管理员重新生成邀请码</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleFamilySubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        家庭名称
                      </label>
                      <input
                        type="text"
                        value={familyData.name}
                        onChange={(e) => setFamilyData({ ...familyData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="请输入家庭名称"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        家庭描述
                      </label>
                      <textarea
                        value={familyData.description}
                        onChange={(e) => setFamilyData({ ...familyData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        rows={3}
                        placeholder="描述一下您的家庭"
                      />
                    </div>
                  
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-800 mb-2">家庭统计</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">家庭成员:</span>
                          <span className="ml-2 font-medium">{children.length + 1} 人</span>
                        </div>
                        <div>
                          <span className="text-gray-600">创建时间:</span>
                          <span className="ml-2 font-medium">{family?.created_at ? formatDate(family.created_at) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {submitting ? '保存中...' : '保存更改'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 儿童管理 */}
            {activeTab === 'children' && isParent && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">儿童管理</h2>
                  <button
                    onClick={() => setShowChildForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加儿童
                  </button>
                </div>
                
                {/* 儿童表单 */}
                {showChildForm && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-800">
                        {editingChild ? '编辑儿童信息' : '添加新儿童'}
                      </h3>
                      <button
                        onClick={handleChildCancel}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleChildSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            姓名 *
                          </label>
                          <input
                            type="text"
                            value={childFormData.name}
                            onChange={(e) => setChildFormData({ ...childFormData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            placeholder="请输入儿童姓名"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            出生日期 *
                          </label>
                          <input
                            type="date"
                            value={childFormData.birth_date}
                            onChange={(e) => setChildFormData({ ...childFormData, birth_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={handleChildCancel}
                          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {submitting ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* 儿童列表 */}
                <div className="space-y-4">
                  {children.length === 0 ? (
                    <div className="text-center py-8">
                      <Baby className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">还没有添加儿童信息</p>
                      <p className="text-gray-400 text-sm mt-1">点击上方按钮添加第一个儿童</p>
                    </div>
                  ) : (
                    children.map(child => (
                      <div key={child.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* 儿童基本信息 */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                              {child.avatar_url ? (
                                <img 
                                  src={child.avatar_url} 
                                  alt={child.name} 
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <Baby className="h-6 w-6 text-yellow-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">{child.name}</h4>
                              <p className="text-sm text-gray-600">
                                {calculateAge(child.birth_date)} 岁 · 总积分: {child.total_points}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleChildEdit(child)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleChildDelete(child)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* 儿童邀请码区域 */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-t border-gray-200 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-medium text-purple-900 mb-1">社交邀请码</h5>
                              <p className="text-xs text-purple-700">
                                其他小朋友可以使用此邀请码添加 {child.name} 为好友
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="bg-white px-3 py-2 rounded-lg border border-purple-200">
                                <code className="text-sm font-mono text-purple-800">
                                  {child.child_invite_code || '生成中...'}
                                </code>
                              </div>
                              <button
                                onClick={() => {
                                  if (child.child_invite_code) {
                                    navigator.clipboard.writeText(child.child_invite_code)
                                    // 这里可以添加复制成功的提示
                                  }
                                }}
                                className="p-2 text-purple-600 hover:text-purple-800 transition-colors"
                                title="复制邀请码"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 通知设置 */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-6">通知设置</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">邮件通知</h3>
                      <p className="text-sm text-gray-600">接收重要更新和提醒邮件</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.email_notifications}
                        onChange={(e) => setNotifications({ ...notifications, email_notifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">推送通知</h3>
                      <p className="text-sm text-gray-600">接收应用内推送通知</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.push_notifications}
                        onChange={(e) => setNotifications({ ...notifications, push_notifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">周报提醒</h3>
                      <p className="text-sm text-gray-600">每周接收孩子的成长报告</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.weekly_reports}
                        onChange={(e) => setNotifications({ ...notifications, weekly_reports: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">成就提醒</h3>
                      <p className="text-sm text-gray-600">孩子获得成就时立即通知</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.achievement_alerts}
                        onChange={(e) => setNotifications({ ...notifications, achievement_alerts: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 隐私设置 */}
            {activeTab === 'privacy' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-6">隐私设置</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">数据共享</h3>
                      <p className="text-sm text-gray-600">允许与第三方服务共享匿名数据</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.data_sharing}
                        onChange={(e) => setPrivacy({ ...privacy, data_sharing: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">使用分析</h3>
                      <p className="text-sm text-gray-600">帮助我们改进产品体验</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.analytics}
                        onChange={(e) => setPrivacy({ ...privacy, analytics: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">营销邮件</h3>
                      <p className="text-sm text-gray-600">接收产品更新和优惠信息</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacy.marketing}
                        onChange={(e) => setPrivacy({ ...privacy, marketing: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Shield className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-medium text-yellow-800">数据安全承诺</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          我们承诺保护您和孩子的隐私数据，不会在未经授权的情况下分享个人信息。
                          所有数据都经过加密存储和传输。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default Settings