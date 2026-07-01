import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const profileData = await login(email, password)
      if (profileData?.role?.toUpperCase() === 'ADMIN') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/client/products', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa email dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f5f5f5]">
      <div className="flex-1 hidden lg:flex items-center justify-center bg-gradient-to-br from-shopee to-shopee-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white rounded-full"></div>
        </div>
        <div className="relative z-10 text-center text-white px-12">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <span className="text-4xl font-bold">G</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Gudang Admin</h1>
          <p className="text-white/80 text-lg max-w-md">
            Panel administrasi untuk mengelola produk, pesanan, dan kategori
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 lg:hidden">
            <div className="w-14 h-14 bg-shopee rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">G</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Gudang Admin</h1>
            <p className="text-gray-400 text-sm mt-1">Masuk ke panel administrasi</p>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-1 hidden lg:block">Selamat Datang</h2>
          <p className="text-gray-400 text-sm mb-6 hidden lg:block">Silakan masuk dengan akun Admin Anda</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-shopee hover:bg-shopee-dark text-white font-medium py-3 rounded-lg transition disabled:opacity-50 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </span>
              ) : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Gudang Admin Panel v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
