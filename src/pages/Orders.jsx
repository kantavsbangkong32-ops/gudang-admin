import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  processing: 'bg-orange-100 text-orange-700 border-orange-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
}

const statusLabels = {
  pending: 'Pending', rejected: 'Ditolak',
  processing: 'Diproses', completed: 'Selesai',
}

const statusList = ['pending', 'processing', 'completed', 'rejected']

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [openActionId, setOpenActionId] = useState(null)

  useEffect(() => { loadOrders() }, [])

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('[data-order-actions]')) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) {
      const enriched = await Promise.all(
        (data || []).map(async (order) => {
          const { count } = await supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('order_id', order.id)
          const { data: profile } = await supabase.from('profiles').select('username').eq('id', order.client_id).maybeSingle()
          return { ...order, item_count: count || 0, client_name: profile?.username || 'Unknown' }
        })
      )
      setOrders(enriched)
    }
    setLoading(false)
  }

  async function deleteOrder(id) {
    if (!confirm('Hapus pesanan ini?')) return
    await supabase.from('order_items').delete().eq('order_id', id)
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) setOrders(orders.filter((o) => o.id !== id))
    setOpenActionId(null)
  }

  async function updateStatus(id, newStatus) {
    if (newStatus === 'completed') {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('item_id, qty')
        .eq('order_id', id)
      for (const item of orderItems || []) {
        await supabase.rpc('decrement_stock', { p_item_id: item.item_id, p_qty: item.qty })
      }
    }
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (!error) {
      setOrders(orders.map((o) => o.id === id ? { ...o, status: newStatus } : o))
    }
    setOpenActionId(null)
  }

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pesanan</h1>
        <p className="text-sm text-gray-400 mt-0.5">{orders.length} total pesanan</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'ALL', label: 'Semua', color: 'bg-gray-100 text-gray-600' },
          { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
          { key: 'processing', label: 'Diproses', color: 'bg-orange-100 text-orange-700' },
          { key: 'completed', label: 'Selesai', color: 'bg-green-100 text-green-700' },
          { key: 'rejected', label: 'Ditolak', color: 'bg-red-100 text-red-700' },
        ].map((s) => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition border ${
              filter === s.key
                ? `${s.color} border-current shadow-sm`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-400">Tidak ada pesanan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between">
                <Link to={`/orders/${order.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-shopee-light flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-shopee" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {order.client_name} • {order.item_count} item
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0" data-order-actions>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                    <p className="text-[10px] text-gray-300">{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColors[order.status] || statusColors.pending}`}>
                    {statusLabels[order.status] || order.status}
                  </span>

                  <div className="relative">
                    <button onClick={() => setOpenActionId(openActionId === order.id ? null : order.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      Aksi
                    </button>
                    {openActionId === order.id && (
                      <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-20">
                        <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ubah Status</p>
                        {statusList.map((s) => (
                          <button key={s} onClick={() => updateStatus(order.id, s)}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 ${
                              order.status === s ? 'text-shopee' : 'text-gray-700'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${s === 'pending' ? 'bg-yellow-500' : s === 'processing' ? 'bg-orange-500' : s === 'completed' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {statusLabels[s] || s}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={() => deleteOrder(order.id)}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
