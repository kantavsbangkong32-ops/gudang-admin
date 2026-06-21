import { readFileSync } from 'fs'

const text = readFileSync('C:/Users/Admin/Documents/xReport.csv', 'utf8')

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

const lines = text.split('\n')
let headerIdx = -1
for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase().includes('kode item')) { headerIdx = i; break }
}
console.log('Header baris ke:', headerIdx + 1)

const header = lines[headerIdx]
console.log('Header:', header)

const cols = parseCSVLine(header, ';')
console.log('Kolom:', cols)

const kodeIdx = 0, nameIdx = 1, akhirIdx = 9
let count = 0
for (let i = headerIdx + 1; i < lines.length; i++) {
  const c = parseCSVLine(lines[i], ';')
  const kode = c[kodeIdx] || ''
  if (!kode || kode.toLowerCase().includes('total') || kode.toLowerCase().includes('admin') || kode === '') continue
  const stok = parseInt((c[akhirIdx] || '0').replace(/\./g, '')) || 0
  count++
  if (count <= 5) console.log(kode, '|', (c[nameIdx] || '').slice(0, 30), '| Stok:', stok)
}
console.log('\nTotal data rows parsed:', count)
