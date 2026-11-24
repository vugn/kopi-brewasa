-- "Bulan ini" Hall of Fame mengikuti hari kerja Brewasa: WITA, bulan baru mulai tanggal 1 jam 07:00.
create or replace function public.top_spenders(p_period text default 'THIS_MONTH')
returns table (name text, total_spent numeric, visit_count bigint, last_visit timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
    select (array_agg(btrim(t.customer_name) order by t.created_at desc))[1],
           sum(t.total_amount),
           count(*),
           max(t.created_at)
      from public.transactions t
     where t.status in ('COMPLETED', 'PENDING')
       and btrim(coalesce(t.customer_name, '')) <> ''
       and lower(btrim(t.customer_name)) not in ('guest', 'tanpa nama')
       and (p_period = 'ALL'
            or t.created_at >= (date_trunc('month', (now() at time zone 'Asia/Makassar') - interval '7 hours') + interval '7 hours') at time zone 'Asia/Makassar')
     group by lower(btrim(t.customer_name))
    having sum(t.total_amount) > 0
     order by 2 desc
     limit 5;
$$;
