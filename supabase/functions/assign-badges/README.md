# assign-badges (dry-run)

Simulates badge assignment and returns a list of would-be awards.

- Method: POST
- Request: { user_id?: uuid }
- Response: { mode: 'dry-run', would_award: { badge, reason }[] }
