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
            .select('*, items(name, kode_item)')
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
        .select('*, items(name, kode_item)')
        .eq('order_id', orderData.id)
      setItems(orderItems || [])
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0)

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">Detail Pesanan</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-1">ID: {order.id}</p>
        <p className="text-xs text-gray-400 mb-4">{formatDate(order.created_at)}</p>

        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">{item.items?.name}</p>
                  {item.items?.kode_item && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.items.kode_item}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500 shrink-0 ml-2">× {item.qty}</span>
              </div>
              {item.notes && (
                <p className="text-xs text-gray-400 mt-1 italic">{item.notes}</p>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-3 mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Total</span>
          <span className="text-sm text-gray-600">{totalItems} item</span>
        </div>

        {order.status === 'pending' && (
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="mt-5 w-full px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium disabled:opacity-50"
          >
            {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
          </button>
        )}
      </div>
    </div>
  )
}
