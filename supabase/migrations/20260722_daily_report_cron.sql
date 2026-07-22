-- Daily WhatsApp status report — scheduling + grants.
--
-- Fires the `daily-report` edge function once a day via pg_cron + pg_net. The function
-- computes the three dashboard cards and sends them to WhatsApp through Fonnte.
--
-- ⚠️ Run this in the Supabase SQL editor AFTER the daily-report edge function is deployed
--    and its secrets (FONNTE_TOKEN, REPORT_RECIPIENT, CRON_SECRET) are set.
--
-- The CRON_SECRET below MUST match the edge function secret of the same name. Replace the
-- placeholder before running. (cron.job is only readable by the project owner, so keeping the
-- secret in the job command is acceptable here.)

-- 1. Extensions (usually already enabled on Supabase; safe to re-run)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Let the service-role client (used by the edge function) call the two RPCs.
--    get_roster_stats is otherwise granted to `authenticated` only; get_fund_totals to anon/authenticated.
grant execute on function public.get_roster_stats() to service_role;
grant execute on function public.get_fund_totals()  to service_role;

-- 3. Schedule: every day at 11:00 UTC = 18:00 WIB (Asia/Jakarta).
--    pg_cron runs in UTC. Adjust the first two cron fields to change the send time.
--    (To reschedule later: select cron.unschedule('daily-whatsapp-report'); then re-run this.)
select cron.schedule(
  'daily-whatsapp-report',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := 'https://mksmeuswpqkafenikrdg.supabase.co/functions/v1/daily-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      -- Public anon key: satisfies the gateway JWT check whether or not verify_jwt is on.
      -- The real access gate is x-cron-secret (checked inside the function).
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rc21ldXN3cHFrYWZlbmlrcmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Njc3MzIsImV4cCI6MjA5NDE0MzczMn0.WHosFlgR3pPLAyoUBjUlptwXlAUro1jAVbJimRwFhAQ',
      'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'  -- must match the CRON_SECRET edge-function secret
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Useful ops queries:
--   select * from cron.job;                                    -- list schedules
--   select * from cron.job_run_details order by start_time desc limit 10;  -- recent runs
--   select cron.unschedule('daily-whatsapp-report');           -- remove the schedule
