import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  AlertTriangle,
  Save,
  X
} from 'lucide-react'
import { useRulesStore } from '../store'
import { Rule } from '../lib/supabase'

interface RuleFormData {
  name: string
  description: string
  points: number
  type: 'reward' | 'punishment'
  category: string
}

const initialFormData: RuleFormData = {
  name: '',
  description: '',
  points: 0,
  type: 'reward',
  category: ''
}

const categories = [
  '学习',
  '生活习惯',
  '社交礼仪',
  '运动健康',
  '创造力',
  '责任感',
  '其他'
]

export function Rules() {
  const { rules, loading, loadRules, createRule, updateRule, deleteRule } = useRulesStore()
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [formData, setFormData] = useState<RuleFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'reward' | 'punishment'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    loadRules()
  }, [])

  const filteredRules = rules.filter(rule => {
    const typeMatch = filter === 'all' || rule.type === filter
    const categoryMatch = categoryFilter === 'all' || rule.category === categoryFilter
    return typeMatch && categoryMatch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSubmitting(true)
    try {
      // 处理积分转换：惩罚类型的正数自动转为负数
      const processedFormData = {
        ...formData,
        points: formData.type === 'punishment' && formData.points > 0 
          ? -formData.points 
          : formData.points
      }
      
      if (editingRule) {
        await updateRule(editingRule.id, processedFormData)
      } else {
        await createRule({
          ...processedFormData,
          family_id: '', // 这个会在store中自动设置
          icon: '⭐', // 默认图标
          is_active: true
        })
      }
      handleCancel()
    } catch (error) {
      console.error('Failed to save rule:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      points: rule.type === 'punishment' && rule.points < 0 ? Math.abs(rule.points) : rule.points,
      type: rule.type,
      category: rule.category || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (rule: Rule) => {
    if (window.confirm(`确定要删除规则「${rule.name}」吗？`)) {
      await deleteRule(rule.id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRule(null)
    setFormData(initialFormData)
  }

  const rewardRules = filteredRules.filter(rule => rule.type === 'reward')
  const punishmentRules = filteredRules.filter(rule => rule.type === 'punishment')

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">规则管理</h1>
          <p className="text-gray-600 mt-1">设置奖励和惩罚规则，引导孩子养成好习惯</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          添加规则
        </button>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类型筛选</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'reward' | 'punishment')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="all">全部</option>
              <option value="reward">奖励</option>
              <option value="punishment">惩罚</option>
            </select>
          </div>
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
        </div>
      </div>

      {/* 规则表单 */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingRule ? '编辑规则' : '添加新规则'}
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
                  规则名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="请输入规则名称"
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
                规则描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                rows={3}
                placeholder="请描述这个规则的具体内容"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  类型 *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="reward"
                      checked={formData.type === 'reward'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'reward' | 'punishment' })}
                      className="mr-2 text-yellow-500 focus:ring-yellow-500"
                    />
                    <Star className="h-4 w-4 text-green-500 mr-1" />
                    奖励
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="punishment"
                      checked={formData.type === 'punishment'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'reward' | 'punishment' })}
                      className="mr-2 text-yellow-500 focus:ring-yellow-500"
                    />
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                    惩罚
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  积分变化 *
                </label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder={formData.type === 'reward' ? '正数表示奖励积分' : '输入扣除的积分数（正数）'}
                  required
                />
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

      {/* 规则列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 奖励规则 */}
          {(filter === 'all' || filter === 'reward') && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Star className="h-5 w-5 text-green-500 mr-2" />
                奖励规则 ({rewardRules.length})
              </h2>
              {rewardRules.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">还没有奖励规则，快来添加一个吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewardRules.map((rule) => (
                    <div key={rule.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">{rule.name}</h3>
                          {rule.category && (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full mb-2">
                              {rule.category}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {rule.description && (
                        <p className="text-gray-600 text-sm mb-3">{rule.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-green-600 font-semibold">+{rule.points} 积分</span>
                        <span className="text-xs text-gray-500">
                          创建于 {new Date(rule.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 惩罚规则 */}
          {(filter === 'all' || filter === 'punishment') && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                惩罚规则 ({punishmentRules.length})
              </h2>
              {punishmentRules.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">还没有惩罚规则，可以添加一些来规范行为。</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {punishmentRules.map((rule) => (
                    <div key={rule.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">{rule.name}</h3>
                          {rule.category && (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full mb-2">
                              {rule.category}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {rule.description && (
                        <p className="text-gray-600 text-sm mb-3">{rule.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-red-600 font-semibold">扣{Math.abs(rule.points)}分</span>
                        <span className="text-xs text-gray-500">
                          创建于 {new Date(rule.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}