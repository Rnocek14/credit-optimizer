UPDATE public.transfer_batch_runs
SET status = 'failed',
    finished_at = now(),
    summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object('forced_failure', 'wrong payload key (institution_codes vs institutions); restarting focused ASUO run')
WHERE id = '3c4254e0-19ef-436d-8555-0682415815a0'
  AND status = 'running';

UPDATE public.policy_refresh_tasks
SET status = 'failed',
    completed_at = now(),
    reason = COALESCE(reason, '') || ' [forced-failed: parent run cancelled to restart focused ASUO sweep]'
WHERE run_id = '3c4254e0-19ef-436d-8555-0682415815a0'
  AND status IN ('queued', 'running');