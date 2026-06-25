import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  processing: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
}

const statusLabels = {
  pending: 'Pending',
  rejected: 'Ditolak',
  processing: 'Diproses',
  completed: 'Selesai',
  draft: 'Draft',
}

export default function ClientOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .eq('client_id', user.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (data) {
          const enriched = await Promise.all(
            data.map(async (order) => {
              const { data: orderItems } = await supabase
                .from('order_items')
                .select('qty, items(name)')
                .eq('order_id', order.id)
              return { ...order, items: orderItems || [], item_count: orderItems?.length || 0 }
            })
          )
          setOrders(enriched)
        }
        setLoading(false)
      })
  }, [])

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="text-center py-20">
        <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-lg text-gray-400 mb-4">Belum ada pesanan</p>
        <Link
          to="/client/products"
          className="bg-shopee hover:bg-shopee-dark text-white font-medium px-6 py-2.5 rounded-lg text-sm transition inline-block"
        >
          Mulai Belanja
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pesanan Saya</h1>

      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/client/orders/${order.id}`}
            className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-700">{order.item_count} item</p>
            <p className="text-xs text-gray-400 truncate mt-1">
              {order.items.map((i) => i.items?.name).join(', ')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
