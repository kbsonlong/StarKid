import { Star, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '../store'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { user, family, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo区域 */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Star className="h-8 w-8 text-yellow-500 fill-current" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">小星星成长记</h1>
              <p className="text-sm text-gray-500">StarKid Growth</p>
            </div>
          </div>

          {/* 用户信息区域 */}
          <div className="flex items-center space-x-4">
            {family && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{family.name}</span>
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {family.invite_code}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user?.name}</span>
                <span className="block text-xs text-gray-500">{user?.role === 'parent' ? '家长' : '儿童'}</span>
              </div>
              
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="设置"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}