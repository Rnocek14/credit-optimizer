UPDATE public.transfer_batch_runs
SET status = 'failed',
    finished_at = now(),
    summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object('forced_failure', 'stuck > 2h, manually cleared to unblock ASUO sweep')
WHERE id = '25a15525-4de7-46fc-acb0-ce9d86734d03'
  AND status = 'running';

UPDATE public.policy_refresh_tasks
SET status = 'failed',
    completed_at = now(),
    reason = COALESCE(reason, '') || ' [forced-failed: parent run cleared]'
WHERE run_id = '25a15525-4de7-46fc-acb0-ce9d86734d03'
  AND status IN ('queued', 'running');