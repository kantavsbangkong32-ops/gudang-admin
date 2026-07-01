import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function parseCSVLine(line, sep) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === sep && !inQuotes) { result.push(current.replace(/"/g, '').trim()); current = '' }
    else { current += ch }
  }
  result.push(current.replace(/"/g, '').trim())
  return result
}

function detectSeparator(text) {
  const firstLines = text.split('\n').slice(0, 10).join('\n')
  if (firstLines.includes('\t')) return '\t'
  const semiCount = (firstLines.match(/;/g) || []).length
  const commaCount = (firstLines.match(/,/g) || []).length
  if (semiCount >= commaCount && semiCount > 2) return ';'
  return ','
}

function isDataRow(firstCol) {
  if (!firstCol) return false
  const lower = firstCol.toLowerCase()
  if (lower.includes('total') || lower.includes('admin') || lower.includes('laporan') || lower.includes('kode')) return false
  return true
}

function parseFile(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const sep = detectSeparator(text)

  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('kode item') || lines[i].toLowerCase().includes('kode_item') || lines[i].toLowerCase().includes('kode\titem')) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return []

  const headers = parseCSVLine(lines[headerIdx], sep).map(h => h.toLowerCase())
  const kodeIdx = headers.findIndex(h => h.includes('kode') || h.includes('code'))
  const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'))
  const akhirIdx = headers.findIndex(h => h.includes('akhir'))

  if (kodeIdx === -1 || akhirIdx === -1) return []

  const parsed = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep)
    const kodeVal = cols[kodeIdx] || ''
    if (!kodeVal || !isDataRow(kodeVal)) continue
    parsed.push({
      kode_item: kodeVal,
      name: nameIdx !== -1 ? (cols[nameIdx] || '') : '',
      stok: parseInt((cols[akhirIdx] || '0').replace(/\./g, '')) || 0,
    })
  }
  return parsed
}

function StatusBadge({ label, type }) {
  const styles = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-shopee-light text-shopee-dark border-shopee-light',
  }
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${styles[type] || styles.info}`}>{label}</span>
}

function StatBox({ value, label, color }) {
  return (
    <div className={`rounded-lg p-4 text-center ${color === 'green' ? 'bg-green-50' : color === 'red' ? 'bg-red-50' : color === 'yellow' ? 'bg-yellow-50' : color === 'blue' ? 'bg-shopee-light' : 'bg-gray-50'}`}>
      <p className={`text-2xl font-bold ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-500' : color === 'yellow' ? 'text-yellow-500' : color === 'blue' ? 'text-shopee' : 'text-gray-800'}`}>{value}</p>
      <p className={`text-xs mt-1 ${color === 'green' ? 'text-green-500' : color === 'red' ? 'text-red-400' : color === 'blue' ? 'text-shopee' : 'text-gray-400'}`}>{label}</p>
    </div>
  )
}

function SyncTab({ fileInputRef, onReset }) {
  const { user } = useAuth()
  const [step, setStep] = useState('upload')
  const [rows, setRows] = useState([])
  const [matches, setMatches] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [result, setResult] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const innerFileRef = useRef(null)

  function reset() {
    setRows([])
    setMatches(null)
    setResult(null)
    setStep('upload')
    setUploadedFile(null)
    setSyncing(false)
    setStatusText('')
    if (innerFileRef.current) innerFileRef.current.value = ''
    if (fileInputRef?.current) fileInputRef.current.value = ''
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    setStatusText('Membaca file...')
    setStep('parsing')

    const text = await file.text()
    const parsed = parseFile(text)
    if (parsed.length === 0) {
      setStatusText('Gagal parse file. Periksa format CSV.')
      setStep('upload')
      return
    }

    setRows(parsed)
    setUploadedFile(file)
    setStep('preview')
    setStatusText('')
  }

  async function findAndSync() {
    setSyncing(true)
    setStatusText('Upload file ke storage...')

    let fileUrl = null
    if (uploadedFile) {
      const timestamp = Date.now()
      const sanitized = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${timestamp}_${sanitized}`
      const { error: uploadError } = await supabase.storage.from('imports').upload(path, uploadedFile, {
        contentType: uploadedFile.type || 'text/csv',
      })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('imports').getPublicUrl(path)
        fileUrl = publicUrl
      }
    }

    setStatusText('Mencocokkan kode_item dengan database...')
    const kodeList = rows.map(r => r.kode_item).filter(Boolean)
    if (kodeList.length === 0) { setSyncing(false); return }

    const { data: items } = await supabase
      .from('items')
      .select('id, kode_item, name, stock')
      .in('kode_item', kodeList)

    const matchMap = {}
    if (items) items.forEach(item => { matchMap[item.kode_item] = item })

    const matchedRows = rows.map(r => ({ ...r, match: matchMap[r.kode_item] || null }))

    setStatusText('Mengupdate stok...')
    const toUpdate = matchedRows.filter(r => r.match)
    let updated = 0
    let errors = 0
    await Promise.all(
      toUpdate.map(async (r) => {
        const payload = { name: r.name }
        if (r.stok !== r.match.stock) {
          payload.stock = r.stok
        }
        const { error } = await supabase.from('items').update(payload).eq('id', r.match.id)
        if (error) errors++; else updated++
      })
    )

    const unmatched = matchedRows.filter(r => !r.match)
    const unmatchedKodes = unmatched.map(r => ({ kode_item: r.kode_item, name: r.name }))

    setStatusText('Menambah produk baru...')
    let created = 0
    let createErrors = 0
    await Promise.all(
      unmatched.map(async (r) => {
        const { error } = await supabase.from('items').insert({
          kode_item: r.kode_item,
          name: r.name || 'Produk Baru',
          price: 0,
          stock: r.stok,
        })
        if (error) { createErrors++; console.error('Insert error', r.kode_item, JSON.stringify(error)) } else created++
      })
    )

    setStatusText('Menyimpan log import...')
    const { error: logError } = await supabase.from('stock_import_logs').insert({
      filename: uploadedFile?.name || 'unknown.csv',
      file_url: fileUrl,
      total_rows: rows.length,
      matched: toUpdate.length,
      unmatched: unmatched.length,
      updated_items: updated,
      created_items: created,
      unmatched_kodes: JSON.stringify(unmatchedKodes),
      user_id: user?.id || null,
    })
    if (logError) console.error('Log insert error:', JSON.stringify(logError))

    setResult({ updated, errors, created, createErrors, total: rows.length, matched: toUpdate.length })
    setStep('result')
    setMatches(matchedRows)
    setSyncing(false)
    setStatusText('')
  }

  if (step === 'upload' || step === 'parsing') {
    return (
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-shopee hover:bg-shopee-light/30 transition"
            onClick={() => innerFileRef.current?.click()}
          >
            <div className="w-16 h-16 bg-shopee-light rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-shopee" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-600 mb-1">
              {step === 'parsing' ? statusText : 'Klik untuk upload file CSV'}
            </p>
            {step === 'parsing' && (
              <div className="w-8 h-8 border-4 border-shopee border-t-transparent rounded-full animate-spin mx-auto mt-3"></div>
            )}
            <p className="text-sm text-gray-400 mt-1">Format: Laporan Mutasi Stok IPOS 5 (CSV)</p>
            <div className="mt-4 inline-block bg-gray-50 rounded-lg px-4 py-2 text-left text-xs text-gray-500">
              <p className="font-medium mb-1">Kolom yang dideteksi otomatis:</p>
              <p><span className="text-shopee">Kode Item</span> → Nama Item → ... → <span className="text-shopee">Akhir</span> (stok)</p>
              <p className="text-gray-400 mt-1">File akan disimpan di Supabase Storage</p>
            </div>
          </div>
          <input ref={innerFileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFile} />
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Preview Data</h2>
            <p className="text-sm text-gray-400">{rows.length} baris dari <span className="font-medium">{uploadedFile?.name}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
            <button onClick={findAndSync} disabled={syncing}
              className="px-5 py-2 bg-shopee hover:bg-shopee-dark text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2">
              {syncing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{statusText}</>
              ) : 'Sync Stok ke Database'}
            </button>
          </div>
        </div>
        {syncing ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-500 mt-3">{statusText}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">No</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Kode Item</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-2.5 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-5 py-2.5 text-sm font-mono text-gray-800">{r.kode_item}</td>
                    <td className="px-5 py-2.5 text-sm text-gray-600 max-w-[200px] truncate">{r.name}</td>
                    <td className="px-5 py-2.5 text-sm text-right font-semibold text-shopee">{r.stok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (step === 'result') {
    const matchCount = result.matched || 0
    return (
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${result.errors > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <svg className={`w-7 h-7 ${result.errors > 0 ? 'text-yellow-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={result.errors > 0
                  ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
                  : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Sinkronisasi Selesai</h2>
              <p className="text-sm text-gray-400">{uploadedFile?.name} • {new Date().toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <StatBox value={result.total} label="Total Data" color="gray" />
            <StatBox value={result.updated} label="Stok Diupdate" color="green" />
            <StatBox value={result.created || 0} label="Produk Baru" color="blue" />
            <StatBox value={result.errors || 0} label="Error" color={result.errors > 0 ? 'yellow' : 'gray'} />
          </div>

          {result.created > 0 && (
            <div className="bg-shopee-light/50 border border-shopee-light rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-shopee-dark flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {result.created} Produk Baru Ditambahkan
              </h3>
            </div>
          )}

          {(result.createErrors || 0) > 0 && (
            <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
                {result.createErrors} Gagal Menambahkan Produk Baru (cek console)
              </h3>
            </div>
          )}

          {result.errors > 0 && (
            <div className="bg-red-50/50 border border-red-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
                {result.errors} Error
              </h3>
            </div>
          )}
        </div>

        <button onClick={reset}
          className="px-6 py-2.5 bg-shopee hover:bg-shopee-dark text-white rounded-lg text-sm font-medium transition">
          Import Lagi
        </button>
      </div>
    )
  }

  return null
}

function RiwayatTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    const { data } = await supabase
      .from('stock_import_logs')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
    if (data) setLogs(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-gray-400">Belum ada riwayat import</p>
        <p className="text-xs text-gray-300 mt-1">Upload file CSV untuk melakukan sinkronisasi stok</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition"
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.unmatched > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                <svg className={`w-5 h-5 ${log.unmatched > 0 ? 'text-yellow-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={log.unmatched > 0
                    ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
                    : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{log.filename}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(log.created_at).toLocaleString('id-ID')}
                  {log.profiles?.username && ` • oleh ${log.profiles.username}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-600 font-medium">{log.updated_items} diupdate</span>
              {(log.created_items || 0) > 0 && <span className="text-xs text-shopee font-medium">{log.created_items} baru</span>}
              {log.unmatched > 0 && <span className="text-xs text-red-500 font-medium">{log.unmatched} tidak cocok</span>}
              <span className="text-xs text-gray-400">{log.total_rows} item</span>
              <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded === log.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          {expanded === log.id && (
            <div className="px-5 pb-5 border-t border-gray-50 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <StatBox value={log.total_rows} label="Total" color="gray" />
                <StatBox value={log.matched} label="Cocok" color="green" />
                <StatBox value={log.updated_items} label="Diupdate" color="green" />
                <StatBox value={log.created_items || 0} label="Produk Baru" color="blue" />
                <StatBox value={log.total_rows - log.matched - (log.created_items || 0)} label="Tidak Diproses" color={log.total_rows - log.matched - (log.created_items || 0) > 0 ? 'yellow' : 'gray'} />
              </div>
              {log.unmatched > 0 && log.unmatched_kodes && (() => {
                try {
                  const kodes = typeof log.unmatched_kodes === 'string' ? JSON.parse(log.unmatched_kodes) : log.unmatched_kodes
                  if (!Array.isArray(kodes) || kodes.length === 0) return null
                  return (
                    <div className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-700 mb-2">Kode Item Tidak Ditemukan:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {kodes.map((k, i) => (
                          <span key={i} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-0.5 rounded font-mono">
                            {k.kode_item}{k.name ? ` (${k.name})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}
              {log.file_url && (
                <a href={log.file_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-shopee hover:text-shopee-dark mt-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download file CSV
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function parseBarcodes(text) {
  const sep = detectSeparator(text)
  const lines = text.trim().split('\n')

  // Cari baris header yang mengandung kolom kode item/barcode
  let headerIdx = -1
  let kodeCol = 0
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('kd. item') || lower.includes('kd item')) { headerIdx = i; kodeCol = 1; break }
    if (lower.includes('kode item') || lower.includes('kode_item')) { headerIdx = i; kodeCol = 0; break }
  }

  const barcodes = new Set()
  const start = headerIdx !== -1 ? headerIdx + 1 : 0

  for (let i = start; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep)
    const val = cols[kodeCol] || ''
    if (!val) continue
    const lower = val.toLowerCase()
    if (lower.includes('total') || lower.includes('sub total') || lower.includes('pot.') || lower.includes('pajak') || lower.includes('biaya') || lower.includes('no.')) continue
    if (/^\d/.test(val)) barcodes.add(val)
  }

  return Array.from(barcodes)
}

function TerbaruTab() {
  const { user } = useAuth()
  const [step, setStep] = useState('upload')
  const [rows, setRows] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [result, setResult] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const innerFileRef = useRef(null)

  function reset() {
    setRows([])
    setResult(null)
    setStep('upload')
    setUploadedFile(null)
    setSyncing(false)
    setStatusText('')
    if (innerFileRef.current) innerFileRef.current.value = ''
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setStatusText('Membaca file...')
    setStep('parsing')
    const text = await file.text()
    const barcodes = parseBarcodes(text)
    if (barcodes.length === 0) {
      setStatusText('Tidak ditemukan barcode di file. Periksa format CSV.')
      setStep('upload')
      return
    }
    setRows(barcodes.map(k => ({ kode_item: k })))
    setUploadedFile(file)
    setStep('preview')
    setStatusText('')
  }

  async function markTerbaru() {
    setSyncing(true)
    setStatusText('Mencocokkan barcode...')
    const kodeList = rows.map(r => r.kode_item).filter(Boolean)
    if (kodeList.length === 0) { setSyncing(false); return }

    const { data: items } = await supabase
      .from('items')
      .select('id, kode_item')
      .in('kode_item', kodeList)

    const matchMap = {}
    if (items) items.forEach(item => { matchMap[item.kode_item] = item })

    const matched = rows.filter(r => matchMap[r.kode_item])
    const unmatched = rows.filter(r => !matchMap[r.kode_item])

    setStatusText('Menandai barang terbaru...')
    let updated = 0
    await Promise.all(
      matched.map(async (r) => {
        const { error } = await supabase
          .from('items')
          .update({ is_terbaru: true, stock_updated_at: new Date().toISOString() })
          .eq('id', matchMap[r.kode_item].id)
        if (!error) updated++
      })
    )

    setStatusText('Menyimpan log...')
    await supabase.from('stock_import_logs').insert({
      filename: uploadedFile?.name || 'unknown.csv',
      total_rows: rows.length,
      matched: matched.length,
      unmatched: unmatched.length,
      updated_items: updated,
      unmatched_kodes: JSON.stringify(unmatched.map(r => ({ kode_item: r.kode_item }))),
      user_id: user?.id || null,
    })

    setResult({ total: rows.length, matched: matched.length, updated, unmatched: unmatched.length })
    setStep('result')
    setSyncing(false)
    setStatusText('')
  }

  if (step === 'upload' || step === 'parsing') {
    return (
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-shopee hover:bg-shopee-light/30 transition"
            onClick={() => innerFileRef.current?.click()}>
            <div className="w-16 h-16 bg-shopee-light rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-shopee" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-600 mb-1">
              {step === 'parsing' ? statusText : 'Klik untuk upload file CSV'}
            </p>
            {step === 'parsing' && (
              <div className="w-8 h-8 border-4 border-shopee border-t-transparent rounded-full animate-spin mx-auto mt-3"></div>
            )}
            <p className="text-sm text-gray-400 mt-1">Upload CSV (xReport IPOS 5, Mutasi Stok, atau list barcode)</p>
            <p className="text-xs text-gray-400 mt-1">Hanya kode_item / barcode yang diekstrak. Tidak ada perubahan stok.</p>
          </div>
          <input ref={innerFileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFile} />
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Preview Data</h2>
            <p className="text-sm text-gray-400">{rows.length} baris dari <span className="font-medium">{uploadedFile?.name}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Batal</button>
            <button onClick={markTerbaru} disabled={syncing}
              className="px-5 py-2 bg-shopee hover:bg-shopee-dark text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2">
              {syncing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{statusText}</>
              ) : 'Tandai sebagai Terbaru'}
            </button>
          </div>
        </div>
        {syncing ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-500 mt-3">{statusText}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">No</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Kode Item / Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-2.5 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-5 py-2.5 text-sm font-mono text-gray-800">{r.kode_item}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (step === 'result') {
    return (
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-green-50">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Barang Terbaru Selesai</h2>
              <p className="text-sm text-gray-400">{uploadedFile?.name} • {new Date().toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <StatBox value={result.total} label="Total Barcode" color="gray" />
            <StatBox value={result.updated} label="Ditandai Terbaru" color="green" />
            <StatBox value={result.unmatched} label="Tidak Cocok" color={result.unmatched > 0 ? 'yellow' : 'gray'} />
          </div>
        </div>
        <button onClick={reset}
          className="px-6 py-2.5 bg-shopee hover:bg-shopee-dark text-white rounded-lg text-sm font-medium transition">
          Import Lagi
        </button>
      </div>
    )
  }

  return null
}

function FilesTab() {
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncingFile, setSyncingFile] = useState(null)

  useEffect(() => { loadFiles() }, [])

  async function loadFiles() {
    const { data, error } = await supabase.storage.from('imports').list()
    if (!error && data) setFiles(data)
    setLoading(false)
  }

  async function deleteFile(name) {
    if (!confirm('Hapus file ' + name + '?')) return
    const { error } = await supabase.storage.from('imports').remove([name])
    if (!error) setFiles(prev => prev.filter(f => f.name !== name))
  }

  async function syncFile(name) {
    setSyncingFile(name)
    try {
      const { data: fileData, error: dlError } = await supabase.storage.from('imports').download(name)
      if (dlError) throw dlError

      const text = await fileData.text()
      const parsed = parseFile(text)
      if (parsed.length === 0) { alert('Gagal parse file'); return }

      const kodeList = parsed.map(r => r.kode_item).filter(Boolean)
      const { data: items } = await supabase.from('items').select('id, kode_item, name, stock').in('kode_item', kodeList)
      const matchMap = {}
      if (items) items.forEach(item => { matchMap[item.kode_item] = item })

      const matched = parsed.filter(r => matchMap[r.kode_item])
      const unmatched = parsed.filter(r => !matchMap[r.kode_item])

      let updated = 0
      let errors = 0
      await Promise.all(
        matched.map(async (r) => {
          const payload = { name: r.name }
          if (r.stok !== matchMap[r.kode_item].stock) {
            payload.stock = r.stok
          }
          const { error } = await supabase.from('items').update(payload).eq('id', matchMap[r.kode_item].id)
          if (error) errors++; else updated++
        })
      )

      let created = 0
      await Promise.all(
        unmatched.map(async (r) => {
          const { error } = await supabase.from('items').insert({
            kode_item: r.kode_item,
            name: r.name || 'Produk Baru',
            price: 0,
            stock: r.stok,
          })
          if (!error) created++
        })
      )

      const { error: logError } = await supabase.from('stock_import_logs').insert({
        filename: name,
        file_url: supabase.storage.from('imports').getPublicUrl(name).data.publicUrl,
        total_rows: parsed.length,
        matched: matched.length,
        unmatched: unmatched.length,
        updated_items: updated,
        created_items: created,
        unmatched_kodes: JSON.stringify([]),
        user_id: user?.id || null,
      })
      if (logError) console.error('Log insert error:', JSON.stringify(logError))

      alert('Sync selesai! ' + updated + ' diupdate, ' + created + ' produk baru ditambahkan.')
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setSyncingFile(null)
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    return (bytes / 1024).toFixed(1) + ' KB'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-400">Belum ada file CSV</p>
        <p className="text-xs text-gray-300 mt-1">Upload file di tab Sync Stok</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">File CSV di Storage</h2>
        <p className="text-sm text-gray-400">{files.length} file tersimpan</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Nama File</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Ukuran</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Tgl Upload</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {files.map((f) => {
              const { data: { publicUrl } } = supabase.storage.from('imports').getPublicUrl(f.name)
              return (
                <tr key={f.name} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-shopee-light rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-shopee" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-800 font-mono">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-gray-500">{formatSize(f.metadata?.size)}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-500">
                    {f.updated_at ? new Date(f.updated_at).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => syncFile(f.name)} disabled={syncingFile === f.name}
                        className="inline-flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition font-medium disabled:opacity-50">
                        {syncingFile === f.name ? (
                          <><div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>Syncing...</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>Sync</>
                        )}
                      </button>
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-shopee hover:text-shopee-dark bg-shopee-light hover:bg-shopee-light px-3 py-1.5 rounded-lg transition font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                      <button onClick={() => deleteFile(f.name)}
                        className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function StockImport() {
  const [tab, setTab] = useState('sync')
  const fileInputRef = useRef(null)

  const tabs = [
    { key: 'sync', label: 'Sync Stok', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
    { key: 'terbaru', label: 'Barang Terbaru', icon: 'M5 13l4 4L19 7' },
    { key: 'history', label: 'Riwayat', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { key: 'files', label: 'File CSV', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Import Stok</h1>
        <p className="text-sm text-gray-400 mt-0.5">Upload file IPOS 5 untuk sinkronisasi stok atau tandai barang terbaru</p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? 'bg-shopee text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sync' && <SyncTab fileInputRef={fileInputRef} />}
      {tab === 'terbaru' && <TerbaruTab />}
      {tab === 'history' && <RiwayatTab />}
      {tab === 'files' && <FilesTab />}
    </div>
  )
}
