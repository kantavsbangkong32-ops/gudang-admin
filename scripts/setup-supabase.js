import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nsdalxcfktvkdoxmxmos.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZGFseGNma3R2a2RveG14bW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc3ODE2MSwiZXhwIjoyMDk3MzU0MTYxfQ.hQJ0f7WiVw5Mqw5kK882OIzHKOzz1K5ln4FK8aGU6l0'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  // 1. Create storage bucket 'imports'
  console.log('1. Membuat storage bucket imports...')
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('imports', {
    public: false,
    allowedMimeTypes: ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
  })
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.log('  Error bucket:', bucketError.message)
  } else {
    console.log('  Bucket imports ready')
  }

  // 2. Create stock_import_logs table via raw query
  console.log('2. Membuat tabel stock_import_logs...')
  const createSQL = `
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

  const { error: sqlError } = await supabase.rpc('exec_sql', { query: createSQL })
  if (sqlError) {
    if (sqlError.message.includes('function "exec_sql" does not exist')) {
      console.log('  Tidak bisa execute SQL via RPC.')
      console.log('  Jalankan SQL berikut manual di Supabase SQL Editor:')
      console.log('\n' + createSQL)
    } else if (sqlError.message.includes('already exists')) {
      console.log('  Tabel sudah ada')
    } else {
      console.log('  Error:', sqlError.message)
    }
  } else {
    console.log('  Tabel stock_import_logs siap')
  }

  // 3. Verify
  console.log('\n3. Verifikasi...')
  const { data: buckets } = await supabase.storage.listBuckets()
  const importsBucket = buckets?.find(b => b.name === 'imports')
  console.log('  Bucket imports:', importsBucket ? 'OK' : 'Tidak ada')

  const { data: logs } = await supabase.from('stock_import_logs').select('count', { count: 'exact', head: true })
  console.log('  Tabel stock_import_logs:', logs === null ? 'Tidak bisa akses' : 'OK')

  console.log('\nSelesai!')
}
main().catch(console.error)
