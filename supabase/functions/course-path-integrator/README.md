# course-path-integrator (dry-run)

Accepts a mentor action and returns a diff describing proposed path updates.

- Method: POST
- Request: { plan_id?: uuid, course_id?: string, action?: 'approve'|'reject' }
- Response: { mode: 'dry-run', diff: { added_steps: { title, skills }[], notes } }
