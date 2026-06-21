import { readFileSync } from 'fs'

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZGFseGNma3R2a2RveG14bW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc3ODE2MSwiZXhwIjoyMDk3MzU0MTYxfQ.hQJ0f7WiVw5Mqw5kK882OIzHKOzz1K5ln4FK8aGU6l0'
const SUPABASE_URL = 'https://nsdalxcfktvkdoxmxmos.supabase.co'

const text = readFileSync('C:/Users/Admin/Documents/xReport.csv', 'utf8')

function parseCSVLine(line, sep) {
  const result = []; let current = ''; let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === sep && !inQuotes) { result.push(current.replace(/"/g, '').trim()); current = '' }
    else { current += ch }
  }
  result.push(current.replace(/"/g, '').trim())
  return result
}

const lines = text.split('\n')
let headerIdx = lines.findIndex(l => l.toLowerCase().includes('kode item'))

const csvKodes = []
for (let i = headerIdx + 1; i < lines.length; i++) {
  const c = parseCSVLine(lines[i], ';')
  const kode = c[0] || ''
  if (!kode || kode.toLowerCase().includes('total') || kode.toLowerCase().includes('admin')) continue
  csvKodes.push(kode)
}
console.log('CSV items:', csvKodes.length)

async function main() {
  // Get all items with non-null kode_item
  const res = await fetch(SUPABASE_URL + '/rest/v1/items?select=id,kode_item,stock,name&kode_item=not.is.null&limit=1000', {
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
  })
  const dbItems = await res.json()
  console.log('DB items with kode_item:', dbItems.length)
  console.log('DB items:', JSON.stringify(dbItems, null, 2))

  // Find matches
  const dbKodes = new Set(dbItems.map(i => i.kode_item))
  const matches = csvKodes.filter(k => dbKodes.has(k))
  console.log('\nMatches found:', matches.length)
  if (matches.length > 0) {
    console.log('Matching kode_items:', matches)
    const updateItems = dbItems.filter(i => matches.includes(i.kode_item))
    console.log('Items to update:', JSON.stringify(updateItems, null, 2))
  } else {
    console.log('Tidak ada kode_item yang cocok antara CSV dan database.')
    console.log('CSV sample kode:', csvKodes.slice(0, 5))
    console.log('DB sample kode:', dbItems.map(i => i.kode_item).slice(0, 5))
  }
}
main().catch(console.error)
