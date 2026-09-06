ALTER TABLE public.parcel_returns
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS parcel_returns_order_id_idx ON public.parcel_returns(order_id);