-- =============================================
-- Gudang Admin - Supabase Database Schema
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- 1. TABEL CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABEL PROFILES (auto-create via trigger after user signup)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'USER',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABEL ITEMS (produk)
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price BIGINT DEFAULT 0,
  status TEXT DEFAULT 'ready',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier TEXT,
  kode_item TEXT,
  stock INT DEFAULT 0,
  photo_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_kode_item ON items(kode_item);

-- 4. TABEL ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT DEFAULT 'PENDING',
  notes TEXT,
  profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABEL ORDER_ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  qty INT DEFAULT 1,
  price_at_order BIGINT DEFAULT 0
);

-- 6. TABEL STOCK IMPORT LOGS (history import CSV)
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

-- 7. ROW LEVEL SECURITY (opsional, sesuaikan kebutuhan)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_import_logs ENABLE ROW LEVEL SECURITY;

-- Trigger: buat profile otomatis setelah signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'USER');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
