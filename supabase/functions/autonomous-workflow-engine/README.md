# autonomous-workflow-engine (dry-run)

Runs a demo workflow and returns deterministic steps with progress only.

- Method: POST
- Request: { workflow_template?: string, user_id?: uuid }
- Response: { mode: 'dry-run', steps: { id, type, result }[], progress: number }
