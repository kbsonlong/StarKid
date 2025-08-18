import { useState, useEffect } from 'react'
import { 
  Plus, 
  Gift, 
  Star, 
  Edit, 
  Trash2, 
  ShoppingCart,
  Check,
  X,
  Save,
  Coins
} from 'lucide-react'
import { useAuthStore, useRewardsStore } from '../store'
import { Reward } from '../lib/supabase'
import { getPointsColor, getPointsBgColor } from '../lib/utils'

interface RewardFormData {
  name: string
  description: string
  points_required: number
  category: string
  is_active: boolean
}

const initialFormData: RewardFormData = {
  name: '',
  description: '',
  points_required: 0,
  category: '',
  is_active: true
}

const categories = [
  '玩具',
  '零食',
  '活动',
  '特权',
  '学习用品',
  '电子产品',
  '其他'
]

export function Rewards() {
  const { children, user } = useAuthStore()
  const { rewards, loading, loadRewards, createReward, updateReward, deleteReward, redeemReward } = useRewardsStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [formData, setFormData] = useState<RewardFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [redeemingReward, setRedeemingReward] = useState<Reward | null>(null)
  const [redeemChildId, setRedeemChildId] = useState<string>('')

  useEffect(() => {
    loadRewards()
  }, [])

  const filteredRewards = rewards.filter(reward => {
    const categoryMatch = categoryFilter === 'all' || reward.category === categoryFilter
    return categoryMatch && reward.is_active
  })

  const selectedChildData = children.find(child => child.id === selectedChild)
  const canAffordRewards = selectedChildData 
    ? filteredRewards.filter(reward => selectedChildData.total_points >= reward.points_required)
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || formData.points_required <= 0) return

    setSubmitting(true)
    try {
      if (editingReward) {
        await updateReward(editingReward.id, formData)
      } else {
        await createReward({
          ...formData,
          type: 'physical', // 默认类型
          family_id: '' // 这个会在store中自动设置
        })
      }
      handleCancel()
    } catch (error) {
      console.error('Failed to save reward:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward)
    setFormData({
      name: reward.name,
      description: reward.description || '',
      points_required: reward.points_required,
      category: reward.category || '',
      is_active: reward.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (reward: Reward) => {
    if (window.confirm(`确定要删除奖励「${reward.name}」吗？`)) {
      await deleteReward(reward.id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingReward(null)
    setFormData(initialFormData)
  }

  const handleRedeemClick = (reward: Reward) => {
    setRedeemingReward(reward)
    setRedeemChildId(selectedChild !== 'all' ? selectedChild : '')
    setShowRedeemModal(true)
  }

  const handleRedeemConfirm = async () => {
    if (!redeemingReward || !redeemChildId) return

    setSubmitting(true)
    try {
      await redeemReward(redeemingReward.id, redeemChildId)
      setShowRedeemModal(false)
      setRedeemingReward(null)
      setRedeemChildId('')
    } catch (error) {
      console.error('Failed to redeem reward:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const isParent = user?.role === 'parent'

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">积分兑换</h1>
          <p className="text-gray-600 mt-1">用积分兑换心仪的奖励，激励孩子持续进步</p>
        </div>
        {isParent && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            添加奖励
          </button>
        )}
      </div>

      {/* 儿童积分概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children.map((child) => (
          <div key={child.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{child.name}</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPointsBgColor(child.total_points)} ${getPointsColor(child.total_points)}`}>
                <Coins className="h-4 w-4 inline mr-1" />
                {child.total_points} 积分
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                可兑换奖励: {rewards.filter(r => r.is_active && child.total_points >= r.points_required).length} 个
              </div>
              <button
                onClick={() => setSelectedChild(child.id)}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChild === child.id
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedChild === child.id ? '已选择' : '选择兑换'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 奖励表单 */}
      {showForm && isParent && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingReward ? '编辑奖励' : '添加新奖励'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  奖励名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="请输入奖励名称"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">选择分类</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                奖励描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                rows={3}
                placeholder="描述这个奖励的详细信息"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所需积分 *
                </label>
                <input
                  type="number"
                  value={formData.points_required}
                  onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="需要多少积分才能兑换"
                  min="1"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700">启用此奖励</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
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

      {/* 筛选器 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类筛选</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="all">全部分类</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {selectedChild !== 'all' && selectedChildData && (
            <div className="flex items-end">
              <div className={`px-4 py-2 rounded-lg ${getPointsBgColor(selectedChildData.total_points)}`}>
                <div className="text-sm text-gray-600">当前积分</div>
                <div className={`text-lg font-bold ${getPointsColor(selectedChildData.total_points)}`}>
                  {selectedChildData.total_points}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 奖励列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      ) : filteredRewards.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无可用奖励</p>
          {isParent && (
            <p className="text-gray-400 text-sm mt-1">快来添加一些奖励吧！</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.map((reward) => {
            const canAfford = selectedChildData ? selectedChildData.total_points >= reward.points_required : false
            
            return (
              <div key={reward.id} className={`bg-white rounded-xl shadow-sm p-6 border-2 transition-all ${
                canAfford ? 'border-green-200 hover:border-green-300' : 'border-gray-100 hover:border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{reward.name}</h3>
                    {reward.category && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full mb-2">
                        {reward.category}
                      </span>
                    )}
                  </div>
                  {isParent && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(reward)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(reward)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {reward.description && (
                  <p className="text-gray-600 text-sm mb-4">{reward.description}</p>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="font-semibold text-gray-800">{reward.points_required} 积分</span>
                  </div>
                  {canAfford && (
                    <span className="text-green-600 text-sm font-medium">可兑换</span>
                  )}
                </div>
                
                {selectedChild !== 'all' && (
                  <button
                    onClick={() => handleRedeemClick(reward)}
                    disabled={!canAfford}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      canAfford
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4 inline mr-2" />
                    {canAfford ? '立即兑换' : '积分不足'}
                  </button>
                )}
                
                {selectedChild === 'all' && (
                  <div className="text-center text-gray-500 text-sm">
                    请先选择要兑换的儿童
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 兑换确认弹窗 */}
      {showRedeemModal && redeemingReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">确认兑换</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择兑换的儿童
                </label>
                <select
                  value={redeemChildId}
                  onChange={(e) => setRedeemChildId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                >
                  <option value="">请选择儿童</option>
                  {children.filter(child => child.total_points >= redeemingReward.points_required).map(child => (
                    <option key={child.id} value={child.id}>
                      {child.name} (当前积分: {child.total_points})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">{redeemingReward.name}</h4>
                <p className="text-gray-600 text-sm mb-2">{redeemingReward.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">所需积分:</span>
                  <span className="font-semibold text-yellow-600">{redeemingReward.points_required}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRedeemModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRedeemConfirm}
                disabled={!redeemChildId || submitting}
                className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4 mr-2" />
                {submitting ? '兑换中...' : '确认兑换'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}