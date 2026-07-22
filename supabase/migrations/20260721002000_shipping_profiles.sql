alter table public.listings
  add column if not exists shipping_profile_id text not null default 'usps_ground_advantage';

alter table public.orders
  add column if not exists shipping_profile_id text,
  add column if not exists shipping_profile_label text,
  add column if not exists shipping_tracking_supported boolean,
  add column if not exists shipping_label_required boolean,
  add column if not exists shipping_buyer_acknowledged_at timestamptz;

alter table public.listings
  drop constraint if exists listings_shipping_profile_id_check;

alter table public.listings
  add constraint listings_shipping_profile_id_check
  check (
    shipping_profile_id in (
      'plain_white_envelope',
      'usps_ground_advantage',
      'usps_priority_mail'
    )
  );

alter table public.orders
  drop constraint if exists orders_shipping_profile_id_check;

alter table public.orders
  add constraint orders_shipping_profile_id_check
  check (
    shipping_profile_id is null
    or shipping_profile_id in (
      'plain_white_envelope',
      'usps_ground_advantage',
      'usps_priority_mail'
    )
  );

alter table public.listings
  drop constraint if exists listings_pwe_max_listing_value_check;

create table if not exists public.marketplace_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.marketplace_settings (key, value)
values
  ('shipping_pwe_flat_rate', '1.50'::jsonb),
  ('shipping_usps_ground_advantage_rate', '5.99'::jsonb),
  ('shipping_usps_priority_mail_rate', '9.99'::jsonb),
  ('shipping_pwe_max_listing_value', '20.00'::jsonb)
on conflict (key) do nothing;

create or replace function public.validate_listing_shipping_profile()
returns trigger
language plpgsql
as $$
declare
  pwe_limit numeric := 20.00;
  configured_limit text;
begin
  select trim(both '"' from value::text)
  into configured_limit
  from public.marketplace_settings
  where key = 'shipping_pwe_max_listing_value'
  limit 1;

  if configured_limit is not null and configured_limit ~ '^[0-9]+(\.[0-9]+)?$' then
    pwe_limit := configured_limit::numeric;
  end if;

  if
    new.shipping_profile_id = 'plain_white_envelope'
    and coalesce(new.price, new.auction_starting_bid, 0) > pwe_limit
  then
    raise exception 'Plain White Envelope is only available for cards priced at $% or less.', pwe_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_validate_shipping_profile on public.listings;

create trigger listings_validate_shipping_profile
before insert or update of shipping_profile_id, price, auction_starting_bid
on public.listings
for each row
execute function public.validate_listing_shipping_profile();
