import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}