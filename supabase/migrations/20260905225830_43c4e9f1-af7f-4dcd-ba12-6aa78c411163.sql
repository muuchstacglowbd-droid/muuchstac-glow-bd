ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS report_email text,
  ADD COLUMN IF NOT EXISTS daily_report_enabled boolean NOT NULL DEFAULT false;