CREATE TABLE IF NOT EXISTS dashboard_ads (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  media_type VARCHAR(20) NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video', 'text')),
  media_url TEXT,
  link_url TEXT,
  cta_label VARCHAR(80) NOT NULL DEFAULT 'Conhecer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (media_type = 'text' OR media_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS dashboard_ads_active_order_idx
  ON dashboard_ads (is_active, sort_order ASC, updated_at DESC, created_at DESC);
