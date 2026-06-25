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
          .select('*, items(name, kode_item)')
          .eq('order_id', draft.id)
        if (!cancelled) {
          if (orderItems) setItems(orderItems)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  function handleQtyChange(itemId, value) {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 1) return
    setItems(items.map((i) => i.id === itemId ? { ...i, qty: num } : i))
  }

  async function commitQty(itemId, qty) {
    if (qty < 1) return
    await supabase.from('order_items').update({ qty }).eq('id', itemId)
  }

  function increment(item) {
    const n = item.qty + 1
    setItems(items.map((i) => i.id === item.id ? { ...i, qty: n } : i))
    commitQty(item.id, n)
  }

  function decrement(item) {
    if (item.qty <= 1) return
    const n = item.qty - 1
    setItems(items.map((i) => i.id === item.id ? { ...i, qty: n } : i))
    commitQty(item.id, n)
  }

  async function removeItem(itemId) {
    await supabase.from('order_items').delete().eq('id', itemId)
    const newItems = items.filter((i) => i.id !== itemId)
    setItems(newItems)
    if (newItems.length === 0) {
      await supabase.from('orders').delete().eq('id', draft.id)
      setDraft(null)
    }
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
        <button
          onClick={() => navigate('/client/products')}
          className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali Belanja
        </button>
        <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p className="text-lg text-gray-400 mb-4">Keranjang masih kosong</p>
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/client/products')}
            className="bg-shopee hover:bg-shopee-dark text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
          >
            Lihat Produk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/client/products')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        Kembali Belanja
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Keranjang Belanja</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm leading-tight">{item.items?.name}</p>
                  {item.items?.kode_item && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.items.kode_item}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => decrement(item)}
                    disabled={item.qty <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-base"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => handleQtyChange(item.id, e.target.value)}
                    onBlur={() => commitQty(item.id, item.qty)}
                    className="w-12 text-center text-sm border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-shopee"
                  />
                  <button
                    onClick={() => increment(item)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition text-base"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors ml-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="Catatan (opsional)"
                value={item.notes || ''}
                onChange={(e) => setItems(items.map((i) => i.id === item.id ? { ...i, notes: e.target.value } : i))}
                onBlur={(e) => supabase.from('order_items').update({ notes: e.target.value || null }).eq('id', item.id)}
                className="mt-2 w-full text-xs border border-gray-200 rounded-lg py-1.5 px-2 focus:outline-none focus:border-shopee"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
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
  )
}
