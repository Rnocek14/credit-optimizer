# verify-certificate (dry-run)

Validates a certificate code and returns a stub certificate.

- Method: GET or POST
- Query/Body: code
- Response: { mode: 'dry-run', valid: boolean, certificate?: { user, workflow_id, issued_at } }
