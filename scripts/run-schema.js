import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://nsdalxcfktvkdoxmxmos.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZGFseGNma3R2a2RveG14bW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc3ODE2MSwiZXhwIjoyMDk3MzU0MTYxfQ.hQJ0f7WiVw5Mqw5kK882OIzHKOzz1K5ln4FK8aGU6l0'

// Execute SQL via Supabase REST API with service_role key
async function executeSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

// Try direct SQL endpoint
async function executeSQLDirect(sql) {
  const res = await fetch(`${SUPABASE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

async function checkTables() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=count`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  })
  return res
}

async function main() {
  const schemaPath = join(__dirname, '..', 'supabase-schema.sql')
  const sql = readFileSync(schemaPath, 'utf8')

  // Check if tables already exist
  console.log('Memeriksa tabel yang sudah ada...')
  const check = await checkTables()
  if (check.ok) {
    console.log('Tabel categories sudah ada!')
  } else {
    console.log('Tabel categories belum ada.')
  }

  // Try to execute SQL
  console.log('\nMenjalankan SQL schema...')

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

  let success = 0
  let failed = 0

  for (const stmt of statements) {
    const sqlStmt = stmt + ';'
    try {
      const res = await executeSQL(sqlStmt)
      if (res.ok) {
        success++
      } else {
        const text = await res.text()
        console.log(`  Gagal: ${sqlStmt.slice(0, 80)}...`)
        console.log(`  Error: ${text.slice(0, 200)}`)
        failed++
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`)
      failed++
    }
  }

  if (success > 0 || failed > 0) {
    console.log(`\nSelesai: ${success} berhasil, ${failed} gagal`)
    if (failed > 0) console.log('(Gagal mungkin karena tabel/fungsi sudah ada)')
  }

  // Check tables after
  console.log('\nMemeriksa tabel setelah eksekusi...')
  for (const table of ['categories', 'items', 'orders', 'order_items']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    })
    console.log(`  ${table}: ${res.ok ? 'OK' : 'Tidak ada'} (${res.status})`)
  }
}

main().catch(console.error)
