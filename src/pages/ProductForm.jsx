import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MAX_IMAGE_SIZE = 1 * 1024 * 1024
const MAX_DIMENSION = 1920

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (file.size <= MAX_IMAGE_SIZE) { resolve(file); return }

    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = MAX_DIMENSION / Math.max(width, height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      let quality = 0.8
      function tryCompress() {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Gagal kompres gambar')); return }
          if (blob.size <= MAX_IMAGE_SIZE || quality <= 0.1) {
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' })
            resolve(compressedFile)
          } else {
            quality = Math.round((quality - 0.15) * 10) / 10
            tryCompress()
          }
        }, 'image/jpeg', quality)
      }
      tryCompress()
    }
    img.onerror = () => reject(new Error('Gagal load gambar'))
    img.src = URL.createObjectURL(file)
  })
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', price: '', category_id: '', kode_item: '', jenis: '',
  })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [removedPhotos, setRemovedPhotos] = useState([])

  useEffect(() => {
    async function init() {
      const { data: cats } = await supabase.from('categories').select('*')
      setCategories(cats || [])
      if (isEdit) {
        const { data } = await supabase.from('items').select('*').eq('id', id).single()
        if (data) {
          setForm({
            name: data.name, price: String(data.price),
            status: data.status, category_id: data.category_id || '', kode_item: data.kode_item || '', jenis: data.jenis || '',
          })
          const urls = parsePhotos(data.photo_url)
          setExistingPhotos(urls)
        }
      }
      setLoading(false)
    }
    init()
  }, [id, isEdit])

  function parsePhotos(photoUrl) {
    if (!photoUrl) return []
    try { const p = JSON.parse(photoUrl); return Array.isArray(p) ? p : [photoUrl] }
    catch { return [photoUrl] }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleImages(e) {
    const files = Array.from(e.target.files)
    const newFiles = [...imageFiles, ...files]
    setImageFiles(newFiles)
    const newPreviews = files.map((f) => URL.createObjectURL(f))
    setImagePreviews((prev) => [...prev, ...newPreviews])
    e.target.value = ''
  }

  function removeNewImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExisting(index) {
    setExistingPhotos((prev) => {
      setRemovedPhotos((r) => [...r, prev[index]])
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadImages() {
    const urls = []
    for (let i = 0; i < imageFiles.length; i++) {
      const file = await compressImage(imageFiles[i])
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'gudang_photos')
      const res = await fetch('https://api.cloudinary.com/v1_1/dwvtvyf0v/image/upload', {
        method: 'POST', body: formData
      })
      const data = await res.json()
      if (data.secure_url) urls.push(data.secure_url)
    }
    return urls
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        name: form.name, price: parseInt(form.price),
        status: form.status, category_id: form.category_id || null, kode_item: form.kode_item || null, jenis: form.jenis || null, created_by: user.id,
      }

      if (isEdit) {
        const newUrls = imageFiles.length > 0 ? await uploadImages() : []
        const allUrls = [...existingPhotos, ...newUrls]
        payload.photo_url = allUrls.length > 0 ? JSON.stringify(allUrls) : null
        const { error: updateError } = await supabase.from('items').update(payload).eq('id', id)
        if (updateError) throw updateError
      } else {
        const { data: newItem, error: insertError } = await supabase.from('items').insert(payload).select().single()
        if (insertError) throw insertError
        const newUrls = imageFiles.length > 0 ? await uploadImages() : []
        const photoUrl = newUrls.length > 0 ? JSON.stringify(newUrls) : null
        await supabase.from('items').update({ photo_url: photoUrl }).eq('id', newItem.id)
      }
      navigate('/products')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const allPreviews = [...existingPhotos, ...imagePreviews]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/products')} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Produk' : 'Tambah Produk'}</h1>
          <p className="text-sm text-gray-400">{isEdit ? 'Ubah informasi produk' : 'Isi detail produk baru'}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Foto Produk</label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-shopee hover:bg-shopee-light/30 transition"
            onClick={() => document.getElementById('imageInput').click()}>
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Klik untuk upload beberapa gambar</p>
            <p className="text-xs text-gray-400 mt-1">Bisa pilih banyak sekaligus</p>
          </div>
          <input id="imageInput" type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />

          {allPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
              {existingPhotos.map((url, i) => (
                <div key={`exist-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExisting(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-600">✕</button>
                </div>
              ))}
              {imagePreviews.map((preview, i) => (
                <div key={`new-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-shopee-light ring-2 ring-shopee-light">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-600">✕</button>
                  <span className="absolute bottom-1 left-1 bg-shopee text-white text-[10px] px-1.5 py-0.5 rounded font-medium">Baru</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Produk *</label>
            <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Harga *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
              <input type="number" value={form.price} onChange={(e) => handleChange('price', e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm" required min="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenis Barang</label>
            <select value={form.category_id} onChange={(e) => handleChange('category_id', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm bg-white">
              <option value="">Pilih jenis</option>
              {categories.filter(c => c.type === 'product').map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier</label>
              <select value={form.jenis} onChange={(e) => handleChange('jenis', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm bg-white">
              <option value="">Pilih supplier</option>
              {categories.filter(c => c.type === 'supplier').map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Barcode</label>
            <input type="text" value={form.kode_item} onChange={(e) => handleChange('kode_item', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-shopee/20 focus:border-shopee outline-none transition text-sm" placeholder="Contoh: 8991234567890" />
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={() => navigate('/products')}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm">
            Batal
          </button>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-shopee hover:bg-shopee-dark text-white rounded-lg transition disabled:opacity-50 text-sm font-medium">
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Menyimpan...
              </span>
            ) : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </div>
      </form>
    </div>
  )
}
