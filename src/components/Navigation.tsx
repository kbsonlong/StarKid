import { NavLink } from 'react-router-dom'
import { 
  Home, 
  BookOpen, 
  Activity, 
  Gift, 
  BarChart3,
  Settings
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
    name: '设置',
    href: '/settings',
    icon: Settings
  }
]

export function Navigation() {
  return (
    <nav className="w-64 bg-white shadow-sm border-r border-yellow-200 min-h-screen">
      <div className="p-6">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}