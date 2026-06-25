import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState([])
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const [showFullImage, setShowFullImage] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: cats } = await supabase.from('categories').select('*')
      setCategories(cats || [])

      const { data, error } = await supabase
        .from('items')
        .select('*, categories(name)')
        .eq('id', id)
        .single()
      if (!error) {
        setProduct(data)
        const parsed = parsePhotos(data.photo_url)
        setPhotos(parsed)
        setCurrentPhoto(0)
      }
      setLoading(false)
    }
    load()
  }, [id])

  function startEditing() {
    setEditForm({
      name: product.name,
      price: product.price,
      supplier: product.supplier || '',
      kode_item: product.kode_item || '',
      category_id: product.category_id || '',
      stock: product.stock ?? 0,
    })
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditForm({})
  }

  async function saveEditing() {
    setSaving(true)
    const payload = {
      name: editForm.name,
      price: parseInt(editForm.price) || 0,
      supplier: editForm.supplier || null,
      kode_item: editForm.kode_item || null,
      status: editForm.status,
      category_id: editForm.category_id || null,
      stock: parseInt(editForm.stock) || 0,
    }
    const { error } = await supabase.from('items').update(payload).eq('id', id)
    if (!error) {
      setProduct({ ...product, ...payload })
      setIsEditing(false)
    }
    setSaving(false)
  }

  function parsePhotos(photoUrl) {
    if (!photoUrl) return []
    try { const p = JSON.parse(photoUrl); return Array.isArray(p) ? p : [photoUrl] }
    catch { return [photoUrl] }
  }

  async function deleteProduct() {
    if (!confirm('Hapus produk ini?')) return
    const paths = photos.map((url) => {
      const parts = url.split('/photos/')
      return parts.length > 1 ? parts[1] : null
    }).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from('photos').remove(paths)
    }
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (!error) navigate('/products', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <p className="text-gray-400">Produk tidak ditemukan</p>
        <Link to="/products" className="text-sm text-blue-600 hover:underline">Kembali</Link>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="bg-[#f5f5f5] min-h-screen">
      <div className="max-w-[1300px] mx-auto px-5 py-4">
        <button onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-4 transition group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke produk
        </button>

        <div className="flex items-center h-10 text-xs text-gray-500">
          <Link to="/products" className="hover:text-blue-600 no-underline text-gray-500">Home</Link>
          <svg className="w-3 h-3 mx-1.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="truncate">{product.categories?.name || 'Kategori'}</span>
          <svg className="w-3 h-3 mx-1.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700 font-medium truncate max-w-[300px]">{product.name}</span>
        </div>

        <div className="bg-white p-5" style={{ borderRadius: 4 }}>
          <div className="grid grid-cols-1 lg:grid-cols-[390px_1fr] gap-[30px]">
            <div>
              <div className="w-full aspect-square max-w-[390px] bg-gray-50 overflow-hidden relative" style={{ borderRadius: 4 }}>
                {photos[currentPhoto] ? (
                  <img src={photos[currentPhoto]} alt={product.name}
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => setShowFullImage(true)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {photos.length > 0 && (
                <div className="flex gap-[10px] mt-3">
                  {photos.map((url, i) => (
                    <button key={i} onClick={() => setCurrentPhoto(i)}
                      className={`w-[70px] h-[70px] shrink-0 overflow-hidden border-2 ${i === currentPhoto ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'}`} style={{ borderRadius: 4 }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {showFullImage && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowFullImage(false)}>
                  <button onClick={() => setShowFullImage(false)}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition z-10">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {photos.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setCurrentPhoto((p) => (p === 0 ? photos.length - 1 : p - 1)) }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition z-10">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setCurrentPhoto((p) => (p === photos.length - 1 ? 0 : p + 1)) }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition z-10">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                  <img src={photos[currentPhoto]} alt={product.name}
                    className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
                </div>
              )}

            </div>

            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                {isEditing ? (
                  <input type="text" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-[32px] font-bold text-gray-800 leading-tight w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none" />
                ) : (
                  <h1 className="text-[32px] font-bold text-gray-800 leading-tight line-clamp-2">
                    {product.name}
                  </h1>
                )}
              </div>

              {isEditing ? (
                <div className="bg-[#f5f5f5] p-4 rounded" style={{ borderRadius: 4 }}>
                  <label className="text-xs text-gray-400 mb-1 block">Harga</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 font-bold">Rp</span>
                    <input type="number" value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full pl-12 pr-4 py-2 text-[32px] font-bold text-blue-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none" min="0" />
                  </div>
                </div>
              ) : (
                <div className="bg-[#f5f5f5] p-4 flex items-center h-20" style={{ borderRadius: 4 }}>
                  <p className="text-[40px] font-bold text-blue-600 leading-none">
                    Rp {Number(product.price).toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-4">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Supplier</p>
                        <input type="text" value={editForm.supplier}
                          onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Kode Item</p>
                        <input type="text" value={editForm.kode_item}
                          onChange={(e) => setEditForm({ ...editForm, kode_item: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Kategori</p>
                        <select value={editForm.category_id}
                          onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none">
                          <option value="">Pilih kategori</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400">Stok</p>
                        <input type="number" value={editForm.stock}
                          onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none" min="0" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {product.supplier && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Supplier</p>
                          <p className="text-sm font-medium text-gray-700">{product.supplier}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Kode Item</p>
                        <p className="text-base font-bold text-gray-800">{product.kode_item || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Stok</p>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-gray-800">{product.stock ?? 0}</p>
                          <button onClick={async () => {
                            const newVal = !product.is_terbaru
                            const payload = { is_terbaru: newVal }
                            if (newVal) payload.stock_updated_at = new Date().toISOString()
                            const { error } = await supabase.from('items').update(payload).eq('id', product.id)
                            if (!error) setProduct({ ...product, ...payload })
                          }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                              product.is_terbaru ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                            }`}>
                            {product.is_terbaru ? '★ Terbaru' : '☆ Terbaru'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Ditambahkan</p>
                    <p className="text-sm font-medium text-gray-700">{new Date(product.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                {product.updated_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Terakhir diupdate</p>
                      <p className="text-sm font-medium text-gray-700">{new Date(product.updated_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6 mb-8">
          {isEditing ? (
            <>
              <button onClick={saveEditing} disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50" style={{ borderRadius: 2 }}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan...
                  </span>
                ) : 'Simpan'}
              </button>
              <button onClick={cancelEditing}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition" style={{ borderRadius: 2 }}>
                Batal
              </button>
            </>
          ) : (
            <>
              <button onClick={startEditing}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition" style={{ borderRadius: 2 }}>
                Edit Produk
              </button>
              <button onClick={deleteProduct}
                className="px-6 py-2.5 border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition" style={{ borderRadius: 2 }}>
                Hapus
              </button>
            </>
          )}
          <button onClick={() => navigate('/products')}
            className="px-6 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition" style={{ borderRadius: 2 }}>
            Kembali
          </button>
        </div>
      </div>
    </div>
  )
}
