-- Add varied sample career risk data (fixed ROUND function usage)
UPDATE career_tracks 
SET 
  risk_score = CASE 
    WHEN id = 'e728ea1b-aeac-431a-b223-4315a7044fa5' THEN 35.2  -- Product Designer - Medium-Low risk
    WHEN id = '3b013c05-dca3-44bd-a34d-6ae334a6b56c' THEN 62.8  -- Senior Graphic Designer - Medium-High risk
    WHEN id = 'a613819f-a6ee-471b-bc31-4498bbcd5f09' THEN 28.5  -- UX Designer - Low risk
    WHEN id = 'ddcc63a7-f933-459d-88c0-53a2df005ef4' THEN 45.3  -- UX Design Lead - Medium risk
    WHEN id = '34598f2d-2b73-491b-9846-ce262c1fa14a' THEN 31.7  -- Product Designer - Low-Medium risk
    WHEN id = '1ca26ad3-f44c-491b-ac13-e0dca87d1acd' THEN 58.9  -- Brand Strategist - Medium-High risk
    WHEN id = '6329df6b-fe2e-4ce3-87ba-18f7487f643d' THEN 72.4  -- Freelance Graphic Designer - High risk
    WHEN id = 'd4a6012f-1b1b-4f5f-8295-db0ba4fb4932' THEN 41.6  -- Creative Director - Medium risk
    WHEN id = '2a45efb9-5f7f-402c-b89d-4957aac0bb34' THEN 29.8  -- UX Designer - Low risk
    WHEN id = '12e60088-a70e-498c-af00-3c230c7d722b' THEN 38.4  -- UI Designer - Medium-Low risk
    ELSE (RANDOM() * 80 + 10)::numeric(5,1)  -- Random between 10-90 for any other tracks
  END,
  roi_score = CASE 
    WHEN id = 'e728ea1b-aeac-431a-b223-4315a7044fa5' THEN 78.5
    WHEN id = '3b013c05-dca3-44bd-a34d-6ae334a6b56c' THEN 52.3
    WHEN id = 'a613819f-a6ee-471b-bc31-4498bbcd5f09' THEN 85.7
    WHEN id = 'ddcc63a7-f933-459d-88c0-53a2df005ef4' THEN 91.2
    WHEN id = '34598f2d-2b73-491b-9846-ce262c1fa14a' THEN 82.1
    WHEN id = '1ca26ad3-f44c-491b-ac13-e0dca87d1acd' THEN 64.8
    WHEN id = '6329df6b-fe2e-4ce3-87ba-18f7487f643d' THEN 43.2
    WHEN id = 'd4a6012f-1b1b-4f5f-8295-db0ba4fb4932' THEN 88.9
    WHEN id = '2a45efb9-5f7f-402c-b89d-4957aac0bb34' THEN 79.6
    WHEN id = '12e60088-a70e-498c-af00-3c230c7d722b' THEN 72.4
    ELSE (RANDOM() * 60 + 30)::numeric(5,1)  -- Random between 30-90 for any other tracks
  END,
  switch_readiness_score = CASE 
    WHEN id = 'e728ea1b-aeac-431a-b223-4315a7044fa5' THEN 73
    WHEN id = '3b013c05-dca3-44bd-a34d-6ae334a6b56c' THEN 68
    WHEN id = 'a613819f-a6ee-471b-bc31-4498bbcd5f09' THEN 82
    WHEN id = 'ddcc63a7-f933-459d-88c0-53a2df005ef4' THEN 89
    WHEN id = '34598f2d-2b73-491b-9846-ce262c1fa14a' THEN 76
    WHEN id = '1ca26ad3-f44c-491b-ac13-e0dca87d1acd' THEN 55
    WHEN id = '6329df6b-fe2e-4ce3-87ba-18f7487f643d' THEN 48
    WHEN id = 'd4a6012f-1b1b-4f5f-8295-db0ba4fb4932' THEN 94
    WHEN id = '2a45efb9-5f7f-402c-b89d-4957aac0bb34' THEN 79
    WHEN id = '12e60088-a70e-498c-af00-3c230c7d722b' THEN 71
    ELSE (RANDOM() * 50 + 40)::integer  -- Random between 40-90 for any other tracks
  END
WHERE id IN (
  'e728ea1b-aeac-431a-b223-4315a7044fa5',
  '3b013c05-dca3-44bd-a34d-6ae334a6b56c', 
  'a613819f-a6ee-471b-bc31-4498bbcd5f09',
  'ddcc63a7-f933-459d-88c0-53a2df005ef4',
  '34598f2d-2b73-491b-9846-ce262c1fa14a',
  '1ca26ad3-f44c-491b-ac13-e0dca87d1acd',
  '6329df6b-fe2e-4ce3-87ba-18f7487f643d',
  'd4a6012f-1b1b-4f5f-8295-db0ba4fb4932',
  '2a45efb9-5f7f-402c-b89d-4957aac0bb34',
  '12e60088-a70e-498c-af00-3c230c7d722b'
);