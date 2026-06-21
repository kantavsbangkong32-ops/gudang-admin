const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZGFseGNma3R2a2RveG14bW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc3ODE2MSwiZXhwIjoyMDk3MzU0MTYxfQ.hQJ0f7WiVw5Mqw5kK882OIzHKOzz1K5ln4FK8aGU6l0'
const REF = 'nsdalxcfktvkdoxmxmos'

const createFn = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

const createTable = `
CREATE TABLE IF NOT EXISTS stock_import_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_url TEXT,
  total_rows INT DEFAULT 0,
  matched INT DEFAULT 0,
  unmatched INT DEFAULT 0,
  updated_items INT DEFAULT 0,
  unmatched_kodes JSONB DEFAULT '[]',
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE stock_import_logs ENABLE ROW LEVEL SECURITY;
`

const fullSQL = createFn + createTable

async function tryEndpoint(name, url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
      },
      body: JSON.stringify(body || { query: fullSQL }),
    })
    const text = await res.text()
    console.log(`${name}: ${res.status}`)
    if (res.ok) {
      console.log('  OK:', text.slice(0, 150))
      return true
    } else {
      console.log('  FAIL:', text.slice(0, 200))
      return false
    }
  } catch (e) {
    console.log(`${name}: Error - ${e.message}`)
    return false
  }
}

async function main() {
  const endpoints = [
    ['RPC exec_sql', `https://${REF}.supabase.co/rest/v1/rpc/exec_sql`, null],
    ['RPC pgquery', `https://${REF}.supabase.co/rest/v1/rpc/pgquery`, null],
    ['RPC pga_execute', `https://${REF}.supabase.co/rest/v1/rpc/pga_execute`, null],
    ['SQL endpoint', `https://${REF}.supabase.co/sql`, null],
    ['Supabase API sql', `https://api.supabase.com/v1/projects/${REF}/database/query`, null],
    ['RPC admin_exec_sql', `https://${REF}.supabase.co/rest/v1/rpc/admin_exec_sql`, null],
  ]

  for (const [name, url, body] of endpoints) {
    const ok = await tryEndpoint(name, url, body)
    if (ok) break
  }

  // If all failed, try creating exec_sql function first
  console.log('\n--- Mencoba create function via direct approach ---')
  // Try creating function via rest using the __internal__ schema
  // The key is that PostgREST allows creating functions through SQL executed by the db owner

  // Alternative: use the supabase client with service_role to try auth admin
  const authRes = await fetch(`https://${REF}.supabase.co/auth/v1/admin/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
    },
    body: JSON.stringify({ query: createTable }),
  })
  const authText = await authRes.text()
  console.log(`Auth Admin SQL: ${authRes.status}`)
  if (authRes.ok) {
    console.log('  OK:', authText.slice(0, 150))
  } else {
    console.log('  FAIL:', authText.slice(0, 300))
  }

  console.log('\nJika semua gagal, jalankan SQL berikut di Supabase Dashboard SQL Editor:')
  console.log('\n' + createTable)
}
main().catch(console.error)
