# generate-roadmap (dry-run)

Returns a typed, static roadmap for demo/testing. No DB writes.

- Method: POST
- Request: { goal?: string, user_skills?: string[] }
- Response: { mode: 'dry-run', steps, reasoning, est_time, est_cost, fastest_path, lowest_cost_path, highest_roi_path }
