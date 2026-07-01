import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
export default function ClientProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [cartWiggle, setCartWiggle] = useState(false)
  useEffect(() => {
    supabase
      .from('items')
      .select('*, categories(name)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProduct(data)
        setLoading(false)
      })
  }, [id])

  function parsePhotos(photoUrl) {
    if (!photoUrl) return []
    try { const p = JSON.parse(photoUrl); return Array.isArray(p) ? p : [photoUrl] }
    catch { return [photoUrl] }
  }

  async function addToCart() {
    if (!user) { navigate('/login'); return }
    if (!product) return
    setAdding(true)

    let { data: draft, error: draftError } = await supabase
      .from('orders')
      .select('id')
      .eq('client_id', user.id)
      .eq('status', 'draft')
      .maybeSingle()

    if (draftError) { setAdding(false); return }

    if (!draft) {
      const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert({ client_id: user.id, status: 'draft' })
        .select('id')
        .single()
      if (createError || !newOrder) { setAdding(false); return }
      draft = newOrder
    }

    const { data: existing, error: checkError } = await supabase
      .from('order_items')
      .select('id, qty')
      .eq('order_id', draft.id)
      .eq('item_id', product.id)
      .maybeSingle()

    if (checkError) { setAdding(false); return }

    if (existing) {
      await supabase
        .from('order_items')
        .update({ qty: existing.qty + 1 })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('order_items')
        .insert({ order_id: draft.id, item_id: product.id, qty: 1, price_at_order: product.price })
    }

    setAdding(false)
    setCartWiggle(true)
    setTimeout(() => setCartWiggle(false), 500)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Produk tidak ditemukan.</p>
        <button onClick={() => navigate('/client/products')} className="mt-4 text-sm text-shopee hover:underline">
          Kembali ke Produk
        </button>
      </div>
    )
  }

  const photos = parsePhotos(product.photo_url)

  return (
    <div>
      <button
        onClick={() => navigate('/client/products')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali
      </button>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 lg:w-2/5">
            <div
              className="relative bg-gray-50 cursor-pointer"
              onClick={() => photos.length > 0 && setFullscreen(true)}
            >
              {photos.length > 0 ? (
                <img src={photos[selectedPhoto]} alt={product.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-200">
                  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {product.is_terbaru && (
                <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                  ★ Baru
                </span>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPhoto(i)}
                    className={`w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      i === selectedPhoto ? 'border-shopee' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 md:p-6 md:w-1/2 lg:w-3/5 flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{product.name}</h1>
              {product.kode_item && (
                <p className="text-sm text-gray-400 mt-1">Barcode: {product.kode_item}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {product.categories?.name && (
                <div>
                  <span className="text-gray-400">Jenis</span>
                  <p className="font-medium text-gray-700">{product.categories.name}</p>
                </div>
              )}
              {product.jenis && (
                <div>
                  <span className="text-gray-400">Supplier</span>
                  <p className="font-medium text-gray-700">{product.jenis}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400">Stok</span>
                <p className={`font-semibold ${product.stock > 0 ? 'text-shopee' : 'text-red-500'}`}>
                  {product.stock ?? 0}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-auto">
              <button
                onClick={addToCart}
                disabled={adding || product.stock <= 0}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                  cartWiggle ? 'animate-wiggle' : ''
                } ${
                  product.stock <= 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-shopee hover:bg-shopee-dark text-white'
                }`}
              >
                {adding ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : product.stock <= 0 ? (
                  'Stok Habis'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                    Tambah ke Keranjang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {fullscreen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedPhoto((selectedPhoto - 1 + photos.length) % photos.length) }}
                className="absolute left-4 text-white/80 hover:text-white z-10"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedPhoto((selectedPhoto + 1) % photos.length) }}
                className="absolute right-4 text-white/80 hover:text-white z-10"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          <img src={photos[selectedPhoto]} alt="" className="max-w-full max-h-full object-contain p-4" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-6 text-white/60 text-sm">
            {selectedPhoto + 1} / {photos.length}
          </div>
        </div>
      )}

      {cartWiggle && (
        <div className="fixed bottom-6 right-6 z-40 bg-green-500 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center animate-wiggle">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  )
}
