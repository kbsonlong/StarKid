import { useState, useEffect, useMemo } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Award, 
  Target,
  Download,
  Filter,
  Star,
  Trophy,
  Activity,
  Users
} from 'lucide-react'
import { useAuthStore, useBehaviorsStore, useRulesStore } from '../store'
import { formatDate, getPointsColor, getPointsBgColor } from '../lib/utils'

type TimeRange = '7d' | '30d' | '90d' | '1y'
type ReportType = 'overview' | 'behavior' | 'progress' | 'comparison'

interface BehaviorStats {
  date: string
  positive: number
  negative: number
  total: number
  points: number
}

interface ChildProgress {
  childId: string
  childName: string
  totalBehaviors: number
  positiveRate: number
  totalPoints: number
  averagePoints: number
  improvementTrend: 'up' | 'down' | 'stable'
}

export function Reports() {
  const { children, user, family } = useAuthStore()
  const { behaviors, loadBehaviors } = useBehaviorsStore()
  const { rules } = useRulesStore()
  
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [reportType, setReportType] = useState<ReportType>('overview')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (family) {
        setLoading(true)
        await loadBehaviors(family.id)
        setLoading(false)
      }
    }
    loadData()
  }, [family, loadBehaviors])

  // 计算时间范围
  const getDateRange = (range: TimeRange) => {
    const now = new Date()
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[range]
    
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return { startDate, endDate: now }
  }

  // 过滤行为数据
  const filteredBehaviors = useMemo(() => {
    const { startDate, endDate } = getDateRange(timeRange)
    return behaviors.filter(behavior => {
      const behaviorDate = new Date(behavior.created_at)
      const childMatch = selectedChild === 'all' || behavior.child_id === selectedChild
      const dateMatch = behaviorDate >= startDate && behaviorDate <= endDate
      return childMatch && dateMatch
    })
  }, [behaviors, timeRange, selectedChild])

  // 计算每日统计数据
  const dailyStats = useMemo(() => {
    const { startDate, endDate } = getDateRange(timeRange)
    const stats: BehaviorStats[] = []
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayBehaviors = filteredBehaviors.filter(b => 
        b.created_at.split('T')[0] === dateStr
      )
      
      const positive = dayBehaviors.filter(b => {
        const rule = rules.find(r => r.id === b.rule_id)
        return rule?.type === 'reward'
      }).length
      
      const negative = dayBehaviors.filter(b => {
        const rule = rules.find(r => r.id === b.rule_id)
        return rule?.type === 'punishment'
      }).length
      
      const points = dayBehaviors.reduce((sum, b) => sum + b.points_earned, 0)
      
      stats.push({
        date: dateStr,
        positive,
        negative,
        total: positive + negative,
        points
      })
    }
    
    return stats
  }, [filteredBehaviors, rules, timeRange])

  // 计算儿童进步数据
  const childrenProgress = useMemo(() => {
    return children.map(child => {
      const childBehaviors = filteredBehaviors.filter(b => b.child_id === child.id)
      const totalBehaviors = childBehaviors.length
      
      const positiveBehaviors = childBehaviors.filter(b => {
        const rule = rules.find(r => r.id === b.rule_id)
        return rule?.type === 'reward'
      }).length
      
      const positiveRate = totalBehaviors > 0 ? (positiveBehaviors / totalBehaviors) * 100 : 0
      const totalPoints = childBehaviors.reduce((sum, b) => sum + b.points_earned, 0)
      const averagePoints = totalBehaviors > 0 ? totalPoints / totalBehaviors : 0
      
      // 计算趋势（简化版本，比较前后两周）
      const midPoint = Math.floor(dailyStats.length / 2)
      const firstHalf = dailyStats.slice(0, midPoint)
      const secondHalf = dailyStats.slice(midPoint)
      
      const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.points, 0) / firstHalf.length || 0
      const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.points, 0) / secondHalf.length || 0
      
      let improvementTrend: 'up' | 'down' | 'stable' = 'stable'
      if (secondHalfAvg > firstHalfAvg * 1.1) improvementTrend = 'up'
      else if (secondHalfAvg < firstHalfAvg * 0.9) improvementTrend = 'down'
      
      return {
        childId: child.id,
        childName: child.name,
        totalBehaviors,
        positiveRate,
        totalPoints,
        averagePoints,
        improvementTrend
      }
    })
  }, [children, filteredBehaviors, rules, dailyStats])

  // 总体统计
  const overallStats = useMemo(() => {
    const totalBehaviors = filteredBehaviors.length
    const positiveBehaviors = filteredBehaviors.filter(b => {
      const rule = rules.find(r => r.id === b.rule_id)
      return rule?.type === 'reward'
    }).length
    const totalPoints = filteredBehaviors.reduce((sum, b) => sum + b.points_earned, 0)
    const averagePointsPerDay = dailyStats.reduce((sum, s) => sum + s.points, 0) / dailyStats.length || 0
    
    return {
      totalBehaviors,
      positiveBehaviors,
      positiveRate: totalBehaviors > 0 ? (positiveBehaviors / totalBehaviors) * 100 : 0,
      totalPoints,
      averagePointsPerDay
    }
  }, [filteredBehaviors, rules, dailyStats])

  const timeRangeOptions = [
    { value: '7d', label: '最近7天' },
    { value: '30d', label: '最近30天' },
    { value: '90d', label: '最近90天' },
    { value: '1y', label: '最近1年' }
  ]

  const reportTypeOptions = [
    { value: 'overview', label: '总览', icon: BarChart3 },
    { value: 'behavior', label: '行为分析', icon: Activity },
    { value: 'progress', label: '成长进度', icon: TrendingUp },
    { value: 'comparison', label: '对比分析', icon: Users }
  ]

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="text-gray-500 mt-2">加载统计数据中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和筛选器 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">统计报告</h1>
          <p className="text-gray-600 mt-1">分析孩子的行为表现和成长趋势</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="all">全部儿童</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          
          <button className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </button>
        </div>
      </div>

      {/* 报告类型选择 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap gap-2">
          {reportTypeOptions.map(option => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => setReportType(option.value as ReportType)}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  reportType === option.value
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 总览报告 */}
      {reportType === 'overview' && (
        <div className="space-y-6">
          {/* 关键指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">总行为记录</p>
                  <p className="text-2xl font-bold text-gray-800">{overallStats.totalBehaviors}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">积极行为率</p>
                  <p className="text-2xl font-bold text-green-600">{overallStats.positiveRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">总积分</p>
                  <p className="text-2xl font-bold text-yellow-600">{overallStats.totalPoints}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">日均积分</p>
                  <p className="text-2xl font-bold text-purple-600">{overallStats.averagePointsPerDay.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* 趋势图表 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">行为趋势</h3>
            <div className="space-y-4">
              {dailyStats.slice(-14).map((stat, index) => (
                <div key={stat.date} className="flex items-center space-x-4">
                  <div className="w-20 text-sm text-gray-600">
                    {formatDate(stat.date)}
                  </div>
                  <div className="flex-1 flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stat.total > 0 ? (stat.positive / stat.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="w-16 text-sm text-gray-600 text-right">
                      {stat.total} 次
                    </div>
                    <div className={`w-16 text-sm text-right font-medium ${getPointsColor(stat.points)}`}>
                      +{stat.points}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 成长进度报告 */}
      {reportType === 'progress' && (
        <div className="space-y-6">
          {childrenProgress.map(progress => (
            <div key={progress.childId} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">{progress.childName} 的成长报告</h3>
                <div className="flex items-center space-x-2">
                  {progress.improvementTrend === 'up' && (
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">进步中</span>
                    </div>
                  )}
                  {progress.improvementTrend === 'down' && (
                    <div className="flex items-center text-red-600">
                      <TrendingUp className="h-4 w-4 mr-1 transform rotate-180" />
                      <span className="text-sm font-medium">需关注</span>
                    </div>
                  )}
                  {progress.improvementTrend === 'stable' && (
                    <div className="flex items-center text-gray-600">
                      <Target className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">稳定</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{progress.totalBehaviors}</div>
                  <div className="text-sm text-gray-600">总行为次数</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{progress.positiveRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">积极行为率</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getPointsColor(progress.totalPoints)}`}>
                    {progress.totalPoints}
                  </div>
                  <div className="text-sm text-gray-600">累计积分</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{progress.averagePoints.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">平均积分</div>
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">积极行为表现</span>
                  <span className="text-sm text-gray-600">{progress.positiveRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress.positiveRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 对比分析 */}
      {reportType === 'comparison' && children.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">儿童对比分析</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">姓名</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">行为次数</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">积极率</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">总积分</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">平均积分</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">趋势</th>
                </tr>
              </thead>
              <tbody>
                {childrenProgress.map(progress => (
                  <tr key={progress.childId} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-800">{progress.childName}</td>
                    <td className="py-3 px-4 text-center">{progress.totalBehaviors}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-green-600 font-medium">{progress.positiveRate.toFixed(1)}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${getPointsColor(progress.totalPoints)}`}>
                        {progress.totalPoints}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">{progress.averagePoints.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center">
                      {progress.improvementTrend === 'up' && (
                        <span className="inline-flex items-center text-green-600">
                          <TrendingUp className="h-4 w-4" />
                        </span>
                      )}
                      {progress.improvementTrend === 'down' && (
                        <span className="inline-flex items-center text-red-600">
                          <TrendingUp className="h-4 w-4 transform rotate-180" />
                        </span>
                      )}
                      {progress.improvementTrend === 'stable' && (
                        <span className="inline-flex items-center text-gray-600">
                          <Target className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 行为分析 */}
      {reportType === 'behavior' && (
        <div className="space-y-6">
          {/* 行为分类统计 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">行为分类分析</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">积极行为</h4>
                <div className="space-y-2">
                  {rules.filter(rule => rule.type === 'reward').map(rule => {
                    const count = filteredBehaviors.filter(b => b.rule_id === rule.id).length
                    const percentage = overallStats.totalBehaviors > 0 ? (count / overallStats.totalBehaviors) * 100 : 0
                    
                    return (
                      <div key={rule.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{rule.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-800 w-8">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-3">需要改进的行为</h4>
                <div className="space-y-2">
                  {rules.filter(rule => rule.type === 'punishment').map(rule => {
                    const count = filteredBehaviors.filter(b => b.rule_id === rule.id).length
                    const percentage = overallStats.totalBehaviors > 0 ? (count / overallStats.totalBehaviors) * 100 : 0
                    
                    return (
                      <div key={rule.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{rule.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-800 w-8">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}