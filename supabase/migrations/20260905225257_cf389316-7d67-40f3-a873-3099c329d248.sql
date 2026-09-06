ALTER TABLE public.shop_settings ALTER COLUMN inside_dhaka_charge SET DEFAULT 70;
ALTER TABLE public.shop_settings ALTER COLUMN outside_dhaka_charge SET DEFAULT 130;

ALTER TABLE public.parcel_returns
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS parcel_returns_order_id_idx ON public.parcel_returns(order_id);

ALTER TABLE public.courier_accounts
  ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT true;