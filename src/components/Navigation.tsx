import { NavLink } from 'react-router-dom'
import { 
  Home, 
  BookOpen, 
  Activity, 
  Gift, 
  BarChart3,
  Users,
  UserPlus,
  Settings,
  X
} from 'lucide-react'
import { cn } from '../lib/utils'

const navigationItems = [
  {
    name: '首页',
    href: '/',
    icon: Home
  },
  {
    name: '规则管理',
    href: '/rules',
    icon: BookOpen
  },
  {
    name: '行为记录',
    href: '/behaviors',
    icon: Activity
  },
  {
    name: '积分兑换',
    href: '/rewards',
    icon: Gift
  },
  {
    name: '统计报告',
    href: '/reports',
    icon: BarChart3
  },
  {
    name: '互动社区',
    href: '/community',
    icon: Users
  },
  {
    name: '家长协作',
    href: '/collaborate',
    icon: UserPlus
  },
  {
    name: '设置',
    href: '/settings',
    icon: Settings
  }
]

interface NavigationProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Navigation({ isOpen = true, onClose }: NavigationProps) {
  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* 导航栏 */}
      <nav className={cn(
        "bg-white shadow-sm border-r border-yellow-200 min-h-screen transition-transform duration-300 ease-in-out z-50",
        "md:w-64 md:translate-x-0 md:relative md:block",
        "fixed top-0 left-0 w-64 h-full",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* 移动端关闭按钮 */}
        <div className="md:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-3 xs:p-4 sm:p-6">
          <ul className="space-y-1 xs:space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    onClick={onClose} // 移动端点击后关闭菜单
                    className={({ isActive }) =>
                      cn(
                        'flex items-center space-x-2 xs:space-x-3 px-3 xs:px-4 py-2.5 xs:py-3 rounded-lg text-xs xs:text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 xs:h-5 w-5" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </>
  )
}