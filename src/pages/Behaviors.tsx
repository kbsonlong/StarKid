import { useState, useEffect } from 'react'
import { 
  Plus, 
  Calendar, 
  User, 
  Star, 
  AlertTriangle,
  Filter,
  Search,
  Clock,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon
} from 'lucide-react'
import { useAuthStore, useRulesStore, useBehaviorsStore } from '../store'
import { Behavior } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import { ImageUpload } from '../components/ImageUpload'
import { apiClient } from '../lib/api'

interface BehaviorFormData {
  child_id: string
  rule_id: string
  notes: string
}

interface BehaviorImage {
  id: string
  behavior_id: string
  image_url: string
  storage_path: string
  created_at: string
  url?: string
  path?: string
}

const initialFormData: BehaviorFormData = {
  child_id: '',
  rule_id: '',
  notes: ''
}

export function Behaviors() {
  const { children, family } = useAuthStore()
  const { rules, loadRules } = useRulesStore()
  const { behaviors, loading, loadBehaviors, createBehavior } = useBehaviorsStore()
  
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<BehaviorFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'reward' | 'punishment'>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [uploadedImages, setUploadedImages] = useState<BehaviorImage[]>([])
  const [uploadError, setUploadError] = useState<string>('')

  useEffect(() => {
    if (family) {
      loadRules()
      loadBehaviors(family.id)
    }
  }, [family, loadRules, loadBehaviors])

  const filteredBehaviors = behaviors.filter(behavior => {
    const childMatch = selectedChild === 'all' || behavior.child_id === selectedChild
    const typeMatch = selectedType === 'all' || 
      (selectedType === 'reward' && behavior.rules?.type === 'positive') ||
      (selectedType === 'punishment' && behavior.rules?.type === 'negative')
    const searchMatch = searchTerm === '' || 
      behavior.rules?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      behavior.children?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      behavior.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    let dateMatch = true
    if (dateFilter !== 'all') {
      const behaviorDate = new Date(behavior.created_at)
      const today = new Date()
      
      switch (dateFilter) {
        case 'today':
          dateMatch = behaviorDate.toDateString() === today.toDateString()
          break
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          dateMatch = behaviorDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          dateMatch = behaviorDate >= monthAgo
          break
      }
    }
    
    return childMatch && typeMatch && searchMatch && dateMatch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.child_id || !formData.rule_id) return

    setSubmitting(true)
    try {
      const behaviorData = {
        ...formData,
        family_id: family?.id || '',
        points_change: selectedRule?.points || 0
      }
      
      // 创建行为记录
      const newBehavior = await createBehavior(behaviorData)
      
      // 如果有上传的图片，保存到behavior_images表
      if (uploadedImages.length > 0 && newBehavior?.id) {
        for (const image of uploadedImages) {
          await apiClient.createBehaviorImage({
            behavior_id: newBehavior.id,
            image_url: image.url || image.image_url,
            storage_path: image.path || image.storage_path,
            uploaded_by: useAuthStore.getState().user?.id
          })
        }
      }
      
      // 重置表单
      setFormData(initialFormData)
      setUploadedImages([])
      setUploadError('')
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create behavior:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageUploaded = (imageUrl: string, storagePath: string) => {
    const newImage: BehaviorImage = {
      id: `temp-${Date.now()}`,
      behavior_id: '',
      image_url: imageUrl,
      storage_path: storagePath,
      created_at: new Date().toISOString(),
      url: imageUrl,
      path: storagePath
    }
    setUploadedImages(prev => [...prev, newImage])
    setUploadError('')
  }

  const handleImageRemoved = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
  }

  const selectedRule = rules.find(rule => rule.id === formData.rule_id)
  const todayBehaviors = behaviors.filter(b => 
    new Date(b.created_at).toDateString() === new Date().toDateString()
  )
  const todayPoints = todayBehaviors.reduce((sum, b) => sum + b.points_change, 0)

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-4 xs:space-y-0">
        <div>
          <h1 className="text-xl xs:text-2xl font-bold text-gray-800">行为记录</h1>
          <p className="text-sm xs:text-base text-gray-600 mt-1">记录孩子的日常表现，追踪成长轨迹</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors w-full xs:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>记录行为</span>
        </button>
      </div>

      {/* 今日统计 */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 xs:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 xs:p-6">
          <div className="flex items-center">
            <div className="p-2 xs:p-3 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 xs:h-6 xs:w-6 text-blue-600" />
            </div>
            <div className="ml-3 xs:ml-4">
              <p className="text-xs xs:text-sm text-gray-500">今日记录</p>
              <p className="text-lg xs:text-2xl font-bold text-gray-800">{todayBehaviors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 xs:p-6">
          <div className="flex items-center">
            <div className={`p-2 xs:p-3 rounded-lg ${
              todayPoints >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {todayPoints >= 0 ? (
                <TrendingUp className="h-5 w-5 xs:h-6 xs:w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 xs:h-6 xs:w-6 text-red-600" />
              )}
            </div>
            <div className="ml-3 xs:ml-4">
              <p className="text-xs xs:text-sm text-gray-500">今日积分变化</p>
              <p className={`text-lg xs:text-2xl font-bold ${
                todayPoints >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {todayPoints >= 0 ? '+' : ''}{todayPoints}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 xs:p-6 xs:col-span-2 md:col-span-1">
          <div className="flex items-center">
            <div className="p-2 xs:p-3 bg-purple-100 rounded-lg">
              <User className="h-5 w-5 xs:h-6 xs:w-6 text-purple-600" />
            </div>
            <div className="ml-3 xs:ml-4">
              <p className="text-xs xs:text-sm text-gray-500">活跃儿童</p>
              <p className="text-lg xs:text-2xl font-bold text-gray-800">
                {new Set(todayBehaviors.map(b => b.child_id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 行为记录表单 */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 xs:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 xs:mb-6">记录新行为</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择儿童 *
                </label>
                <select
                  value={formData.child_id}
                  onChange={(e) => setFormData({ ...formData, child_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                >
                  <option value="">请选择儿童</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择规则 *
                </label>
                <select
                  value={formData.rule_id}
                  onChange={(e) => setFormData({ ...formData, rule_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                >
                  <option value="">请选择规则</option>
                  {rules.map(rule => (
                    <option key={rule.id} value={rule.id}>
                      {rule.type === 'positive' ? '🌟' : '⚠️'} {rule.name} ({rule.points > 0 ? '+' : ''}{rule.points}分)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedRule && (
              <div className={`p-4 rounded-lg border-l-4 ${
                selectedRule.type === 'positive' 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-center mb-2">
                  {selectedRule.type === 'positive' ? (
                    <Star className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span className="font-medium text-gray-800">{selectedRule.name}</span>
                  <span className={`ml-auto font-semibold ${
                    selectedRule.type === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedRule.type === 'positive' 
                      ? `+${selectedRule.points} 积分`
                      : `扣${Math.abs(selectedRule.points)}分`
                    }
                  </span>
                </div>
                {selectedRule.description && (
                  <p className="text-gray-600 text-sm">{selectedRule.description}</p>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注说明
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                rows={3}
                placeholder="可以添加一些具体的情况说明..."
              />
            </div>
            
            {/* 图片上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="inline h-4 w-4 mr-1" />
                上传图片 (可选)
              </label>
              <ImageUpload
                onImageUploaded={handleImageUploaded}
                onImageRemoved={handleImageRemoved}
                onError={handleUploadError}
                maxImages={3}
                uploadedImages={uploadedImages}
              />
              {uploadError && (
                <p className="text-red-500 text-sm mt-2">{uploadError}</p>
              )}
            </div>
            
            <div className="flex flex-col xs:flex-row xs:justify-end space-y-3 xs:space-y-0 xs:space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full xs:w-auto px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full xs:w-auto px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                {submitting ? '记录中...' : '确认记录'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 筛选和搜索 */}
      <div className="bg-white rounded-xl shadow-sm p-4 xs:p-6">
        <div className="flex flex-col xs:flex-row xs:flex-wrap gap-3 xs:gap-4">
          <div className="flex-1 min-w-0 xs:min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                placeholder="搜索规则、儿童或备注..."
              />
            </div>
          </div>
          
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="w-full xs:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
          >
            <option value="all">全部儿童</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | 'reward' | 'punishment')}
            className="w-full xs:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
          >
            <option value="all">全部类型</option>
            <option value="reward">奖励</option>
            <option value="punishment">惩罚</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full xs:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
          </select>
        </div>
      </div>

      {/* 行为记录列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      ) : filteredBehaviors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无行为记录</p>
          <p className="text-gray-400 text-sm mt-1">开始记录孩子的表现吧！</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredBehaviors.map((behavior) => (
              <div key={behavior.id} className="p-4 xs:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between space-y-3 xs:space-y-0">
                  <div className="flex items-start space-x-3 xs:space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      behavior.points_change > 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {behavior.points_change > 0 ? (
                        <Star className="h-4 w-4 xs:h-5 xs:w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 xs:h-5 xs:w-5 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800 text-sm xs:text-base">
                          {behavior.rules?.name || '未知规则'}
                        </h3>
                        {behavior.rules?.category && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {behavior.rules?.category}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 xs:gap-4 text-xs xs:text-sm text-gray-500 mb-2">
                        <span className="flex items-center">
                          <User className="h-3 w-3 xs:h-4 xs:w-4 mr-1" />
                          {behavior.children?.name || '未知儿童'}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 xs:h-4 xs:w-4 mr-1" />
                          {formatDateTime(behavior.created_at)}
                        </span>
                      </div>
                      
                      {behavior.notes && (
                        <p className="text-gray-600 text-xs xs:text-sm mb-2">{behavior.notes}</p>
                      )}
                      
                      {/* 显示行为图片 */}
                      {behavior.behavior_images && behavior.behavior_images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {behavior.behavior_images.map((image: any) => (
                            <div key={image.id} className="relative">
                              <img
                                src={image.image_url}
                                alt="行为图片"
                                className="w-12 h-12 xs:w-16 xs:h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(image.image_url, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-left xs:text-right">
                    <div className={`text-lg font-bold ${
                      behavior.points_change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {behavior.points_change > 0 
                        ? `+${behavior.points_change}` 
                        : `扣${Math.abs(behavior.points_change)}分`
                      }
                    </div>
                    {behavior.points_change > 0 && (
                      <div className="text-xs text-gray-500">积分</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}