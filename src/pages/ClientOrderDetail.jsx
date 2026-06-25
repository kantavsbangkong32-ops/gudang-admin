import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  processing: 'bg-orange-100 text-orange-700 border-orange-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
}

const statusLabels = {
  pending: 'Pending',
  rejected: 'Ditolak',
  processing: 'Diproses',
  completed: 'Selesai',
}

export default function ClientOrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('client_id', user.id)
      .single()
      .then(async ({ data: orderData }) => {
        if (orderData) {
          setOrder(orderData)
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('*, items(*, categories(name))')
            .eq('order_id', orderData.id)
          setItems(orderItems || [])
        }
        setLoading(false)
      })
  }, [id])

  async function cancelOrder() {
    if (!confirm('Batalkan pesanan ini?')) return
    setCancelling(true)
    await supabase.from('orders').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id)
    setCancelling(false)
    await loadOrder()
  }

  async function loadOrder() {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('client_id', user.id)
      .single()
    if (orderData) {
      setOrder(orderData)
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, items(*, categories(name))')
        .eq('order_id', orderData.id)
      setItems(orderItems || [])
    }
  }

  function formatPrice(price) {
    return 'Rp ' + (price || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Pesanan tidak ditemukan</p>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/client/orders')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Detail Pesanan</h1>
            <p className="text-xs text-gray-400 mt-1">ID: {order.id}</p>
          </div>
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full border ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-6">Dibuat: {formatDate(order.created_at)}</p>

        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const photos = parsePhotos(item.items?.photo_url)
            return (
              <div key={item.id} className="flex items-center gap-4 py-4">
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
                  <p className="font-medium text-gray-800 text-sm">{item.items?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.items?.categories?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{item.qty} x {formatPrice(item.price_at_order)}</p>
                  <p className="font-semibold text-gray-800 text-sm">{formatPrice(item.price_at_order * item.qty)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-100 pt-4 mt-2 flex items-center justify-between">
          <span className="font-semibold text-gray-800">Total</span>
          <span className="text-xl font-bold text-shopee">{formatPrice(total)}</span>
        </div>

        {order.status === 'pending' && (
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="mt-6 w-full px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium disabled:opacity-50"
          >
            {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
          </button>
        )}
      </div>
    </div>
  )
}
