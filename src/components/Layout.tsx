import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { Header } from './Header'
import { useState } from 'react'

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="max-w-7xl mx-auto flex">
        <Navigation isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className="flex-1 md:ml-0">
          <Header onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          <main className="p-3 xs:p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}