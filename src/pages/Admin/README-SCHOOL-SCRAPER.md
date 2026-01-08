# School Policy Scraper

Automated tool for extracting and validating institution transfer policies using AI.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Admin UI       │───▶│  Edge Function   │───▶│  OpenAI GPT-4   │
│  (Dashboard)    │    │  (school-scraper)│    │  (Extraction)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                      │                       │
        ▼                      ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Review Queue   │◀───│  Supabase DB     │◀───│  Structured     │
│  (Human QA)     │    │  (Jobs/Fields)   │    │  JSON Output    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `school_scrape_jobs` | Tracks scrape requests and overall status |
| `policy_field_extractions` | Individual extracted fields with confidence scores |
| `scrape_url_templates` | Pre-configured URLs per institution |

## Usage

### 1. Start a Scrape

```typescript
import { useStartScrape } from '@/hooks/useSchoolScraper';

const { mutate: startScrape } = useStartScrape();

startScrape({
  institutionCode: 'TESU',
  urls: ['https://tesu.smartcatalogiq.com/...']
});
```

### 2. Review Extracted Fields

Navigate to `/admin/school-scraper` and:
- View pending jobs in the review queue
- Approve/reject individual field extractions
- Modify values with reviewer notes
- Complete jobs when all fields are reviewed

### 3. Add URL Templates

Pre-configure URLs for institutions so scrapes can be triggered with one click.

## Confidence Routing

| Score | Color | Action |
|-------|-------|--------|
| 90-100 | Green | Auto-approve candidate |
| 70-89 | Yellow | Manual review required |
| 0-69 | Red | Likely needs correction |

## Extracted Policy Fields

The scraper extracts these fields per institution:

- `total_credits_required` - Degree credit total
- `residency_credits` - Minimum in-house credits
- `max_transfer_credits` - Transfer credit cap
- `max_exam_credits` - CLEP/DSST limits
- `max_ace_nccrs_credits` - ACE/NCCRS provider limits
- `upper_division_required` - 300/400 level minimums
- `minimum_grade` - Transfer grade requirements
- `required_courses` - Non-transferable courses (e.g., capstone)
- `gen_ed_requirements` - Category-specific requirements

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | For GPT-4o extraction |

## Files

```
src/
├── pages/Admin/
│   └── SchoolScraperDashboard.tsx  # Main admin UI
├── components/school-scraper/
│   ├── PolicyReviewForm.tsx        # Field review interface
│   └── ConfidenceBadge.tsx         # Visual confidence indicator
├── hooks/
│   └── useSchoolScraper.ts         # React Query hooks
supabase/
└── functions/
    └── school-scraper/
        └── index.ts                # Edge function
```

## Adding a New Institution

1. Add URL templates via the dashboard
2. Configure page types (catalog, transfer_policy, residency, etc.)
3. Trigger scrape and review results
4. Approve fields to populate the policy database

## Troubleshooting

**Low confidence scores**: Source pages may have changed format. Check `source_quote` for context.

**Missing fields**: Some policies may not be published online. Mark as "rejected" with notes.

**Scrape failures**: Check edge function logs for HTTP errors or rate limiting.
