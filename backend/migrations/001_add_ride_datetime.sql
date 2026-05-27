alter table public.rides
  add column if not exists ride_date date,
  add column if not exists ride_time time;
