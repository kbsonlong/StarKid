import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Activity, 
  Gift, 
  BarChart3, 
  Plus,
  Star,
  Users,
  Trophy
} from 'lucide-react'
import { useAuthStore, useRulesStore, useBehaviorsStore } from '../store'
import { getPointsColor, getPointsBgColor } from '../lib/utils'

export function Home() {
  const { user, family, children } = useAuthStore()
  const { rules, loadRules } = useRulesStore()
  const { behaviors, loadBehaviors } = useBehaviorsStore()

  useEffect(() => {
    if (family) {
      loadRules()
      loadBehaviors(family.id)
    }
  }, [family, loadRules, loadBehaviors])

  const quickActions = [
    {
      name: '管理规则',
      description: '设置奖励和惩罚规则',
      href: '/rules',
      icon: BookOpen,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      name: '记录行为',
      description: '记录孩子的表现',
      href: '/behaviors',
      icon: Activity,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      name: '积分兑换',
      description: '查看和兑换奖励',
      href: '/rewards',
      icon: Gift,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      name: '成长报告',
      description: '查看统计分析',
      href: '/reports',
      icon: BarChart3,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    }
  ]

  const recentBehaviors = behaviors.slice(0, 5)
  const totalPoints = children.reduce((sum, child) => sum + child.total_points, 0)

  if (!family) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <Star className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">欢迎使用小星星成长记</h2>
          <p className="text-gray-600 mb-6">请先创建或加入一个家庭来开始使用</p>
          <Link
            to="/settings"
            className="inline-flex items-center px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            创建家庭
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 xs:space-y-6 sm:space-y-8">
      {/* 欢迎区域 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 xs:p-6 sm:p-8">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-4 xs:space-y-0">
          <div>
            <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              欢迎回来，{user?.name}！
            </h1>
            <p className="text-sm xs:text-base text-gray-600">
              今天也要和孩子们一起努力成长哦 ✨
            </p>
          </div>
          <div className="text-left xs:text-right">
            <div className="text-xs xs:text-sm text-gray-500 mb-1">家庭总积分</div>
            <div className={`text-2xl xs:text-3xl font-bold ${getPointsColor(totalPoints)}`}>
              {totalPoints}
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-3 xs:p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 xs:p-3 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 xs:h-5 w-5 sm:h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-2 xs:ml-3 sm:ml-4">
              <p className="text-xs xs:text-sm text-gray-500">家庭成员</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-800">{children.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-3 xs:p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 xs:p-3 bg-green-100 rounded-lg">
              <BookOpen className="h-4 w-4 xs:h-5 w-5 sm:h-6 w-6 text-green-600" />
            </div>
            <div className="ml-2 xs:ml-3 sm:ml-4">
              <p className="text-xs xs:text-sm text-gray-500">活跃规则</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-800">{rules.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-3 xs:p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 xs:p-3 bg-purple-100 rounded-lg">
              <Activity className="h-4 w-4 xs:h-5 w-5 sm:h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-2 xs:ml-3 sm:ml-4">
              <p className="text-xs xs:text-sm text-gray-500">今日记录</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-800">
                {behaviors.filter(b => 
                  new Date(b.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-3 xs:p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 xs:p-3 bg-yellow-100 rounded-lg">
              <Trophy className="h-4 w-4 xs:h-5 w-5 sm:h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-2 xs:ml-3 sm:ml-4">
              <p className="text-xs xs:text-sm text-gray-500">总积分</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-800">{totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div>
        <h2 className="text-lg xs:text-xl font-semibold text-gray-800 mb-4 xs:mb-6">快速操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.name}
                to={action.href}
                className="bg-white rounded-xl shadow-sm p-3 xs:p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className={`inline-flex p-2 xs:p-3 rounded-lg ${action.color} ${action.hoverColor} transition-colors group-hover:scale-110 transform duration-200`}>
                  <Icon className="h-4 w-4 xs:h-5 w-5 sm:h-6 w-6 text-white" />
                </div>
                <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-gray-800 mt-2 xs:mt-3 sm:mt-4 mb-1 xs:mb-2">
                  {action.name}
                </h3>
                <p className="text-gray-600 text-xs xs:text-sm">
                  {action.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 儿童积分概览 */}
      {children.length > 0 && (
        <div>
          <h2 className="text-lg xs:text-xl font-semibold text-gray-800 mb-4 xs:mb-6">儿童积分概览</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
            {children.map((child) => (
              <div key={child.id} className="bg-white rounded-xl shadow-sm p-4 xs:p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3 xs:mb-4">
                  <h3 className="text-base xs:text-lg font-semibold text-gray-800">{child.name}</h3>
                  <div className={`px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm font-medium ${getPointsBgColor(child.total_points)} ${getPointsColor(child.total_points)}`}>
                    {child.total_points} 积分
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs xs:text-sm">
                    <span className="text-gray-500">年龄</span>
                    <span className="text-gray-800">
                      {child.birth_date ? 
                        new Date().getFullYear() - new Date(child.birth_date).getFullYear() 
                        : '未设置'
                      } 岁
                    </span>
                  </div>
                  <div className="flex justify-between text-xs xs:text-sm">
                    <span className="text-gray-500">今日行为</span>
                    <span className="text-gray-800">
                      {behaviors.filter(b => 
                        b.child_id === child.id && 
                        new Date(b.created_at).toDateString() === new Date().toDateString()
                      ).length} 次
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近行为记录 */}
      {recentBehaviors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 xs:mb-6">
            <h2 className="text-lg xs:text-xl font-semibold text-gray-800">最近行为记录</h2>
            <Link
              to="/behaviors"
              className="text-yellow-600 hover:text-yellow-700 text-xs xs:text-sm font-medium"
            >
              查看全部 →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {recentBehaviors.map((behavior) => (
                <div key={behavior.id} className="p-3 xs:p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 xs:space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      behavior.points_change > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-sm xs:text-base font-medium text-gray-800">
                        {behavior.rules?.name || '未知规则'}
                      </p>
                      <p className="text-xs xs:text-sm text-gray-500">
                        {behavior.children?.name || '未知儿童'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm xs:text-base font-semibold ${
                      behavior.points_change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {behavior.points_change > 0 
                        ? `+${behavior.points_change}` 
                        : `扣${Math.abs(behavior.points_change)}分`
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(behavior.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}