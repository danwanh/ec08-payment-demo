create table if not exists orders (
  id bigserial primary key,
  amount integer not null,
  payment_status text not null check (payment_status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id bigserial primary key,
  order_id bigint not null references orders(id),
  provider text not null,
  transaction_id text not null unique,
  amount integer not null,
  status text not null check (status in ('pending', 'paid', 'failed')),
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
