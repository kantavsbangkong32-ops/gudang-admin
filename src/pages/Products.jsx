import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('items')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })
    if (!error) setProducts(data || [])
    setLoading(false)
  }

  function parsePhotos(photoUrl) {
    if (!photoUrl) return []
    try { const p = JSON.parse(photoUrl); return Array.isArray(p) ? p : [photoUrl] }
    catch { return [photoUrl] }
  }

  async function deleteProduct(id, photoUrl) {
    if (!confirm('Hapus produk ini?')) return
    const paths = parsePhotos(photoUrl).map((url) => {
      const parts = url.split('/photos/')
      return parts.length > 1 ? parts[1] : null
    }).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from('photos').remove(paths)
    }
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (!error) setProducts(products.filter((p) => p.id !== id))
  }

  async function toggleTerbaru(id, currentVal, e) {
    e.preventDefault()
    e.stopPropagation()
    const newVal = !currentVal
    const { error } = await supabase.from('items').update({ is_terbaru: newVal }).eq('id', id)
    if (!error) {
      setProducts(products.map((p) => p.id === id ? { ...p, is_terbaru: newVal } : p))
    }
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Produk</h1>
          <p className="text-sm text-gray-400 mt-0.5">{products.length} produk tersedia</p>
        </div>
        <Link
          to="/products/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Produk
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 transition text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-400">Belum ada produk.</p>
          <p className="text-sm text-gray-300 mt-1">Klik "Tambah Produk" untuk mulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((product) => (
            <Link to={`/products/${product.id}`} key={product.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 group block">
              <div className="relative bg-gray-50">
                {product.photo_url ? (
                  <img src={parsePhotos(product.photo_url)[0] || product.photo_url} alt={product.name} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-gray-200">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <button onClick={(e) => toggleTerbaru(product.id, product.is_terbaru, e)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-sm border border-white/50 cursor-pointer transition ${
                      product.is_terbaru ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}>
                    {product.is_terbaru ? '★ Terbaru' : '☆ Terbaru'}
                  </button>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-white/50 ${
                    product.status === 'ready' ? 'bg-green-500 text-white' :
                    product.status === 'not_ready' ? 'bg-red-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {product.status === 'not_ready' ? 'Not Ready' : product.status || 'ready'}
                  </span>
                </div>
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                  <Link to={`/products/edit/${product.id}`}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-sm"
                    onClick={(e) => e.stopPropagation()}>
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteProduct(product.id, product.photo_url) }}
                    className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-sm">
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{product.name}</p>
                  <p className="text-[11px] font-semibold text-gray-500 shrink-0 mt-0.5">{product.kode_item || '-'}</p>
                </div>
                <p className="text-base font-bold text-blue-600">
                  Rp {Number(product.price).toLocaleString('id-ID')}
                </p>
                <div className="border-t border-gray-100 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-blue-600">Stok: {product.stock ?? 0}</p>
                    <p className="text-[10px] text-gray-400 text-right">{product.categories?.name || 'Uncategorized'}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
