import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ClientCart() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('orders')
      .select('id')
      .eq('client_id', user.id)
      .eq('status', 'draft')
      .maybeSingle()
      .then(async ({ data: draft, error }) => {
        if (cancelled) return
        if (error || !draft) { if (!cancelled) setLoading(false); return }
        setDraft(draft)
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('*, items(*)')
          .eq('order_id', draft.id)
        if (!cancelled) {
          if (orderItems) setItems(orderItems)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  async function updateQty(itemId, newQty) {
    if (newQty < 1) return
    await supabase.from('order_items').update({ qty: newQty }).eq('id', itemId)
    setItems(items.map((i) => i.id === itemId ? { ...i, qty: newQty } : i))
  }

  async function removeItem(itemId) {
    await supabase.from('order_items').delete().eq('id', itemId)
    setItems(items.filter((i) => i.id !== itemId))
  }

  async function checkout() {
    if (!draft) return
    setCheckingOut(true)
    await supabase
      .from('orders')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', draft.id)
    setCheckingOut(false)
    navigate('/client/orders')
  }

  async function cancelDraft() {
    if (!draft) return
    setCancelling(true)
    await supabase.from('order_items').delete().eq('order_id', draft.id)
    await supabase.from('orders').delete().eq('id', draft.id)
    setCancelling(false)
    setDraft(null)
    setItems([])
  }

  function formatPrice(price) {
    return 'Rp ' + (price || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  function parsePhotos(photoUrl) {
    if (!photoUrl) return []
    try { const p = JSON.parse(photoUrl); return Array.isArray(p) ? p : [photoUrl] }
    catch { return [photoUrl] }
  }

  const total = items.reduce((sum, i) => sum + (i.price_at_order || 0) * i.qty, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="text-center py-20">
        <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p className="text-lg text-gray-400 mb-4">Keranjang masih kosong</p>
        <button
          onClick={() => navigate('/client/products')}
          className="bg-shopee hover:bg-shopee-dark text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
        >
          Lihat Produk
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Keranjang Belanja</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const photos = parsePhotos(item.items?.photo_url)
            return (
              <div key={item.id} className="flex items-center gap-4 p-4">
                <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                  {photos.length > 0 ? (
                    <img src={photos[0]} alt={item.items?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{item.items?.name}</p>
                  <p className="text-shopee font-semibold text-sm mt-0.5">{formatPrice(item.price_at_order)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    disabled={item.qty <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-lg"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium text-sm">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition text-lg"
                  >
                    +
                  </button>
                </div>
                <div className="text-right w-24">
                  <p className="font-semibold text-gray-800 text-sm">{formatPrice(item.price_at_order * item.qty)}</p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Total Belanja</span>
          <span className="text-2xl font-bold text-shopee">{formatPrice(total)}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={cancelDraft}
            disabled={cancelling}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
          >
            {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
          </button>
          <button
            onClick={checkout}
            disabled={checkingOut || items.length === 0}
            className="flex-1 px-4 py-2.5 bg-shopee hover:bg-shopee-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition text-sm font-medium"
          >
            {checkingOut ? 'Memproses...' : 'Buat Pesanan'}
          </button>
        </div>
      </div>
    </div>
  )
}
