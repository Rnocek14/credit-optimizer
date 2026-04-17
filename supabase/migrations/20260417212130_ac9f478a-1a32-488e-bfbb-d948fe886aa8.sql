UPDATE public.transfer_batch_runs
SET status = 'failed',
    finished_at = now(),
    summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object('forced_failure', 'stuck > 25min, clearing to validate maxTransfer regex fallback')
WHERE id IN ('e04145ae-957c-418d-9e3b-08ddbf911b9e', '9e6cdfa7-6427-401c-9f5f-95eec0a22c51')
  AND status = 'running';

UPDATE public.policy_refresh_tasks
SET status = 'failed',
    completed_at = now(),
    reason = COALESCE(reason, '') || ' [forced-failed: clearing stuck runs before maxTransfer validation]'
WHERE run_id IN ('e04145ae-957c-418d-9e3b-08ddbf911b9e', '9e6cdfa7-6427-401c-9f5f-95eec0a22c51')
  AND status IN ('queued', 'running');