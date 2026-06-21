import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadOrder() }, [id])

  async function loadOrder() {
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id).single()
    if (error) { setLoading(false); return }

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*, items(name)')
      .eq('order_id', id)

    if (orderData) {
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', orderData.client_id).maybeSingle()
      orderData.client_name = profile?.username || 'Unknown'
    }

    setOrder(orderData)
    setItems(itemsData || [])
    setLoading(false)
  }

  async function updateStatus(newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (!error) loadOrder()
  }

  function printSuratJalan() {
    const printWindow = window.open('', '_blank')
    const dateStr = new Date(order.created_at).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    const timeStr = new Date(order.created_at).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    })

    printWindow.document.write(`
      <html>
      <head>
        <title>Surat Jalan - Order #${order.id.slice(0, 8)}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { font-size: 18px; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 2px; }
          .header p { font-size: 11px; margin: 0; color: #555; }
          hr { border: none; border-top: 2px solid #000; margin: 15px 0; }
          .info { margin-bottom: 20px; }
          .info table { width: 100%; }
          .info td { padding: 2px 0; font-size: 11px; }
          .info .label { font-weight: bold; width: 100px; }
          table.items { width: 100%; border-collapse: collapse; margin: 15px 0; }
          table.items th { background: #f0f0f0; font-size: 11px; padding: 8px 6px; text-align: left; border: 1px solid #000; text-transform: uppercase; }
          table.items td { padding: 6px; border: 1px solid #000; font-size: 11px; }
          table.items .num { text-align: center; width: 30px; }
          table.items .qty { text-align: center; width: 50px; }
          table.items .price { text-align: right; }
          .total-row td { font-weight: bold; }
          .footer { margin-top: 50px; }
          .footer table { width: 100%; }
          .footer td { padding: 5px 0; font-size: 11px; }
          .signature { margin-top: 40px; text-align: right; }
          .signature p { margin: 0; font-size: 11px; }
          .signature .space { height: 60px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Surat Jalan</h1>
          <p>--- Delivery Order ---</p>
        </div>
        <hr>
        <div class="info">
          <table>
            <tr><td class="label">No. Order</td><td>: ${order.id.slice(0, 8).toUpperCase()}</td></tr>
            <tr><td class="label">Tanggal</td><td>: ${dateStr}</td></tr>
            <tr><td class="label">Jam</td><td>: ${timeStr}</td></tr>
            <tr><td class="label">Kepada</td><td>: ${order.client_name}</td></tr>
            ${order.notes ? `<tr><td class="label">Catatan</td><td>: ${order.notes}</td></tr>` : ''}
          </table>
        </div>
        <table class="items">
          <thead>
            <tr>
              <th class="num">No</th>
              <th>Nama Barang</th>
              <th class="qty">Qty</th>
              <th class="price">Harga</th>
              <th class="price">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
              <tr>
                <td class="num">${i + 1}</td>
                <td>${item.items?.name || 'Unknown'}</td>
                <td class="qty">${item.qty}</td>
                <td class="price">Rp ${Number(item.price_at_order).toLocaleString('id-ID')}</td>
                <td class="price">Rp ${(item.price_at_order * item.qty).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" style="text-align: right; padding-right: 10px;">TOTAL</td>
              <td class="price">Rp ${total.toLocaleString('id-ID')}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          <table>
            <tr><td style="width: 50%; font-size: 10px;">Catatan: Barang yang sudah dibeli tidak dapat dikembalikan</td></tr>
          </table>
        </div>
        <div class="signature">
          <p>Hormat Kami,</p>
          <div class="space"></div>
          <p>(${order.client_name})</p>
        </div>
        <hr>
        <div style="text-align: center; font-size: 10px; color: #999; margin-top: 10px;">
          Dicetak pada: ${new Date().toLocaleString('id-ID')}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const total = items.reduce((sum, item) => sum + item.price_at_order * item.qty, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-400">Pesanan tidak ditemukan</p>
        <button onClick={() => navigate('/orders')} className="mt-4 text-sm text-blue-600 hover:underline">Kembali ke pesanan</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/orders')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5 transition group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke daftar pesanan
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Order #{order.id.slice(0, 8)}</h1>
                <p className="text-sm text-gray-400 mt-0.5">{order.client_name}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(order.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {order.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span><span className="font-medium">Catatan:</span> {order.notes}</span>
            </div>
          )}
        </div>

        <div className="p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Item Pesanan
          </h2>
          <div className="space-y-0 divide-y divide-gray-50">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-xs text-gray-500 flex items-center justify-center font-medium">{i + 1}</span>
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{item.items?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{item.qty} x Rp {Number(item.price_at_order).toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  Rp {(item.price_at_order * item.qty).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-600">Total</span>
            <span className="text-xl font-bold text-blue-600">Rp {total.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={printSuratJalan}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium text-sm transition flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak Surat Jalan
          </button>
        </div>

        {order.status === 'pending' && (
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={() => updateStatus('rejected')}
              className="flex-1 py-3 border-2 border-red-200 text-red-500 rounded-xl hover:bg-red-50 font-medium text-sm transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Tolak
            </button>
            <button onClick={() => updateStatus('processing')}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Terima
            </button>
          </div>
        )}
        {order.status === 'processing' && (
          <div className="px-6 pb-6">
            <button onClick={() => updateStatus('completed')}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tandai Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
