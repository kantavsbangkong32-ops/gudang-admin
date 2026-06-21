const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZGFseGNma3R2a2RveG14bW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc3ODE2MSwiZXhwIjoyMDk3MzU0MTYxfQ.hQJ0f7WiVw5Mqw5kK882OIzHKOzz1K5ln4FK8aGU6l0'

const sql = `
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

async function main() {
  // Try creating exec_sql function first
  const createFn = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

  // Try inserting into the system's schema migrations or using a direct approach
  // Let's try using Supabase's built-in pgmanage endpoint
  const endpoints = [
    { url: `https://api.supabase.com/v1/projects/nsdalxcfktvkdoxmxmos/database/query`, method: 'POST' },
  ]

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': 'Bearer ' + SERVICE_KEY,
        },
        body: ep.method === 'POST' ? JSON.stringify({ query: createFn + sql }) : undefined,
      })
      const text = await res.text()
      console.log(`${ep.method} ${ep.url}: ${res.status}`)
      if (res.ok) {
        console.log('SUCCESS:', text.slice(0, 200))
      } else {
        console.log('FAILED:', text.slice(0, 200))
      }
    } catch (e) {
      console.log(`Error: ${e.message}`)
    }
  }

  // Try the management API with access token approach
  // https://supabase.com/docs/reference/api/tokens
  console.log('\n--- Alternatif untuk create tabel ---')
  console.log('Jalankan SQL berikut di Supabase Dashboard → SQL Editor:')
  console.log('\n' + sql)
}
main().catch(console.error)
