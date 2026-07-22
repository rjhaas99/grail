insert into public.marketplace_settings (key, value)
values
  ('shipping_pwe_flat_rate', '1.50'::jsonb),
  ('shipping_usps_ground_advantage_rate', '5.99'::jsonb),
  ('shipping_usps_priority_mail_rate', '9.99'::jsonb),
  ('shipping_pwe_max_listing_value', '20.00'::jsonb)
on conflict (key) do nothing;
