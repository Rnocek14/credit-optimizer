-- Insert 3 multi-school templates from fixtures into degree_templates
-- Using ON CONFLICT to avoid duplicates if re-run

INSERT INTO public.degree_templates (
  id, institution_id, institution_code, program_code, program_name,
  track_type, total_credits, estimated_cost, estimated_duration_months,
  catalog_year, template_data, status, notes
) VALUES
-- 1) WGU BS-IT Multi-School
(
  'it-bachelor-wgu-multischool-2025',
  '8b90b109-3ad6-448e-bf9c-0e6bec654e43',
  'WGU',
  'BS-IT',
  'BS Information Technology',
  'multi-school',
  120,
  7850,
  18,
  '2025',
  '{
    "summary": "Complete your IT degree by transferring Sophia/Study.com credits to WGU. Save thousands compared to full WGU pricing.",
    "catalogYear": "2025",
    "policyVersion": "WGU-2025-v1",
    "generatedAt": "2025-01-11T00:00:00Z",
    "lastVerified": "2025-01-11T00:00:00Z",
    "lifestyle": {"avgWeeklyHours": 12, "paceType": "flexible", "workCompatible": true},
    "primaryCareerIds": ["it-manager", "systems-admin", "network-engineer"],
    "singleSchoolBaseline": {
      "costUsd": 15980,
      "weeks": 104,
      "source": "WGU direct enrollment (4 terms x $3,995)",
      "notes": "All 120 credits at WGU flat-rate terms",
      "yearBreakdown": [
        {"year": 1, "label": "Year 1 – Foundation", "credits": 30, "costUsd": 3995, "weeks": 26, "courseLabel": "WGU IT Year 1 Bundle"},
        {"year": 2, "label": "Year 2 – IT Core", "credits": 30, "costUsd": 3995, "weeks": 26, "courseLabel": "WGU IT Year 2 Bundle"},
        {"year": 3, "label": "Year 3 – Advanced IT", "credits": 30, "costUsd": 3995, "weeks": 26, "courseLabel": "WGU IT Year 3 Bundle"},
        {"year": 4, "label": "Year 4 – Capstone", "credits": 30, "costUsd": 3995, "weeks": 26, "courseLabel": "WGU IT Capstone + Certs"}
      ]
    }
  }'::jsonb,
  'active',
  'Multi-school strategy: Sophia + Study.com → WGU graduation'
),
-- 2) TESU BS-CS Multi-School
(
  'cs-bachelor-tesu-multischool-2025',
  '187b6b68-36e2-40d3-8e4e-fca05dd5144d',
  'TESU',
  'BS-CS',
  'BS Computer Science',
  'multi-school',
  120,
  8650,
  20,
  '2025',
  '{
    "summary": "Complete your CS degree by transferring Sophia/Study.com credits to TESU. Save thousands compared to traditional university pricing.",
    "catalogYear": "2025",
    "policyVersion": "TESU-2025-v1",
    "generatedAt": "2025-01-11T00:00:00Z",
    "lastVerified": "2025-01-11T00:00:00Z",
    "lifestyle": {"avgWeeklyHours": 10, "paceType": "flexible", "workCompatible": true},
    "primaryCareerIds": ["software-engineer", "web-developer", "full-stack-developer"],
    "singleSchoolBaseline": {
      "costUsd": 38400,
      "weeks": 192,
      "source": "Traditional 4-year university (avg. $9,600/year tuition)",
      "notes": "Compared to average public university in-state tuition",
      "yearBreakdown": [
        {"year": 1, "label": "Year 1 – Freshman Year", "credits": 30, "costUsd": 9600, "weeks": 48, "courseLabel": "Traditional University Year 1"},
        {"year": 2, "label": "Year 2 – Sophomore Year", "credits": 30, "costUsd": 9600, "weeks": 48, "courseLabel": "Traditional University Year 2"},
        {"year": 3, "label": "Year 3 – Junior Year", "credits": 30, "costUsd": 9600, "weeks": 48, "courseLabel": "Traditional University Year 3"},
        {"year": 4, "label": "Year 4 – Senior Year", "credits": 30, "costUsd": 9600, "weeks": 48, "courseLabel": "Traditional University Year 4"}
      ]
    }
  }'::jsonb,
  'active',
  'Multi-school strategy: Sophia + Study.com → TESU graduation'
),
-- 3) COSC BSBA Multi-School (cheapest variant)
(
  'bsba-cosc-multischool-2025',
  'c3b621c1-88af-4db4-bf9e-8b7692411cdd',
  'COSC',
  'BSBA',
  'BS Business Administration',
  'multi-school',
  120,
  5870,
  14,
  '2025',
  '{
    "summary": "Complete your Business Administration degree at Charter Oak State College with maximum savings. 114 transfer credits + 6 COSC residency.",
    "catalogYear": "2025",
    "policyVersion": "COSC-2025-v1",
    "generatedAt": "2026-01-12T00:00:00Z",
    "lastVerified": "2026-01-12T00:00:00Z",
    "lifestyle": {"avgWeeklyHours": 10, "paceType": "flexible", "workCompatible": true},
    "primaryCareerIds": ["business-analyst", "project-manager", "marketing-manager"],
    "singleSchoolBaseline": {
      "costUsd": 21000,
      "weeks": 192,
      "source": "COSC Direct (120cr x $175/credit in-state tuition)",
      "notes": "Charter Oak State College in-state per-credit rate without transfer credits",
      "yearBreakdown": [
        {"year": 1, "label": "Year 1", "credits": 30, "costUsd": 5250, "weeks": 48, "courseLabel": "COSC Direct Year 1"},
        {"year": 2, "label": "Year 2", "credits": 30, "costUsd": 5250, "weeks": 48, "courseLabel": "COSC Direct Year 2"},
        {"year": 3, "label": "Year 3", "credits": 30, "costUsd": 5250, "weeks": 48, "courseLabel": "COSC Direct Year 3"},
        {"year": 4, "label": "Year 4", "credits": 30, "costUsd": 5250, "weeks": 48, "courseLabel": "COSC Direct Year 4"}
      ]
    }
  }'::jsonb,
  'active',
  'Multi-school strategy: Sophia + Study.com → COSC graduation'
)
ON CONFLICT (id) DO UPDATE SET
  track_type = EXCLUDED.track_type,
  estimated_cost = EXCLUDED.estimated_cost,
  template_data = EXCLUDED.template_data,
  status = EXCLUDED.status,
  updated_at = now();