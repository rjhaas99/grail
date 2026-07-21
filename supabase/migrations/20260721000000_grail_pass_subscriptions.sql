create table if not exists public.grail_pass_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  plan text not null check (plan in ('monthly', 'annual')),
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'expired')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  latest_invoice_id text,
  latest_invoice_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.grail_pass_webhook_events (
  event_id text primary key,
  event_type text not null,
  stripe_object_id text,
  processed_at timestamptz not null default now()
);

alter table public.grail_pass_subscriptions enable row level security;
alter table public.grail_pass_webhook_events enable row level security;

create index if not exists grail_pass_subscriptions_user_id_idx
  on public.grail_pass_subscriptions (user_id);

create index if not exists grail_pass_subscriptions_stripe_customer_id_idx
  on public.grail_pass_subscriptions (stripe_customer_id);

create index if not exists grail_pass_subscriptions_status_idx
  on public.grail_pass_subscriptions (status);
