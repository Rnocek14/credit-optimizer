# pdf-export (dry-run)

Returns a stub URL and 0 bytes to simulate PDF export.

- Method: POST
- Request: { resume_id?: uuid }
- Response: { mode: 'dry-run', url: 'stub://resume.pdf', bytes: 0 }
