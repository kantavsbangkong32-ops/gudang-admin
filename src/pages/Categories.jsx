import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
    setLoading(false)
  }

  async function addCategory() {
    const trimmed = name.trim()
    if (!trimmed) return
    const { data, error } = await supabase.from('categories').insert({ name: trimmed }).select()
    if (error) {
      alert('Gagal: ' + error.message)
      return
    }
    setName('')
    loadCategories()
  }

  async function updateCategory(id) {
    if (!editName.trim()) return
    const { error } = await supabase.from('categories').update({ name: editName.trim() }).eq('id', id)
    if (!error) { setEditId(null); setEditName(''); loadCategories() }
  }

  async function deleteCategory(id) {
    if (!confirm('Hapus kategori ini?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) loadCategories()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kategori</h1>
        <p className="text-sm text-gray-400 mt-0.5">{categories.length} kategori tersedia</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex gap-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nama kategori baru..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
          <button onClick={addCategory}
            className="bg-shopee hover:bg-shopee-dark text-white px-6 py-2.5 rounded-lg transition text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-gray-400">Belum ada kategori.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Kategori</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((cat, i) => (
                <tr key={cat.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    {editId === cat.id ? (
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none w-full text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && updateCategory(cat.id)} autoFocus />
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-shopee-light text-shopee flex items-center justify-center text-sm font-bold">
                          {cat.name[0].toUpperCase()}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                          <p className="text-xs text-gray-400">Kategori #{i + 1}</p>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editId === cat.id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditId(null); setEditName('') }}
                          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Batal</button>
                        <button onClick={() => updateCategory(cat.id)}
                          className="px-3 py-1.5 text-sm text-white bg-shopee hover:bg-shopee-dark rounded-lg transition font-medium">Simpan</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditId(cat.id); setEditName(cat.name) }}
                          className="p-2 text-gray-400 hover:text-shopee hover:bg-shopee-light rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => deleteCategory(cat.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
