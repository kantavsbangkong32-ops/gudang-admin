import { Navigate, Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/client/products', label: 'Produk', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { to: '/client/cart', label: 'Keranjang', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
  { to: '/client/orders', label: 'Pesanan Saya', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
]

export default function ClientLayout() {
  const { user, profile, loading, logout } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile?.role?.toUpperCase() === 'ADMIN') return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between gap-2 sm:gap-8 h-16">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <div className="w-8 h-8 bg-shopee rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <span className="font-bold text-gray-800 hidden sm:inline">Gudang</span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-shopee-light text-shopee font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                      <span className="hidden sm:inline">{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
              <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                <span className="hidden sm:block text-sm text-gray-500 truncate max-w-[120px]">{profile?.username || 'User'}</span>
                <button
                  onClick={logout}
                  className="text-[13px] sm:text-sm text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap"
                >
                  Keluar
                </button>
              </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
        <Outlet />
      </main>
    </div>
  )
}
