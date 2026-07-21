alter table public.orders
  add column if not exists shipping_status text default 'pending',
  add column if not exists shipping_service text,
  add column if not exists label_url text,
  add column if not exists label_cost numeric(10, 2),
  add column if not exists shippo_shipment_id text,
  add column if not exists shippo_rate_id text,
  add column if not exists shippo_transaction_id text,
  add column if not exists shippo_tracking_status text,
  add column if not exists shippo_tracking_status_details text,
  add column if not exists shippo_tracking_url text,
  add column if not exists shippo_eta timestamptz,
  add column if not exists shippo_label_purchased_at timestamptz,
  add column if not exists shippo_webhook_id text,
  add column if not exists shippo_webhook_registered_at timestamptz,
  add column if not exists shipping_from_address jsonb,
  add column if not exists shipping_to_address jsonb,
  add column if not exists shipping_parcel jsonb,
  add column if not exists shipping_status_updated_at timestamptz;

create index if not exists orders_shippo_transaction_id_idx
  on public.orders (shippo_transaction_id)
  where shippo_transaction_id is not null;

create index if not exists orders_tracking_number_idx
  on public.orders (tracking_number)
  where tracking_number is not null;

create index if not exists orders_shipping_status_idx
  on public.orders (shipping_status);
