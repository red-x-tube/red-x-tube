-- RedxTube Database Schema
-- Neon SQL Editor এ এই পুরো file টা paste করে Run করো

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'home',
  sections TEXT[] NOT NULL DEFAULT '{"home"}',
  media_type TEXT NOT NULL DEFAULT 'video',
  category_id INTEGER,
  video_url TEXT,
  image_url TEXT,
  text_content TEXT,
  thumbnail_url TEXT,
  description TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  unlock_required BOOLEAN NOT NULL DEFAULT false,
  ads_unlock_enabled BOOLEAN NOT NULL DEFAULT false,
  monetag_ads_link TEXT,
  monetag_links TEXT[],
  ads_required INTEGER,
  monetag_zone_id TEXT,
  adsgram_block_id TEXT,
  ad_timer_duration INTEGER,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  blocks JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_links (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '⭐',
  price_bdt INTEGER NOT NULL DEFAULT 0,
  price_gbp TEXT NOT NULL DEFAULT '0',
  duration_value INTEGER NOT NULL DEFAULT 1,
  duration_unit TEXT NOT NULL DEFAULT 'month',
  features TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'local',
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💳',
  logo_url TEXT,
  number_or_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS video_call_girls (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  age INTEGER NOT NULL DEFAULT 22,
  service_time TEXT NOT NULL DEFAULT '10:00 AM - 10:00 PM',
  is_online BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Done! সব table তৈরি হয়ে গেছে
